/**
 * Check WSIB Number Availability
 * Returns whether a WSIB number is already registered
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wsib = searchParams.get('wsib');

  if (!wsib || wsib.length !== 9 || !/^\d{9}$/.test(wsib)) {
    return NextResponse.json({ available: false, error: 'Invalid WSIB format' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ available: true }); // Fail open if no config
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .eq('wsib_number', wsib)
      .maybeSingle();

    if (error) {
      console.error('WSIB check error:', error);
      return NextResponse.json({ available: true }); // Fail open on error
    }

    return NextResponse.json({ available: !data });
  } catch (err) {
    console.error('WSIB check exception:', err);
    return NextResponse.json({ available: true }); // Fail open
  }
}
