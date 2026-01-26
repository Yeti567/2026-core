const fs = require('fs');
const path = require('path');

async function checkSchema() {
  const { Pool } = require('pg');
  
  // Load DATABASE_URL
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  let dbUrl = '';
  
  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.substring('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
      break;
    }
  }
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking table schemas...\n');
    
    const tables = ['equipment_inventory', 'workers', 'documents'];
    
    for (const table of tables) {
      console.log(`\n📋 Table: ${table}`);
      try {
        const result = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = '${table}'
          ORDER BY ordinal_position
        `);
        
        result.rows.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Schema check error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
