/**
 * Direct Supabase Migration Script
 * Reads .env.local and applies core schema to Supabase
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('🔧 Supabase URL:', SUPABASE_URL);
console.log('🔧 Service Key:', SUPABASE_KEY.substring(0, 20) + '...');

async function runMigrations() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('\n📊 Checking existing tables...');
  
  // Test connection by querying companies table
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id')
    .limit(1);
  
  if (companiesError) {
    console.log('❌ Companies table error:', companiesError.message);
    if (companiesError.message.includes('does not exist')) {
      console.log('⚠️  Tables do not exist! You need to run migrations in Supabase SQL Editor.');
      console.log('\n📋 Go to: supabase.com → Your Project → SQL Editor');
      console.log('📋 Copy the SQL from: supabase/migrations/001_multi_tenant_foundation.sql');
      console.log('📋 Paste and run it');
    }
  } else {
    console.log('✅ Companies table exists');
  }

  // Test user_profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(1);
  
  if (profilesError) {
    console.log('❌ User profiles table error:', profilesError.message);
  } else {
    console.log('✅ User profiles table exists');
  }

  // Test if we can insert into companies (RLS check)
  console.log('\n🔐 Testing insert permissions...');
  const testId = crypto.randomUUID();
  const { data: insertTest, error: insertError } = await supabase
    .from('companies')
    .insert({ 
      id: testId,
      name: 'TEST_COMPANY_DELETE_ME',
      wsib_number: null,
      address: 'Test Address'
    })
    .select()
    .single();

  if (insertError) {
    console.log('❌ Insert test FAILED:', insertError.message);
    console.log('   Code:', insertError.code);
    console.log('   Details:', insertError.details);
    console.log('   Hint:', insertError.hint);
    console.log('\n⚠️  This is likely your registration problem!');
  } else {
    console.log('✅ Insert test PASSED - created test company:', insertTest.id);
    
    // Clean up
    await supabase.from('companies').delete().eq('id', testId);
    console.log('✅ Cleaned up test company');
  }

  // Test auth admin
  console.log('\n🔐 Testing auth.admin...');
  try {
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (usersError) {
      console.log('❌ Auth admin error:', usersError.message);
    } else {
      console.log('✅ Auth admin works - found', users.users.length, 'users');
    }
  } catch (e) {
    console.log('❌ Auth admin exception:', e.message);
  }

  console.log('\n✅ Migration check complete!');
}

runMigrations().catch(err => {
  console.error('❌ Migration script error:', err);
  process.exit(1);
});
