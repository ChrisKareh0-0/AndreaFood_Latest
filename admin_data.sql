-- SQL to create admin_data table for persistent admin panel storage
CREATE TABLE IF NOT EXISTS admin_data (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
