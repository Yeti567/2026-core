/**
 * AuditSoft Export API
 * 
 * POST: Start a full evidence export to AuditSoft
 * GET: Get export status / sync history
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { 
  exportAllEvidenceToAuditSoft,
  getSyncHistory,
  type ExportOptions,
} from '@/lib/integrations/auditsoft/export-engine';
import { getAuditSoftConnection } from '@/lib/integrations/auditsoft';

export const dynamic = 'force-dynamic';


/**
 * Start a new export to AuditSoft
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);

    // Parse options from request body
    let options: ExportOptions = {};
    try {
      const body = await req.json();
      options = {
        incremental: body.incremental ?? false,
        dateRange: body.date_range,
        elements: body.elements,
        includeTypes: body.include_types,
        userId: user.userId,
      };
    } catch {
      // Empty body is fine, use defaults
      options = { userId: user.userId };
    }

    // Check if connection exists
    const connection = await getAuditSoftConnection(user.companyId);
    if (!connection || connection.connection_status !== 'active') {
      return NextResponse.json(
        { error: 'AuditSoft is not connected. Please connect your account first.' },
        { status: 400 }
      );
    }

    // Start export
    const result = await exportAllEvidenceToAuditSoft(user.companyId, options);

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully exported ${result.succeeded} items to AuditSoft`
        : `Export completed with ${result.failed} errors`,
      result: {
        total_items: result.total_items,
        succeeded: result.succeeded,
        failed: result.failed,
        duration_seconds: result.duration_seconds,
        summary: result.summary,
        errors: result.errors.slice(0, 10), // Limit errors in response
        sync_log_id: result.sync_log_id,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message || 'Export failed' },
      { status: authError.status || 500 }
    );
  }
}

/**
 * Get sync history
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const history = await getSyncHistory(user.companyId, limit);

    return NextResponse.json({
      history,
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
