// Database connection setup for Railway PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:czYEgYhOAPqxVfDAIzxdWkgXGFnIDIde@postgres-production-5cf8.up.railway.app:5432/railway',
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
  statement_timeout: 5000,
});

module.exports = pool;
