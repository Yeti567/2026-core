/**
 * Cleanup Test Data Script
 * Removes test companies and users from Supabase
 * 
 * Run with: node scripts/cleanup-test-data.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanup() {
  console.log('🧹 Starting cleanup of test data...\n');

  // 1. Get all test companies (you can adjust this filter)
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name, wsib_number');

  if (companyError) {
    console.error('❌ Failed to fetch companies:', companyError.message);
    return;
  }

  console.log(`Found ${companies.length} companies:\n`);
  companies.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} (WSIB: ${c.wsib_number})`);
  });

  if (companies.length === 0) {
    console.log('\n✅ No companies to clean up.');
    return;
  }

  console.log('\n🗑️  Deleting all test data...\n');

  for (const company of companies) {
    console.log(`Processing: ${company.name}`);

    // Get users linked to this company
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('company_id', company.id);

    // Delete user profiles
    const { error: profileErr } = await supabase
      .from('user_profiles')
      .delete()
      .eq('company_id', company.id);
    
    if (profileErr) {
      console.log(`  ⚠️  Profile delete error: ${profileErr.message}`);
    } else {
      console.log(`  ✓ Deleted user profiles`);
    }

    // Delete auth users
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const { error: authErr } = await supabase.auth.admin.deleteUser(profile.user_id);
        if (authErr) {
          console.log(`  ⚠️  Auth user delete error: ${authErr.message}`);
        } else {
          console.log(`  ✓ Deleted auth user: ${profile.user_id}`);
        }
      }
    }

    // Delete company
    const { error: companyDelErr } = await supabase
      .from('companies')
      .delete()
      .eq('id', company.id);

    if (companyDelErr) {
      console.log(`  ⚠️  Company delete error: ${companyDelErr.message}`);
    } else {
      console.log(`  ✓ Deleted company: ${company.name}`);
    }

    console.log('');
  }

  console.log('✅ Cleanup complete!');
}

cleanup().catch(console.error);
