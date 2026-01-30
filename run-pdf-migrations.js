const fs = require('fs');
const path = require('path');

// Load DATABASE_URL from .env.local
function loadDatabaseUrl() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.substring('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
      }
      
      if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
        return trimmed.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  throw new Error('DATABASE_URL not found in .env.local');
}

async function runMigrations() {
  const { Pool } = require('pg');
  const databaseUrl = loadDatabaseUrl();
  
  console.log('Connecting to database...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const migrations = [
    'supabase/migrations/015_pdf_form_converter.sql',
    'supabase/migrations/016_documents_storage_bucket.sql'
  ];

  try {
    for (const migrationFile of migrations) {
      const filePath = path.join(process.cwd(), migrationFile);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️ Skipping ${migrationFile} - file not found`);
        continue;
      }
      
      console.log(`\n📄 Running ${migrationFile}...`);
      const migrationSQL = fs.readFileSync(filePath, 'utf-8');
      
      try {
        await pool.query(migrationSQL);
        console.log(`✅ ${migrationFile} completed successfully`);
      } catch (error) {
        // Check if error is just "already exists"
        if (error.message.includes('already exists') || error.code === '42P07') {
          console.log(`⏭️ ${migrationFile} - objects already exist, skipping`);
        } else {
          console.error(`❌ ${migrationFile} failed:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 All migrations processed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigrations().catch(console.error);
