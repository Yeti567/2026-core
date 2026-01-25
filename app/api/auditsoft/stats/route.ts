/**
 * AuditSoft Statistics API
 * 
 * Provides export statistics and connection status.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';

export async function GET() {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Get credentials status
    const { data: credentials } = await supabase
      .from('auditsoft_credentials')
      .select('is_valid, audit_company_name, last_validated_at, auto_sync_enabled, sync_frequency')
      .eq('company_id', user.companyId)
      .single();

    // Get export statistics
    const { data: jobs } = await supabase
      .from('auditsoft_export_jobs')
      .select('status, success_count, completed_at')
      .eq('company_id', user.companyId);

    const stats = {
      is_connected: credentials?.is_valid || false,
      company_name: credentials?.audit_company_name || null,
      last_validated_at: credentials?.last_validated_at || null,
      auto_sync_enabled: credentials?.auto_sync_enabled || false,
      sync_frequency: credentials?.sync_frequency || 'manual',
      total_exports: jobs?.length || 0,
      successful_exports: jobs?.filter(j => j.status === 'completed').length || 0,
      failed_exports: jobs?.filter(j => j.status === 'failed').length || 0,
      total_items_exported: jobs?.reduce((sum, j) => sum + (j.success_count || 0), 0) || 0,
      last_export_at: jobs?.filter(j => j.completed_at).sort((a, b) => 
        new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
      )[0]?.completed_at || null,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
