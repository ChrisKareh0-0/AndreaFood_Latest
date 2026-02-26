// Simple static server for Railway using Express
const express = require('express');
const path = require('path');
const app = express();

const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// For React Router: serve index.html for all non-file routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
