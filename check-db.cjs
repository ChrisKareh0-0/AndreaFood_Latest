// Check Railway database connection and list all admin_data keys
require('dotenv').config();
const pool = require('./db.cjs');

async function checkDatabase() {
  console.log('🔍 Checking Railway Database Connection...\n');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('Using hardcoded URL:', !process.env.DATABASE_URL);
  console.log('');

  try {
    // Test connection
    console.log('⏳ Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully!\n');

    // Get all keys
    console.log('📋 Fetching all admin_data keys...\n');
    const result = await pool.query('SELECT key, LENGTH(value) as value_length FROM admin_data ORDER BY key');
    
    if (result.rows.length === 0) {
      console.log('⚠️  admin_data table is EMPTY!\n');
    } else {
      console.log(`✅ Found ${result.rows.length} keys in admin_data:\n`);
      result.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.key} (${row.value_length} chars)`);
      });
      console.log('');
    }

    // Check for expected keys
    const expectedKeys = ['clients', 'personalData', 'bioContent', 'siteText', 'latestWorkPosts'];
    const existingKeys = result.rows.map(r => r.key);
    const missingKeys = expectedKeys.filter(k => !existingKeys.includes(k));

    if (missingKeys.length > 0) {
      console.log('❌ MISSING KEYS:', missingKeys.join(', '));
      console.log('\nThese keys need to be added to the database.\n');
    } else {
      console.log('✅ All expected keys are present!\n');
    }

    // Show clients count if exists
    if (existingKeys.includes('clients')) {
      const clientsResult = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
      if (clientsResult.rows.length > 0) {
        const clients = JSON.parse(clientsResult.rows[0].value);
        console.log(`📊 Clients count: ${clients.length}`);
      }
    }

  } catch (err) {
    console.error('❌ Database connection FAILED!\n');
    console.error('Error:', err.message);
    console.error('\nPossible issues:');
    console.error('   1. Railway database is down');
    console.error('   2. DATABASE_URL is incorrect');
    console.error('   3. Network/firewall blocking connection');
    console.error('   4. SSL connection issue (try setting rejectUnauthorized: false)');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkDatabase();
