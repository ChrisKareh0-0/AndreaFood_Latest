// Database connection setup for Railway PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:czYEgYhOAPqxVfDAIzxdWkgXGFnIDIde@postgres-production-5cf8.up.railway.app:5432/railway?sslmode=require',
});

module.exports = pool;
