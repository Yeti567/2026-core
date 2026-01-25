/**
 * AuditSoft Export API
 * 
 * Manages export jobs for sending evidence to AuditSoft.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import type { ExportJobInsert } from '@/lib/auditsoft';
import { handleApiError } from '@/lib/utils/error-handling';

// =============================================================================
// GET - List export jobs
// =============================================================================

export async function GET(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');

    let query = supabase
      .from('auditsoft_export_jobs')
      .select('*')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Failed to fetch export jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch export jobs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

// =============================================================================
// POST - Create a new export job
// =============================================================================

export async function POST(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Check if connected to AuditSoft
    const { data: credentials } = await supabase
      .from('auditsoft_credentials')
      .select('is_valid')
      .eq('company_id', user.companyId)
      .single();

    if (!credentials?.is_valid) {
      return NextResponse.json(
        { error: 'Not connected to AuditSoft. Please configure your API key first.' },
        { status: 400 }
      );
    }

    const body: ExportJobInsert = await request.json();

    // Validate date range
    if (!body.date_range_start || !body.date_range_end) {
      return NextResponse.json(
        { error: 'Date range is required' },
        { status: 400 }
      );
    }

    // Validate elements
    const elements = body.elements_selected || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    if (!elements.every(e => e >= 1 && e <= 14)) {
      return NextResponse.json(
        { error: 'Invalid element selection' },
        { status: 400 }
      );
    }

    // Create the export job
    const { data: job, error } = await supabase
      .from('auditsoft_export_jobs')
      .insert({
        company_id: user.companyId,
        status: 'pending',
        export_type: body.export_type || 'full',
        date_range_start: body.date_range_start,
        date_range_end: body.date_range_end,
        elements_selected: elements,
        created_by: user.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create export job:', error);
      return NextResponse.json(
        { error: 'Failed to create export job' },
        { status: 500 }
      );
    }

    // Start the export process asynchronously
    // In a production environment, this would be handled by a background worker
    processExportJob(job.id, user.companyId).catch(console.error);

    return NextResponse.json({
      job,
      message: 'Export job created. Processing will begin shortly.',
    }, { status: 201 });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}

// =============================================================================
// EXPORT PROCESSING (Background task simulation)
// =============================================================================

async function processExportJob(jobId: string, companyId: string) {
  const supabase = createRouteHandlerClient();

  try {
    // Update status to validating
    await supabase
      .from('auditsoft_export_jobs')
      .update({
        status: 'validating',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Get the job details
    const { data: job } = await supabase
      .from('auditsoft_export_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) return;

    // Simulate counting items to export
    const dateStart = new Date(job.date_range_start);
    const dateEnd = new Date(job.date_range_end);
    dateEnd.setHours(23, 59, 59, 999);

    // Count form submissions
    const { count: formsCount } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', dateStart.toISOString())
      .lte('submitted_at', dateEnd.toISOString());

    // Count documents
    const { count: docsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', dateStart.toISOString())
      .lte('created_at', dateEnd.toISOString());

    // Count certifications
    const { count: certsCount } = await supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', dateStart.toISOString())
      .lte('created_at', dateEnd.toISOString());

    const totalItems = (formsCount || 0) + (docsCount || 0) + (certsCount || 0);

    // Update to exporting status with counts
    await supabase
      .from('auditsoft_export_jobs')
      .update({
        status: 'exporting',
        total_items: totalItems,
      })
      .eq('id', jobId);

    // Simulate export processing with progress updates
    let processed = 0;
    const batchSize = Math.max(10, Math.floor(totalItems / 10));

    while (processed < totalItems) {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));

      processed = Math.min(processed + batchSize, totalItems);

      await supabase
        .from('auditsoft_export_jobs')
        .update({
          processed_items: processed,
          success_count: processed,
        })
        .eq('id', jobId);
    }

    // Mark as completed
    await supabase
      .from('auditsoft_export_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        forms_exported: formsCount || 0,
        documents_exported: docsCount || 0,
        certifications_exported: certsCount || 0,
        auditsoft_batch_id: `BATCH-${Date.now()}`,
        export_summary: {
          duration_ms: Date.now() - new Date(job.started_at || job.created_at).getTime(),
          by_type: {
            form_submissions: formsCount || 0,
            documents: docsCount || 0,
            certifications: certsCount || 0,
          },
        },
      })
      .eq('id', jobId);

  } catch (error) {
    console.error('Export job failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('auditsoft_export_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_log: [{ error: errorMessage, timestamp: new Date().toISOString() }],
      })
      .eq('id', jobId);
  }
}
