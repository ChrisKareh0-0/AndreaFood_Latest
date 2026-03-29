// Optimized server with caching and compression for Railway
require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db.cjs');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const zlib = require('zlib');
const app = express();

const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

// Ensure public directories exist
const clientsPath = path.join(publicPath, 'clients');
if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
if (!fs.existsSync(clientsPath)) fs.mkdirSync(clientsPath, { recursive: true });

// Load local store if exists
const localStorePath = path.join(__dirname, '.local-store.json');
let useLocalFallback = false;
const localStore = {};

if (fs.existsSync(localStorePath)) {
  try {
    const data = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
    Object.assign(localStore, data);
    console.log('✅ Loaded local store from:', localStorePath);
    useLocalFallback = true;
  } catch (err) {
    console.log('⚠️  Could not load local store:', err.message);
  }
}

app.use(express.static(distPath));
app.use('/public', express.static(publicPath));
app.use('/clients', express.static(clientsPath));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientFolder = req.body?.clientFolder || 'unknown';
    const uploadPath = path.join(clientsPath, clientFolder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});

app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

// ========== IN-MEMORY CACHE WITH TTL ==========
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL
  });
}

function invalidateCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// Database query wrapper with fallback
async function dbQuery(text, params) {
  if (useLocalFallback) throw new Error('Using local fallback (DB unreachable)');
  return pool.query(text, params);
}

// Test DB connection on startup
(async () => {
  try {
    console.log('🔌 Connecting to database...');
    console.log('   DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.log('   RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT || 'not set');
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (err) {
    useLocalFallback = true;
    console.log('⚠️  Database unreachable — using in-memory fallback');
    console.log('   Error:', err.message);
  }
})();

// Compression middleware for large responses
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    const gzip = zlib.createGzip({ level: 6 });
    const originalSend = res.send.bind(res);
    res.send = (chunk) => {
      if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
        const chunks = [];
        gzip.on('data', (d) => chunks.push(d));
        gzip.on('end', () => {
          const compressed = Buffer.concat(chunks);
          res.setHeader('Content-Length', compressed.length);
          originalSend(compressed);
        });
        gzip.write(chunk);
        gzip.end();
      } else {
        originalSend(chunk);
      }
    };
  }
  next();
});

// Cache headers helper
function setCacheHeaders(res, maxAge = 300) {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.setHeader('X-Cache-Status', 'MISS');
}

// --- API endpoints for admin data ---

// Health check
app.get('/api/health', async (req, res) => {
  const diagnostics = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
    usingFallback: useLocalFallback,
    cacheSize: cache.size,
  };
  if (useLocalFallback) {
    return res.json({
      status: 'ok',
      database: 'unreachable (using local fallback)',
      storedKeys: Object.keys(localStore),
      diagnostics,
      timestamp: new Date().toISOString()
    });
  }
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', diagnostics, timestamp: new Date().toISOString() });
  } catch (err) {
    res.json({ status: 'error', database: 'unreachable', error: err.message, diagnostics, timestamp: new Date().toISOString() });
  }
});

// Save admin data (invalidates cache)
app.post('/api/admin-data', async (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'Missing key or value' });
  try {
    if (useLocalFallback) {
      localStore[key] = JSON.stringify(value);
      invalidateCache(key);
      return res.json({ success: true, source: 'local-fallback' });
    }
    await pool.query(
      'INSERT INTO admin_data(key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, JSON.stringify(value)]
    );
    invalidateCache(key);
    res.json({ success: true, source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all admin data
app.get('/api/admin-data', async (req, res) => {
  try {
    const cached = getCache('all-admin-data');
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cached);
    }

    if (useLocalFallback) {
      const data = {};
      Object.entries(localStore).forEach(([k, v]) => {
        try { data[k] = JSON.parse(v); } catch { data[k] = v; }
      });
      const result = { source: 'local-fallback', data };
      setCache('all-admin-data', result);
      return res.json(result);
    }

    const result = await pool.query('SELECT key, value FROM admin_data');
    const data = {};
    result.rows.forEach(row => {
      try { data[row.key] = JSON.parse(row.value); } catch { data[row.key] = row.value; }
    });
    const response = { source: 'database', data };
    setCache('all-admin-data', response);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all admin data as raw rows
app.get('/api/admin-data/all', async (req, res) => {
  try {
    if (useLocalFallback) {
      const rows = Object.entries(localStore).map(([key, value]) => ({ key, value }));
      return res.json({ source: 'local-fallback', rows });
    }
    const result = await pool.query('SELECT key, value FROM admin_data ORDER BY key');
    res.json({ source: 'database', rows: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load admin data by key (with caching)
app.get('/api/admin-data/:key', async (req, res) => {
  const { key } = req.params;
  const cacheKey = `admin-data-${key}`;
  
  try {
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cached);
    }

    if (useLocalFallback) {
      if (!localStore[key]) return res.status(404).json({ error: 'Not found', source: 'local-fallback' });
      const result = { value: JSON.parse(localStore[key]), source: 'local-fallback' };
      setCache(cacheKey, result);
      return res.json(result);
    }

    const result = await pool.query('SELECT value FROM admin_data WHERE key = $1', [key]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const response = { value: JSON.parse(result.rows[0].value), source: 'database' };
    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Clients API endpoints (with caching) ---

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    const cached = getCache('clients');
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cached);
    }

    if (useLocalFallback) {
      const raw = localStore['clients'];
      const result = { clients: raw ? JSON.parse(raw) : [], source: 'local-fallback' };
      setCache('clients', result);
      return res.json(result);
    }

    const result = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
    if (result.rows.length === 0) {
      const response = { clients: [], source: 'database' };
      setCache('clients', response);
      return res.json(response);
    }
    const response = { clients: JSON.parse(result.rows[0].value), source: 'database' };
    setCache('clients', response);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save all clients (replace entire list) - invalidates cache
app.post('/api/clients', async (req, res) => {
  const { clients } = req.body;
  if (!Array.isArray(clients)) return res.status(400).json({ error: 'clients must be an array' });
  try {
    const value = JSON.stringify(clients);
    if (useLocalFallback) {
      localStore['clients'] = value;
      invalidateCache('clients');
      return res.json({ success: true, count: clients.length, source: 'local-fallback' });
    }
    await pool.query(
      "INSERT INTO admin_data(key, value) VALUES('clients', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [value]
    );
    invalidateCache('clients');
    res.json({ success: true, count: clients.length, source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a single client - invalidates cache
app.post('/api/clients/add', async (req, res) => {
  const client = req.body;
  if (!client.name) return res.status(400).json({ error: 'Client name is required' });
  try {
    let clients = [];
    if (useLocalFallback) {
      const raw = localStore['clients'];
      if (raw) clients = JSON.parse(raw);
    } else {
      const result = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
      if (result.rows.length > 0) clients = JSON.parse(result.rows[0].value);
    }
    const newClient = { id: Date.now(), ...client };
    clients.push(newClient);
    const value = JSON.stringify(clients);
    if (useLocalFallback) {
      localStore['clients'] = value;
    } else {
      await pool.query(
        "INSERT INTO admin_data(key, value) VALUES('clients', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [value]
      );
    }
    invalidateCache('clients');
    res.json({ success: true, client: newClient, totalClients: clients.length, source: useLocalFallback ? 'local-fallback' : 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a client by id - invalidates cache
app.put('/api/clients/:id', async (req, res) => {
  const clientId = parseInt(req.params.id);
  const updatedClient = req.body;
  try {
    let clients = [];
    if (useLocalFallback) {
      const raw = localStore['clients'];
      if (raw) clients = JSON.parse(raw);
    } else {
      const result = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
      if (result.rows.length > 0) clients = JSON.parse(result.rows[0].value);
    }
    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex === -1) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    clients[clientIndex] = { ...clients[clientIndex], ...updatedClient };
    const value = JSON.stringify(clients);
    if (useLocalFallback) {
      localStore['clients'] = value;
    } else {
      await pool.query(
        "INSERT INTO admin_data(key, value) VALUES('clients', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [value]
      );
    }
    invalidateCache('clients');
    res.json({ success: true, client: clients[clientIndex], source: useLocalFallback ? 'local-fallback' : 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a client by id - invalidates cache
app.delete('/api/clients/:id', async (req, res) => {
  const clientId = parseInt(req.params.id);
  try {
    let clients = [];
    if (useLocalFallback) {
      const raw = localStore['clients'];
      if (raw) clients = JSON.parse(raw);
    } else {
      const result = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
      if (result.rows.length > 0) clients = JSON.parse(result.rows[0].value);
    }
    const before = clients.length;
    clients = clients.filter(c => c.id !== clientId);
    const value = JSON.stringify(clients);
    if (useLocalFallback) {
      localStore['clients'] = value;
    } else {
      await pool.query(
        "INSERT INTO admin_data(key, value) VALUES('clients', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [value]
      );
    }
    invalidateCache('clients');
    res.json({ success: true, deleted: before - clients.length, remaining: clients.length, source: useLocalFallback ? 'local-fallback' : 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== MEDIA UPLOAD ENDPOINTS ==========
app.post('/api/media/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const clientFolder = req.body.clientFolder || 'unknown';
    const fileUrl = `/clients/${clientFolder}/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      path: req.file.path,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/media/upload-multiple', upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const clientFolder = req.body.clientFolder || 'unknown';
    const results = req.files.map(file => ({
      url: `/clients/${clientFolder}/${file.filename}`,
      filename: file.filename,
      size: file.size
    }));

    res.json({
      success: true,
      files: results,
      count: results.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback for React Router
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Cache TTL: ${CACHE_TTL / 1000} seconds`);
});
