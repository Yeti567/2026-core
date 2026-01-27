const { Client } = require('pg');
const fs = require('fs');

// Neon connection
const neonClient = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9EUByek4GWxb@ep-blue-shape-aho04k4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

// Tables to export (in dependency order)
const tables = [
  'companies',
  'company_locations', 
  'departments',
  'users',
  'user_profiles',
  'workers',
  'certification_types',
  'certifications',
  'documents',
  'document_folders',
  // Add more tables as needed
];

async function exportTable(tableName) {
  try {
    const result = await neonClient.query(`SELECT * FROM ${tableName}`);
    const data = result.rows;
    
    // Save to JSON file
    fs.writeFileSync(`exports/${tableName}.json`, JSON.stringify(data, null, 2));
    console.log(`✅ Exported ${data.length} rows from ${tableName}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return [];
  }
}

async function exportAllData() {
  // Create exports directory
  if (!fs.existsSync('exports')) {
    fs.mkdirSync('exports');
  }
  
  try {
    await neonClient.connect();
    console.log('✅ Connected to Neon database');
    
    for (const table of tables) {
      await exportTable(table);
    }
    
    console.log('✅ Export completed!');
  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    await neonClient.end();
  }
}

exportAllData();
