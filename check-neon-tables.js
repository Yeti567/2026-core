const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_9EUByek4GWxb@ep-blue-shape-aho04k4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function getTablesWithData() {
  try {
    await client.connect();
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name
    `);
    
    console.log('📋 Checking tables with data...');
    
    const tablesWithData = [];
    
    for (const row of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
        const count = parseInt(countResult.rows[0].count);
        
        if (count > 0) {
          console.log(`  ✅ ${row.table_name}: ${count} rows`);
          tablesWithData.push(row.table_name);
        } else {
          console.log(`  ⚪ ${row.table_name}: 0 rows`);
        }
      } catch (err) {
        console.log(`  ❌ ${row.table_name}: Error - ${err.message}`);
      }
    }
    
    console.log(`\n📊 Found ${tablesWithData.length} tables with data`);
    console.log('Tables to export:', tablesWithData.join(', '));
    
    return tablesWithData;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  } finally {
    await client.end();
  }
}

getTablesWithData();
