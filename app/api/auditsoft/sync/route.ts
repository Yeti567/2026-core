/**
 * AuditSoft Sync API
 * 
 * Triggers manual sync and retrieves sync status/history.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';

// =============================================================================
// GET - Get sync status and recent events
// =============================================================================

export async function GET(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Get recent sync events
    const { data: events, error } = await supabase
      .from('auditsoft_sync_events')
      .select('*')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch sync events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sync events' },
        { status: 500 }
      );
    }

    // Get pending sync count
    const { count: pendingCount } = await supabase
      .from('auditsoft_sync_events')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.companyId)
      .eq('status', 'pending');

    return NextResponse.json({
      events,
      pending_count: pendingCount || 0,
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
// POST - Trigger manual sync
// =============================================================================

export async function POST(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);
    const supabase = createRouteHandlerClient();

    // Check if connected and auto-sync is enabled
    const { data: credentials } = await supabase
      .from('auditsoft_credentials')
      .select('is_valid, auto_sync_enabled')
      .eq('company_id', user.companyId)
      .single();

    if (!credentials?.is_valid) {
      return NextResponse.json(
        { error: 'Not connected to AuditSoft' },
        { status: 400 }
      );
    }

    // Create a sync trigger event
    const { data: event, error } = await supabase
      .from('auditsoft_sync_events')
      .insert({
        company_id: user.companyId,
        event_type: 'sync_triggered',
        status: 'processing',
        payload: {
          triggered_by: user.userId,
          manual: true,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create sync event:', error);
      return NextResponse.json(
        { error: 'Failed to trigger sync' },
        { status: 500 }
      );
    }

    // Simulate sync processing (in production, this would be a background job)
    setTimeout(async () => {
      await supabase
        .from('auditsoft_sync_events')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          payload: {
            ...event.payload,
            items_synced: Math.floor(Math.random() * 10) + 1,
          },
        })
        .eq('id', event.id);
    }, 2000);

    return NextResponse.json({
      success: true,
      event_id: event.id,
      message: 'Sync triggered successfully',
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
