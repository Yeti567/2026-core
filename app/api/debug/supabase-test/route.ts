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
    // 1. Check environment variables
    results.env_check = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
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

    // 5. Test INSERT capability (then rollback)
    const testCompanyName = `__TEST_DELETE_ME_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('companies')
      .insert({ name: testCompanyName, wsib_number: '999999999' })
      .select()
      .single();

    results.insert_test = {
      success: !insertError,
      error: insertError?.message || null,
      code: insertError?.code || null,
      hint: insertError?.hint || null,
      details: insertError?.details || null,
    };

    // Clean up test data
    if (insertData?.id) {
      await supabase.from('companies').delete().eq('id', insertData.id);
      results.cleanup = 'Test company deleted';
    }

    return NextResponse.json(results);

  } catch (error) {
    results.exception = error instanceof Error ? error.message : String(error);
    return NextResponse.json(results, { status: 500 });
  }
}
