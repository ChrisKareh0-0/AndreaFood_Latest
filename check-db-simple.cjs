// Check Railway database - lightweight version
require('dotenv').config();
const pool = require('./db.cjs');

async function checkDatabase() {
  console.log('🔍 Checking Railway Database...\n');

  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected!\n');

    // Get all keys with sizes
    const result = await pool.query(`
      SELECT key, 
             LENGTH(value) as value_length,
             LEFT(value, 50) as value_preview 
      FROM admin_data 
      ORDER BY key
    `);
    
    console.log(`📋 Found ${result.rows.length} keys in admin_data:\n`);
    result.rows.forEach((row, i) => {
      const sizeKB = Math.round(row.value_length / 1024);
      console.log(`   ${i + 1}. ${row.key}`);
      console.log(`      Size: ${sizeKB} KB (${row.value_length} chars)`);
      console.log(`      Preview: ${row.value_preview}...`);
      console.log('');
    });

    // Check clients specifically
    const clientsResult = await pool.query(`
      SELECT jsonb_array_length(value::jsonb) as client_count
      FROM admin_data 
      WHERE key = 'clients'
    `);
    
    if (clientsResult.rows.length > 0 && clientsResult.rows[0].client_count) {
      console.log(`📊 Total clients: ${clientsResult.rows[0].client_count}`);
    }

    // Check personalData
    const personalResult = await pool.query(`
      SELECT jsonb_object_keys(value::jsonb) as fields
      FROM admin_data 
      WHERE key = 'personalData'
    `);
    
    if (personalResult.rows.length > 0) {
      console.log(`📋 personalData fields: ${personalResult.rows.map(r => r.fields).join(', ')}`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkDatabase();
