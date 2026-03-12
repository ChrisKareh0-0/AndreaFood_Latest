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
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    useLocalFallback = true;
    console.log('⚠️  Database unreachable — using in-memory fallback for local testing');
    console.log('   (Data will not persist across restarts)');
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
  if (useLocalFallback) {
    return res.json({
      status: 'ok',
      database: 'unreachable (using local fallback)',
      storedKeys: Object.keys(localStore),
      timestamp: new Date().toISOString()
    });
  }
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.json({ status: 'error', database: 'unreachable', error: err.message, timestamp: new Date().toISOString() });
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

// Fallback for React Router
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
