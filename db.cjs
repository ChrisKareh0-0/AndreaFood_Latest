require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
let pool = null;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database features are disabled.');
} else {
  const shouldUseSsl = !/(localhost|127\.0\.0\.1)/i.test(connectionString)
    && process.env.PGSSLMODE !== 'disable';

  pool = new Pool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT || 0),
    query_timeout: Number(process.env.PG_QUERY_TIMEOUT || 0),
    keepAlive: true,
    maxUses: 7500,
    application_name: process.env.PG_APP_NAME || 'andrea-portfolio',
  });

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
  });
}

module.exports = pool;
