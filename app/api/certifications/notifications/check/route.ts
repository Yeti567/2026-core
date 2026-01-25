/**
 * Certification Expiry Check API
 * 
 * POST /api/certifications/notifications/check
 * 
 * Manually triggers the daily expiry check.
 * Can also be called by a cron service.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { checkExpiringCertificationsDaily } from '@/lib/certifications/expiry-notifications';
import { handleApiError } from '@/lib/utils/error-handling';

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

async function getAuthenticatedUser() {
  const supabase = createRouteHandlerClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single();

  return profile;
}

// =============================================================================
// POST - Trigger Expiry Check
// =============================================================================

export async function POST(req: Request) {
  try {
    // Check for cron secret (for automated calls)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = false;

    // Check if this is a cron job call
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    } else {
      // Check if user is admin
      const user = await getAuthenticatedUser();
      if (user && ['super_admin', 'admin'].includes(user.role)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run the expiry check
    console.log('🔔 Manual expiry check triggered');
    const result = await checkExpiringCertificationsDaily();

    return NextResponse.json({
      message: 'Expiry check completed',
      ...result,
    });
  } catch (error: unknown) {
    console.error('Expiry check error:', error);
    return handleApiError(error, 'Failed to check expiring certifications');
  }
}

// =============================================================================
// GET - Check Status
// =============================================================================

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user || !['super_admin', 'admin'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get recent notification stats
    const today = new Date();
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const { data: recentReminders, error } = await supabase
      .from('certification_reminders')
      .select('status, reminder_type, sent_at')
      .eq('company_id', user.company_id)
      .gte('scheduled_date', last7Days.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: false });

    if (error) {
      return handleApiError(error, 'Failed to get notification status', 500);
    }

    const stats = {
      total: recentReminders?.length || 0,
      sent: recentReminders?.filter(r => r.status === 'sent').length || 0,
      pending: recentReminders?.filter(r => r.status === 'pending').length || 0,
      failed: recentReminders?.filter(r => r.status === 'failed').length || 0,
      byType: {
        '60_day': recentReminders?.filter(r => r.reminder_type === '60_day').length || 0,
        '30_day': recentReminders?.filter(r => r.reminder_type === '30_day').length || 0,
        '7_day': recentReminders?.filter(r => r.reminder_type === '7_day').length || 0,
        'expired': recentReminders?.filter(r => r.reminder_type === 'expired').length || 0,
      },
    };

    return NextResponse.json({
      success: true,
      stats,
      lastCheck: recentReminders?.[0]?.sent_at || null,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to get notification status');
  }
}
