/**
 * AuditSoft Credentials Validation API
 * 
 * Re-validates existing credentials with AuditSoft.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { createAuditSoftClient, decryptApiKey } from '@/lib/auditsoft';

export async function POST() {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Get existing credentials
    const { data: credentials, error: fetchError } = await supabase
      .from('auditsoft_credentials')
      .select('*')
      .eq('company_id', user.companyId)
      .single();

    if (fetchError || !credentials) {
      return NextResponse.json(
        { error: 'No credentials found. Please configure your API key first.' },
        { status: 404 }
      );
    }

    // Decrypt and validate
    const apiKey = decryptApiKey(credentials.api_key_encrypted);
    const client = createAuditSoftClient(apiKey, credentials.environment);
    const validation = await client.validateCredentials();

    // Update validation status
    const { error: updateError } = await supabase
      .from('auditsoft_credentials')
      .update({
        is_valid: validation.success,
        last_validated_at: new Date().toISOString(),
        audit_company_id: validation.success ? validation.company_id : credentials.audit_company_id,
        audit_company_name: validation.success ? validation.company_name : credentials.audit_company_name,
        audit_schedule: validation.success && validation.schedule ? validation.schedule : credentials.audit_schedule,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', user.companyId);

    if (updateError) {
      console.error('Failed to update validation status:', updateError);
    }

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error || 'Validation failed',
        is_valid: false,
      });
    }

    return NextResponse.json({
      success: true,
      is_valid: true,
      company_name: validation.company_name,
      audit_schedule: validation.schedule,
      last_validated_at: new Date().toISOString(),
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
