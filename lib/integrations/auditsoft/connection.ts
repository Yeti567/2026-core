/**
 * AuditSoft Connection Management
 * 
 * Functions for managing AuditSoft connections in the database.
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { AuditSoftClient } from './client';
import { encryptAPIKey, decryptAPIKey, getAPIKeyHint } from './encryption';
import type { AuditSoftConnection, ValidationResult, AuditSoftStats } from './types';

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Save or update AuditSoft connection for a company
 * 
 * @param companyId - The company's UUID
 * @param apiKey - The plaintext API key from AuditSoft
 * @param userId - The user's profile ID who is creating the connection
 * @param endpoint - Optional custom API endpoint
 * @returns The saved connection record
 */
export async function saveAuditSoftConnection(
  companyId: string,
  apiKey: string,
  userId: string,
  endpoint?: string
): Promise<AuditSoftConnection> {
  const supabase = createRouteHandlerClient();

  // Validate key first
  const client = new AuditSoftClient(apiKey, companyId, endpoint);
  const validation = await client.validateConnection();

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid API key');
  }

  // Encrypt API key
  const encryptedKey = encryptAPIKey(apiKey);

  // Save to database (upsert)
  const { data: connection, error } = await supabase
    .from('auditsoft_connections')
    .upsert(
      {
        company_id: companyId,
        api_key: encryptedKey,
        api_endpoint: endpoint || 'https://api.auditsoft.co',
        organization_id: validation.organization_id,
        audit_id: validation.audit_id,
        connection_status: 'active',
        last_validated_at: new Date().toISOString(),
        audit_scheduled_date: validation.audit_scheduled_date,
        audit_status: 'pending',
        auditor_name: validation.auditor_name,
        auditor_email: validation.auditor_email,
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'company_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to save AuditSoft connection:', error);
    throw new Error('Failed to save connection');
  }

  return connection;
}

/**
 * Get AuditSoft connection for a company
 */
export async function getAuditSoftConnection(
  companyId: string
): Promise<AuditSoftConnection | null> {
  const supabase = createRouteHandlerClient();

  const { data, error } = await supabase
    .from('auditsoft_connections')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch AuditSoft connection:', error);
  }

  return data;
}

/**
 * Get decrypted API key for a company
 * 
 * WARNING: Only use when you need to make API calls.
 * Never log or expose the decrypted key.
 */
export async function getDecryptedAPIKey(
  companyId: string
): Promise<string | null> {
  const connection = await getAuditSoftConnection(companyId);
  if (!connection) return null;

  try {
    return decryptAPIKey(connection.api_key);
  } catch (error) {
    console.error('Failed to decrypt API key');
    return null;
  }
}

/**
 * Get an AuditSoft client for a company
 * Automatically retrieves and decrypts the API key
 */
export async function getAuditSoftClient(
  companyId: string
): Promise<AuditSoftClient | null> {
  const connection = await getAuditSoftConnection(companyId);
  if (!connection || connection.connection_status !== 'active') {
    return null;
  }

  try {
    const apiKey = decryptAPIKey(connection.api_key);
    return new AuditSoftClient(apiKey, companyId, connection.api_endpoint);
  } catch (error) {
    console.error('Failed to create AuditSoft client');
    return null;
  }
}

/**
 * Validate existing connection
 */
export async function validateAuditSoftConnection(
  companyId: string
): Promise<ValidationResult> {
  const supabase = createRouteHandlerClient();
  const connection = await getAuditSoftConnection(companyId);

  if (!connection) {
    return { valid: false, error: 'No connection found' };
  }

  try {
    const apiKey = decryptAPIKey(connection.api_key);
    const client = new AuditSoftClient(apiKey, companyId, connection.api_endpoint);
    const validation = await client.validateConnection();

    // Update connection status
    await supabase
      .from('auditsoft_connections')
      .update({
        connection_status: validation.valid ? 'active' : 'invalid_key',
        last_validated_at: new Date().toISOString(),
        organization_id: validation.valid ? validation.organization_id : connection.organization_id,
        audit_id: validation.valid ? validation.audit_id : connection.audit_id,
        audit_scheduled_date: validation.valid ? validation.audit_scheduled_date : connection.audit_scheduled_date,
        auditor_name: validation.valid ? validation.auditor_name : connection.auditor_name,
        auditor_email: validation.valid ? validation.auditor_email : connection.auditor_email,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId);

    return validation;
  } catch (error) {
    // Update connection as invalid
    await supabase
      .from('auditsoft_connections')
      .update({
        connection_status: 'invalid_key',
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId);

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Disconnect from AuditSoft (delete connection)
 */
export async function disconnectAuditSoft(companyId: string): Promise<void> {
  const supabase = createRouteHandlerClient();

  const { error } = await supabase
    .from('auditsoft_connections')
    .delete()
    .eq('company_id', companyId);

  if (error) {
    console.error('Failed to disconnect AuditSoft:', error);
    throw new Error('Failed to disconnect');
  }
}

/**
 * Update sync settings
 */
export async function updateSyncSettings(
  companyId: string,
  settings: {
    sync_enabled?: boolean;
    sync_frequency?: 'realtime' | 'daily' | 'manual';
  }
): Promise<AuditSoftConnection> {
  const supabase = createRouteHandlerClient();

  const { data, error } = await supabase
    .from('auditsoft_connections')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update sync settings:', error);
    throw new Error('Failed to update settings');
  }

  return data;
}

/**
 * Get connection statistics
 */
export async function getAuditSoftStats(companyId: string): Promise<AuditSoftStats | null> {
  const supabase = createRouteHandlerClient();

  const { data, error } = await supabase.rpc('get_auditsoft_stats', {
    p_company_id: companyId,
  });

  if (error) {
    console.error('Failed to fetch AuditSoft stats:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get safe connection info (without encrypted key)
 */
export function getSafeConnectionInfo(connection: AuditSoftConnection): Omit<AuditSoftConnection, 'api_key'> & { api_key_hint: string } {
  // Extract last 4 chars of the original key from encrypted format
  // Since we can't safely show any part of the encrypted key, we'll just show a placeholder
  const { api_key, ...safeConnection } = connection;
  
  return {
    ...safeConnection,
    api_key_hint: '****' + (connection.organization_id?.slice(-4) || 'xxxx'),
  };
}
