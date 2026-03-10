// Simple static server for Railway using Express
const express = require('express');
const path = require('path');
const pool = require('./db');
const bodyParser = require('body-parser');
const app = express();

const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));
app.use(bodyParser.json());

// For React Router: serve index.html for all non-file routes

// --- API endpoints for admin data ---
// Save admin data
app.post('/api/admin-data', async (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'Missing key or value' });
  try {
    await pool.query(
      'INSERT INTO admin_data(key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load admin data
app.get('/api/admin-data/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await pool.query('SELECT value FROM admin_data WHERE key = $1', [key]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ value: JSON.parse(result.rows[0].value) });
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
