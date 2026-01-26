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
  
  throw new Error('DATABASE_URL not found');
}

async function runMigration() {
  const { Pool } = require('pg');
  const databaseUrl = loadDatabaseUrl();
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const migrationSQL = fs.readFileSync('fix-companies-schema.sql', 'utf-8');
    
    console.log('Running migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
