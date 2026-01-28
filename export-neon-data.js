const { Client } = require('pg');
const fs = require('fs');

// Neon connection
const neonClient = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9EUByek4GWxb@ep-blue-shape-aho04k4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

// Tables to export (in dependency order) - only tables with actual data
const tables = [
  'companies',
  'departments', 
  'company_users',
  'user_passwords',
  'workers',
  'worker_certification_matrix',
  'certification_types',
  'document_types',
  'equipment_inventory',
  'equipment_availability',
  'equipment_maintenance_costs',
  'equipment_maintenance_summary',
  'form_templates',
  'hazard_library',
  'ppe_types',
  'training_record_types',
  'audit_questions',
  'registration_attempts',
  'company_compliance_summary'
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
