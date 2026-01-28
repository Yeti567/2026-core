/**
 * AuditSoft Disconnect API
 * 
 * DELETE: Remove connection and all related data
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { disconnectAuditSoft } from '@/lib/integrations/auditsoft';

export const dynamic = 'force-dynamic';


export async function DELETE() {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);

    await disconnectAuditSoft(user.companyId);

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from AuditSoft',
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
