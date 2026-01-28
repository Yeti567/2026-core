/**
 * AuditSoft Status API
 * 
 * GET: Get connection status and statistics
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { 
  getAuditSoftConnection, 
  getAuditSoftStats,
  getSafeConnectionInfo 
} from '@/lib/integrations/auditsoft';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);

    const connection = await getAuditSoftConnection(user.companyId);

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
        stats: null,
      });
    }

    // Get statistics
    const stats = await getAuditSoftStats(user.companyId);

    // Return safe connection info (without encrypted key)
    const safeConnection = getSafeConnectionInfo(connection);

    return NextResponse.json({
      connected: connection.connection_status === 'active',
      connection: safeConnection,
      stats,
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
