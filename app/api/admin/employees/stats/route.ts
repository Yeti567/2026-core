/**
 * Admin Employees Stats API Route
 * 
 * GET: Get employee statistics for the dashboard
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';

export async function GET() {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Get all employee counts in parallel
    const [
      { count: total },
      { count: active },
      { count: inactive },
      { count: pending },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId),
      supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .eq('is_active', true),
      supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .eq('is_active', false),
      supabase
        .from('worker_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .eq('status', 'pending'),
    ]);

    return NextResponse.json({
      stats: {
        total: total || 0,
        active: active || 0,
        inactive: inactive || 0,
        pending: pending || 0,
      },
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
