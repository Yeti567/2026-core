const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function deleteCompany() {
  console.log('Looking for company with WSIB 123456789...');
  
  // Find the company - may be multiple
  const { data: companies, error: findError } = await supabase
    .from('companies')
    .select('id, name, wsib_number')
    .eq('wsib_number', '123456789');

  if (findError) {
    console.log('Error finding company:', findError.message);
    return;
  }

  if (!companies || companies.length === 0) {
    // Try listing all companies to see what's there
    const { data: all } = await supabase.from('companies').select('id, name, wsib_number');
    console.log('No company with that WSIB found. All companies:', all);
    return;
  }

  console.log('Found companies:', companies);
  const company = companies[0];

  // Delete related user profiles first
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('company_id', company.id);

  if (profileError) {
    console.log('Error deleting profiles:', profileError.message);
  } else {
    console.log('Deleted related user profiles');
  }

  // Delete the company
  const { error: deleteError } = await supabase
    .from('companies')
    .delete()
    .eq('id', company.id);

  if (deleteError) {
    console.log('Error deleting company:', deleteError.message);
  } else {
    console.log('✅ Company deleted successfully');
  }
}

deleteCompany();
