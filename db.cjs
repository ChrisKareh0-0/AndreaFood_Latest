// Database connection setup for Railway PostgreSQL
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:czYEgYhOAPqxVfDAIzxdWkgXGFnIDIde@ballast.proxy.rlwy.net:46364/railway';

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
