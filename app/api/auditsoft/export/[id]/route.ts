/**
 * AuditSoft Export Job by ID API
 * 
 * Manages individual export job status and cancellation.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';

// =============================================================================
// GET - Get export job status
// =============================================================================

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const { data: job, error } = await supabase
      .from('auditsoft_export_jobs')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    // Calculate progress percentage
    const progress = job.total_items > 0
      ? Math.round((job.processed_items / job.total_items) * 100)
      : 0;

    return NextResponse.json({
      job: {
        ...job,
        progress,
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

// =============================================================================
// DELETE - Cancel an export job
// =============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Check if job exists and is cancellable
    const { data: job } = await supabase
      .from('auditsoft_export_jobs')
      .select('status')
      .eq('id', params.id)
      .eq('company_id', user.companyId)
      .single();

    if (!job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed or failed job' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('auditsoft_export_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', user.companyId);

    if (error) {
      console.error('Failed to cancel export job:', error);
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Export job cancelled' });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
