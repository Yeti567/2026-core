const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase connection
const supabase = createClient(
  'https://rgyxbkazlertsjrruzpl.supabase.co',
  'sb_secret_qWxfbOAkN2f9KNaZGeAclA_hcRbE2hp'
);

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

async function importTable(tableName) {
  try {
    // Read exported data
    const data = JSON.parse(fs.readFileSync(`exports/${tableName}.json`, 'utf8'));
    
    if (data.length === 0) {
      console.log(`⚠️ No data to import for ${tableName}`);
      return;
    }
    
    // Import data in batches
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error importing batch to ${tableName}:`, error.message);
        // Try individual records
        for (const record of batch) {
          const { error: individualError } = await supabase
            .from(tableName)
            .insert([record]);
          
          if (individualError) {
            console.error(`❌ Error importing record to ${tableName}:`, individualError.message);
          }
        }
      } else {
        console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1} (${batch.length} records) to ${tableName}`);
      }
    }
    
    console.log(`✅ Completed importing ${tableName}`);
    
  } catch (error) {
    console.error(`❌ Error importing ${tableName}:`, error.message);
  }
}

async function importAllData() {
  try {
    console.log('✅ Connected to Supabase');
    
    for (const table of tables) {
      await importTable(table);
    }
    
    console.log('✅ Import completed!');
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  }
}

importAllData();
