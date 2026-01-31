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
    }
  }
  throw new Error('DATABASE_URL not found');
}

async function verifySupabase() {
  const { Pool } = require('pg');
  const databaseUrl = loadDatabaseUrl();
  
  console.log('🔍 Connecting to Supabase database...\n');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Check PDF Converter Tables
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PDF CONVERTER TABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const pdfTables = [
      'pdf_form_uploads',
      'pdf_detected_fields', 
      'pdf_conversion_sessions',
      'pdf_form_references'
    ];
    
    for (const table of pdfTables) {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`\n✅ ${table} (${result.rows.length} columns)`);
        result.rows.slice(0, 5).forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        if (result.rows.length > 5) {
          console.log(`   ... and ${result.rows.length - 5} more columns`);
        }
      } else {
        console.log(`\n❌ ${table} - NOT FOUND`);
      }
    }

    // 2. Check Form Builder Tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FORM BUILDER TABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const formTables = [
      'form_templates',
      'form_sections',
      'form_fields',
      'form_workflows',
      'form_submissions'
    ];
    
    for (const table of formTables) {
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        console.log(`✅ ${table} (${count} columns)`);
      } else {
        console.log(`❌ ${table} - NOT FOUND`);
      }
    }

    // 3. Check Storage Buckets
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗄️ STORAGE BUCKETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const bucketsResult = await pool.query(`
      SELECT id, name, public, file_size_limit 
      FROM storage.buckets 
      ORDER BY name
    `);
    
    if (bucketsResult.rows.length > 0) {
      bucketsResult.rows.forEach(bucket => {
        const sizeLimit = bucket.file_size_limit ? `${Math.round(bucket.file_size_limit / 1024 / 1024)}MB` : 'unlimited';
        console.log(`✅ ${bucket.name} (public: ${bucket.public}, max: ${sizeLimit})`);
      });
    } else {
      console.log('❌ No storage buckets found');
    }

    // 4. Check Core Tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CORE TABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const coreTables = [
      'companies',
      'user_profiles',
      'jobsites',
      'hazards',
      'documents'
    ];
    
    for (const table of coreTables) {
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        // Get row count
        try {
          const rowResult = await pool.query(`SELECT COUNT(*) as rows FROM ${table}`);
          console.log(`✅ ${table} (${count} columns, ${rowResult.rows[0].rows} rows)`);
        } catch (e) {
          console.log(`✅ ${table} (${count} columns)`);
        }
      } else {
        console.log(`❌ ${table} - NOT FOUND`);
      }
    }

    // 5. Check RLS Policies
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔒 RLS POLICIES (PDF Tables)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const rlsResult = await pool.query(`
      SELECT tablename, policyname, cmd
      FROM pg_policies 
      WHERE tablename LIKE 'pdf_%'
      ORDER BY tablename, policyname
    `);
    
    if (rlsResult.rows.length > 0) {
      let currentTable = '';
      rlsResult.rows.forEach(policy => {
        if (policy.tablename !== currentTable) {
          currentTable = policy.tablename;
          console.log(`\n${policy.tablename}:`);
        }
        console.log(`  ✅ ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('⚠️ No RLS policies found for PDF tables');
    }

    // 6. Test Connection from API perspective
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 DATABASE CONNECTION TEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const testResult = await pool.query('SELECT NOW() as server_time, current_database() as database');
    console.log(`✅ Connected to: ${testResult.rows[0].database}`);
    console.log(`✅ Server time: ${testResult.rows[0].server_time}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL VERIFICATIONS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

verifySupabase().catch(console.error);
