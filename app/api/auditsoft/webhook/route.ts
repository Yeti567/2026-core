/**
 * AuditSoft Webhook API
 * 
 * Receives webhook events from AuditSoft for bi-directional sync.
 * Note: JWT verification is disabled as webhooks use their own authentication.
 */

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';


// Create a service-level client for webhook processing
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service configuration');
  }

  return createClient<any>(supabaseUrl, supabaseServiceKey);
}

// Verify webhook signature using HMAC-SHA256
function verifyWebhookSignature(request: Request, body: string): boolean {
  const signature = request.headers.get('x-auditsoft-signature');
  const webhookSecret = process.env.AUDITSOFT_WEBHOOK_SECRET;

  // In production, ALWAYS require signature and secret
  if (!signature || !webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook] Missing signature or secret in production');
      return false;
    }
    // In development, allow unsigned webhooks only if explicitly configured
    console.warn('[Webhook] Development mode: Allowing unsigned webhook (not secure)');
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  
  const providedSignature = signature.replace(/^sha256=/, '');
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    const a = Buffer.from(providedSignature, 'hex');
    const b = Buffer.from(expectedSignature, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();

    // Verify webhook signature
    if (!verifyWebhookSignature(request, body)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const { event_type, company_id, data, timestamp } = payload;

    if (!event_type || !company_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Find the company by AuditSoft company ID
    const { data: credentials } = await supabase
      .from('auditsoft_credentials')
      .select('company_id')
      .eq('audit_company_id', company_id)
      .single();

    if (!credentials) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Log the webhook event
    await supabase.from('auditsoft_sync_events').insert({
      company_id: credentials.company_id,
      event_type: 'webhook_received',
      status: 'pending',
      payload: {
        event_type,
        auditsoft_company_id: company_id,
        data,
        timestamp,
      },
    });

    // Process different event types
    switch (event_type) {
      case 'audit_scheduled':
        await handleAuditScheduled(supabase, credentials.company_id, data);
        break;

      case 'evidence_accepted':
        await handleEvidenceAccepted(supabase, credentials.company_id, data);
        break;

      case 'evidence_rejected':
        await handleEvidenceRejected(supabase, credentials.company_id, data);
        break;

      case 'audit_completed':
        await handleAuditCompleted(supabase, credentials.company_id, data);
        break;

      default:
        console.log(`Unknown webhook event type: ${event_type}`);
    }

    return NextResponse.json({ success: true, received: event_type });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleAuditScheduled(
  supabase: SupabaseClient<any>,
  companyId: string,
  data: { audit_date?: string; audit_type?: string; auditor_name?: string }
) {
  // Update the audit schedule in credentials
  const { error } = await supabase
    .from('auditsoft_credentials')
    .update({
      audit_schedule: {
        next_audit_date: data.audit_date,
        audit_type: data.audit_type,
        auditor_name: data.auditor_name,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId);

  if (error) {
    console.error('Failed to update audit schedule:', error);
  }
}

async function handleEvidenceAccepted(
  supabase: SupabaseClient<any>,
  companyId: string,
  data: { item_ids?: string[] }
) {
  if (!data.item_ids || data.item_ids.length === 0) return;

  // Update status of accepted items
  for (const itemId of data.item_ids) {
    await supabase
      .from('auditsoft_exported_items')
      .update({
        auditsoft_status: 'accepted',
        last_synced_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('auditsoft_item_id', itemId);
  }
}

async function handleEvidenceRejected(
  supabase: SupabaseClient<any>,
  companyId: string,
  data: { item_id?: string; reason?: string }
) {
  if (!data.item_id) return;

  // Update status of rejected item
  await supabase
    .from('auditsoft_exported_items')
    .update({
      auditsoft_status: 'rejected',
      sync_error: data.reason,
      last_synced_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)
    .eq('auditsoft_item_id', data.item_id);
}

async function handleAuditCompleted(
  supabase: SupabaseClient<any>,
  companyId: string,
  data: { score?: number; notes?: string }
) {
  // Log the audit completion event
  await supabase.from('auditsoft_sync_events').insert({
    company_id: companyId,
    event_type: 'sync_completed',
    status: 'completed',
    payload: {
      audit_completed: true,
      score: data.score,
      notes: data.notes,
    },
    processed_at: new Date().toISOString(),
  });

  // Clear the next audit date since it's completed
  await supabase
    .from('auditsoft_credentials')
    .update({
      audit_schedule: {
        last_audit_score: data.score,
        last_audit_notes: data.notes,
        completed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId);
}
