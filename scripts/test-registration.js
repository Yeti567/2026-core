/**
 * Test registration flow directly
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

async function testRegistration() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  });

  const testEmail = `test_${Date.now()}@example.com`;
  const testCompanyName = `Test Company ${Date.now()}`;

  console.log('🔄 Testing full registration flow...');
  console.log('   Email:', testEmail);
  console.log('   Company:', testCompanyName);

  // Step 1: Create company
  console.log('\n📝 Step 1: Creating company...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: testCompanyName,
      wsib_number: null,
      address: 'Test Address, ON'
    })
    .select('id, name')
    .single();

  if (companyError) {
    console.error('❌ Company creation failed:', companyError);
    return;
  }
  console.log('✅ Company created:', company.id);

  // Step 2: Create user with auth.admin
  console.log('\n📝 Step 2: Creating auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      name: 'Test User',
      company_id: company.id,
      role: 'admin'
    }
  });

  if (authError) {
    console.error('❌ Auth user creation failed:', authError);
    // Rollback company
    await supabase.from('companies').delete().eq('id', company.id);
    return;
  }
  console.log('✅ Auth user created:', authData.user.id);

  // Step 3: Create user_profiles link
  console.log('\n📝 Step 3: Creating user profile...');
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: authData.user.id,
      company_id: company.id,
      role: 'admin'
    });

  if (profileError) {
    console.error('❌ Profile creation failed:', profileError);
    // Rollback
    await supabase.auth.admin.deleteUser(authData.user.id);
    await supabase.from('companies').delete().eq('id', company.id);
    return;
  }
  console.log('✅ User profile created!');

  console.log('\n🎉 REGISTRATION FLOW WORKS PERFECTLY!');
  console.log('\n🧹 Cleaning up test data...');
  
  // Clean up
  await supabase.from('user_profiles').delete().eq('user_id', authData.user.id);
  await supabase.auth.admin.deleteUser(authData.user.id);
  await supabase.from('companies').delete().eq('id', company.id);
  console.log('✅ Cleaned up');
}

testRegistration().catch(console.error);
