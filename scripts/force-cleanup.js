/**
 * Force cleanup remaining test data using RPC
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function forceCleanup() {
  console.log('🔥 Force cleanup of remaining test data...\n');

  // Find the remaining test company
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', '__PROFILE_TEST_CO')
    .single();

  if (!company) {
    console.log('✅ No remaining test companies found.');
    return;
  }

  console.log(`Found: ${company.name} (${company.id})`);

  // Get the user profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, id')
    .eq('company_id', company.id);

  if (profiles && profiles.length > 0) {
    for (const profile of profiles) {
      // Delete any documents created by this user first
      await supabase.from('documents').delete().eq('created_by', profile.user_id);
      console.log(`  ✓ Deleted documents for user ${profile.user_id}`);

      // Update first_admin flag to allow deletion
      await supabase
        .from('user_profiles')
        .update({ first_admin: false })
        .eq('id', profile.id);
      console.log(`  ✓ Cleared first_admin flag`);

      // Now delete the profile
      const { error: profErr } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', profile.id);
      
      if (profErr) {
        console.log(`  ⚠️  Profile delete: ${profErr.message}`);
      } else {
        console.log(`  ✓ Deleted profile`);
      }

      // Delete auth user
      const { error: authErr } = await supabase.auth.admin.deleteUser(profile.user_id);
      if (authErr) {
        console.log(`  ⚠️  Auth delete: ${authErr.message}`);
      } else {
        console.log(`  ✓ Deleted auth user`);
      }
    }
  }

  // Delete company
  const { error: compErr } = await supabase
    .from('companies')
    .delete()
    .eq('id', company.id);

  if (compErr) {
    console.log(`  ⚠️  Company delete: ${compErr.message}`);
  } else {
    console.log(`  ✓ Deleted company`);
  }

  console.log('\n✅ Force cleanup complete!');
}

forceCleanup().catch(console.error);
