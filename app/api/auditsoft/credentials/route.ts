/**
 * AuditSoft Credentials API
 * 
 * Manages API key storage, validation, and connection status.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import {
  createAuditSoftClient,
  encryptApiKey,
  decryptApiKey,
  getApiKeyHint,
} from '@/lib/auditsoft';

// =============================================================================
// GET - Retrieve current credentials status
// =============================================================================

export async function GET() {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const { data: credentials, error } = await supabase
      .from('auditsoft_credentials')
      .select('*')
      .eq('company_id', user.companyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch credentials:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      );
    }

    if (!credentials) {
      return NextResponse.json({
        connected: false,
        credentials: null,
      });
    }

    // Return credentials without the encrypted key
    return NextResponse.json({
      connected: credentials.is_valid,
      credentials: {
        id: credentials.id,
        api_key_hint: credentials.api_key_hint,
        environment: credentials.environment,
        is_valid: credentials.is_valid,
        last_validated_at: credentials.last_validated_at,
        audit_company_id: credentials.audit_company_id,
        audit_company_name: credentials.audit_company_name,
        audit_schedule: credentials.audit_schedule,
        auto_sync_enabled: credentials.auto_sync_enabled,
        sync_frequency: credentials.sync_frequency,
        created_at: credentials.created_at,
        updated_at: credentials.updated_at,
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
// POST - Save and validate new credentials
// =============================================================================

export async function POST(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body = await request.json();
    const { api_key, environment = 'production' } = body;

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (api_key.length < 20) {
      return NextResponse.json(
        { error: 'API key must be at least 20 characters' },
        { status: 400 }
      );
    }

    // Validate the API key with AuditSoft
    const client = createAuditSoftClient(api_key, environment);
    const validation = await client.validateCredentials();

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error || 'Invalid API key' },
        { status: 400 }
      );
    }

    // Encrypt and store the API key
    const encryptedKey = encryptApiKey(api_key);
    const keyHint = getApiKeyHint(api_key);

    // Upsert credentials
    const { data: credentials, error } = await supabase
      .from('auditsoft_credentials')
      .upsert({
        company_id: user.companyId,
        api_key_encrypted: encryptedKey,
        api_key_hint: keyHint,
        environment,
        is_valid: true,
        last_validated_at: new Date().toISOString(),
        audit_company_id: validation.company_id,
        audit_company_name: validation.company_name,
        audit_schedule: validation.schedule || {},
        created_by: user.userId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save credentials:', error);
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      credentials: {
        id: credentials.id,
        api_key_hint: credentials.api_key_hint,
        environment: credentials.environment,
        is_valid: credentials.is_valid,
        last_validated_at: credentials.last_validated_at,
        audit_company_id: credentials.audit_company_id,
        audit_company_name: credentials.audit_company_name,
        audit_schedule: credentials.audit_schedule,
        auto_sync_enabled: credentials.auto_sync_enabled,
        sync_frequency: credentials.sync_frequency,
      },
      message: `Successfully connected to AuditSoft as "${validation.company_name}"`,
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
// DELETE - Remove credentials
// =============================================================================

export async function DELETE() {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const { error } = await supabase
      .from('auditsoft_credentials')
      .delete()
      .eq('company_id', user.companyId);

    if (error) {
      console.error('Failed to delete credentials:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      );
    }

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

// =============================================================================
// PATCH - Update settings (sync frequency, auto-sync)
// =============================================================================

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const body = await request.json();
    const { auto_sync_enabled, sync_frequency } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof auto_sync_enabled === 'boolean') {
      updates.auto_sync_enabled = auto_sync_enabled;
    }

    if (sync_frequency && ['manual', 'daily', 'realtime'].includes(sync_frequency)) {
      updates.sync_frequency = sync_frequency;
    }

    const { data: credentials, error } = await supabase
      .from('auditsoft_credentials')
      .update(updates)
      .eq('company_id', user.companyId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        auto_sync_enabled: credentials.auto_sync_enabled,
        sync_frequency: credentials.sync_frequency,
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
