const fs = require('fs');
const path = require('path');

function loadDatabaseUrl() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      return line.trim().substring('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
    }
  }
  throw new Error('DATABASE_URL not found');
}

async function checkTables() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: loadDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 5000
  });

  try {
    // Get all tables in one query
    const tablesResult = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as col_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ALL PUBLIC TABLES IN SUPABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const importantTables = [
      'companies', 'user_profiles', 'form_templates', 'form_sections', 'form_fields',
      'form_workflows', 'form_submissions', 'pdf_form_uploads', 'pdf_detected_fields',
      'pdf_conversion_sessions', 'pdf_form_references', 'hazards', 'jobsites', 'documents'
    ];
    
    for (const table of tablesResult.rows) {
      const isImportant = importantTables.includes(table.table_name);
      const marker = isImportant ? '✅' : '  ';
      console.log(`${marker} ${table.table_name} (${table.col_count} cols)`);
    }

    // Check storage buckets
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗄️ STORAGE BUCKETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const buckets = await pool.query(`SELECT id, name, public FROM storage.buckets ORDER BY name`);
    buckets.rows.forEach(b => console.log(`✅ ${b.name} (public: ${b.public})`));

    console.log('\n✅ Database verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
