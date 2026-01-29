/**
 * Debug endpoint to test Supabase connection
 * DELETE THIS AFTER TESTING
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env_check: {},
    connection_test: null,
    tables_check: null,
  };

  try {
    // 1. Check environment variables - show partial values for debugging
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    results.env_check = {
      NEXT_PUBLIC_SUPABASE_URL: !!url,
      NEXT_PUBLIC_SUPABASE_URL_preview: url ? url.substring(0, 30) + '...' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: !!key,
      SUPABASE_SERVICE_ROLE_KEY_length: key.length,
      SUPABASE_SERVICE_ROLE_KEY_preview: key ? key.substring(0, 15) + '...' : 'NOT SET',
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      results.error = 'Missing environment variables';
      return NextResponse.json(results, { status: 500 });
    }

    // 2. Create Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Test basic query - count companies
    const { data: companyCount, error: countError } = await supabase
      .from('companies')
      .select('id', { count: 'exact', head: true });

    results.connection_test = {
      success: !countError,
      error: countError?.message || null,
      code: countError?.code || null,
    };

    // 4. Check if tables exist by trying to select from them
    const tables = ['companies', 'user_profiles', 'workers'];
    const tableResults: Record<string, unknown> = {};

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      tableResults[table] = {
        accessible: !error,
        error: error?.message || null,
        code: error?.code || null,
      };
    }

    results.tables_check = tableResults;

    // 5. Test INSERT with BASIC fields only
    const testCompanyName = `__TEST_DELETE_ME_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('companies')
      .insert({ name: testCompanyName, wsib_number: '999999999' })
      .select()
      .single();

    results.insert_test_basic = {
      success: !insertError,
      error: insertError?.message || null,
      code: insertError?.code || null,
    };

    // Clean up basic test
    if (insertData?.id) {
      await supabase.from('companies').delete().eq('id', insertData.id);
    }

    // 6. Test INSERT with EXTENDED fields (what registration uses)
    const { data: extendedData, error: extendedError } = await supabase
      .from('companies')
      .insert({
        name: `__TEST_EXTENDED_${Date.now()}`,
        wsib_number: '888888888',
        address: '123 Test St',
        city: 'Toronto',
        province: 'ON',
        postal_code: 'M5V 1A1',
        phone: '416-555-1234',
        company_email: 'test@example.com',
        registration_status: 'active'
      })
      .select()
      .single();

    results.insert_test_extended = {
      success: !extendedError,
      error: extendedError?.message || null,
      code: extendedError?.code || null,
      hint: extendedError?.hint || null,
      details: extendedError?.details || null,
    };

    // Clean up extended test
    if (extendedData?.id) {
      await supabase.from('companies').delete().eq('id', extendedData.id);
    }

    // 7. Test AUTH ADMIN API (the likely culprit)
    const testEmail = `test_${Date.now()}@delete-me.test`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    results.auth_admin_test = {
      success: !authError,
      error: authError?.message || null,
      code: (authError as any)?.code || null,
      status: (authError as any)?.status || null,
    };

    // If auth user created, test user_profiles insert then cleanup
    if (authData?.user) {
      // Create a test company for the profile
      const { data: testCo } = await supabase
        .from('companies')
        .insert({ name: '__PROFILE_TEST_CO', wsib_number: '777777777' })
        .select()
        .single();

      if (testCo) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            company_id: testCo.id,
            role: 'admin',
            first_admin: true,
            position: 'Test Position',
            display_name: 'Test User'
          });

        results.user_profiles_test = {
          success: !profileError,
          error: profileError?.message || null,
          code: profileError?.code || null,
          hint: profileError?.hint || null,
        };

        // Cleanup
        await supabase.from('user_profiles').delete().eq('user_id', authData.user.id);
        await supabase.from('companies').delete().eq('id', testCo.id);
      }

      // Delete test auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      results.cleanup = 'All test data deleted';
    }

    return NextResponse.json(results);

  } catch (error) {
    results.exception = error instanceof Error ? error.message : String(error);
    return NextResponse.json(results, { status: 500 });
  }
}
