/**
 * AuditSoft Connect API
 * 
 * POST: Validate API key and save connection
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { saveAuditSoftConnection, isEncryptionConfigured } from '@/lib/integrations/auditsoft';
import { handleApiError } from '@/lib/utils/error-handling';

export async function POST(req: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);

    // Check encryption is configured
    if (!isEncryptionConfigured()) {
      console.error('ENCRYPTION_KEY environment variable not configured');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { api_key, api_endpoint } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (typeof api_key !== 'string' || api_key.length < 20) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    // Save connection (validates key internally)
    const connection = await saveAuditSoftConnection(
      user.companyId,
      api_key,
      user.userId,
      api_endpoint
    );

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        organization_id: connection.organization_id,
        audit_id: connection.audit_id,
        audit_scheduled_date: connection.audit_scheduled_date,
        audit_status: connection.audit_status,
        auditor_name: connection.auditor_name,
        auditor_email: connection.auditor_email,
        connection_status: connection.connection_status,
        sync_enabled: connection.sync_enabled,
        sync_frequency: connection.sync_frequency,
      },
      message: 'Successfully connected to AuditSoft',
    });
  } catch (error) {
    // Handle auth errors
    if ((error as AuthError).status) {
      const authError = error as AuthError;
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      );
    }

    // Handle validation/connection errors
    return handleApiError(error, 'Failed to connect to AuditSoft', 400, 'AuditSoft connect');
  }
}
