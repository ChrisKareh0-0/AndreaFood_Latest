// Simple static server for Railway using Express
const express = require('express');
const path = require('path');
const pool = require('./db.cjs');
const bodyParser = require('body-parser');
const app = express();

const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));
app.use(bodyParser.json({ limit: '10mb' }));

// --- In-memory fallback when DB is unreachable ---
let useLocalFallback = false;
const localStore = {};

async function dbQuery(text, params) {
  if (useLocalFallback) throw new Error('Using local fallback (DB unreachable)');
  return pool.query(text, params);
}

// Test DB connection on startup; fall back to in-memory if unreachable
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

// For React Router: serve index.html for all non-file routes

// --- API endpoints for admin data ---
// Save admin data
app.post('/api/admin-data', async (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'Missing key or value' });
  try {
    if (useLocalFallback) {
      localStore[key] = JSON.stringify(value);
      return res.json({ success: true, source: 'local-fallback' });
    }
    await pool.query(
      'INSERT INTO admin_data(key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, JSON.stringify(value)]
    );
    res.json({ success: true, source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const diagnostics = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
    usingFallback: useLocalFallback,
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

// List all admin data keys
app.get('/api/admin-data', async (req, res) => {
  try {
    if (useLocalFallback) {
      const data = {};
      Object.entries(localStore).forEach(([k, v]) => {
        try { data[k] = JSON.parse(v); } catch { data[k] = v; }
      });
      return res.json({ source: 'local-fallback', data });
    }
    const result = await pool.query('SELECT key, value FROM admin_data');
    const data = {};
    result.rows.forEach(row => {
      try { data[row.key] = JSON.parse(row.value); } catch { data[row.key] = row.value; }
    });
    res.json({ source: 'database', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load admin data by key
app.get('/api/admin-data/:key', async (req, res) => {
  const { key } = req.params;
  try {
    if (useLocalFallback) {
      if (!localStore[key]) return res.status(404).json({ error: 'Not found', source: 'local-fallback' });
      return res.json({ value: JSON.parse(localStore[key]), source: 'local-fallback' });
    }
    const result = await pool.query('SELECT value FROM admin_data WHERE key = $1', [key]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ value: JSON.parse(result.rows[0].value), source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Clients API endpoints ---
// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    if (useLocalFallback) {
      const raw = localStore['clients'];
      return res.json({ clients: raw ? JSON.parse(raw) : [], source: 'local-fallback' });
    }
    const result = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
    if (result.rows.length === 0) return res.json({ clients: [], source: 'database' });
    res.json({ clients: JSON.parse(result.rows[0].value), source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save all clients (replace entire list)
app.post('/api/clients', async (req, res) => {
  const { clients } = req.body;
  if (!Array.isArray(clients)) return res.status(400).json({ error: 'clients must be an array' });
  try {
    const value = JSON.stringify(clients);
    if (useLocalFallback) {
      localStore['clients'] = value;
      return res.json({ success: true, count: clients.length, source: 'local-fallback' });
    }
    await pool.query(
      "INSERT INTO admin_data(key, value) VALUES('clients', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [value]
    );
    res.json({ success: true, count: clients.length, source: 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a single client
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
    res.json({ success: true, client: newClient, totalClients: clients.length, source: useLocalFallback ? 'local-fallback' : 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a client by id
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
    res.json({ success: true, deleted: before - clients.length, remaining: clients.length, source: useLocalFallback ? 'local-fallback' : 'database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback for React Router
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
