/**
 * AuditSoft Export Status API
 * 
 * GET: Get current status of an export (fallback for SSE)
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const { id: exportId } = await params;
    const supabase = createRouteHandlerClient();

    const { data: syncLog, error } = await supabase
      .from('auditsoft_sync_log')
      .select('*')
      .eq('id', exportId)
      .eq('company_id', user.companyId)
      .single();

    if (error || !syncLog) {
      return NextResponse.json(
        { error: 'Export not found' },
        { status: 404 }
      );
    }

    // Calculate duration
    const durationSeconds = syncLog.completed_at && syncLog.started_at
      ? Math.round((new Date(syncLog.completed_at).getTime() - new Date(syncLog.started_at).getTime()) / 1000)
      : null;

    return NextResponse.json({
      id: syncLog.id,
      status: syncLog.status,
      started_at: syncLog.started_at,
      completed_at: syncLog.completed_at,
      duration_seconds: durationSeconds,
      items_attempted: syncLog.items_attempted,
      items_succeeded: syncLog.items_succeeded,
      items_failed: syncLog.items_failed,
      sync_details: syncLog.sync_details,
      error_details: syncLog.error_details,
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
