/**
 * AuditSoft Validate API
 * 
 * POST: Re-validate existing connection
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { validateAuditSoftConnection, getAuditSoftConnection, getSafeConnectionInfo } from '@/lib/integrations/auditsoft';

export const dynamic = 'force-dynamic';


export async function POST() {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);

    const validation = await validateAuditSoftConnection(user.companyId);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: validation.error,
      });
    }

    // Get updated connection info
    const connection = await getAuditSoftConnection(user.companyId);

    return NextResponse.json({
      success: true,
      valid: true,
      connection: connection ? getSafeConnectionInfo(connection) : null,
      audit_info: {
        organization_id: validation.organization_id,
        organization_name: validation.organization_name,
        audit_id: validation.audit_id,
        audit_scheduled_date: validation.audit_scheduled_date,
        auditor_name: validation.auditor_name,
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
