// Database connection setup for Railway PostgreSQL
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:czYEgYhOAPqxVfDAIzxdWkgXGFnIDIde@postgres-production-5cf8.up.railway.app:5432/railway';

// Railway internal network doesn't need SSL; public connections do
const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: isRailway
    ? (connectionString.includes('localhost') ? false : { rejectUnauthorized: false })
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  query_timeout: 10000,
  statement_timeout: 10000,
});

module.exports = pool;
