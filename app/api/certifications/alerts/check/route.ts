import { NextRequest, NextResponse } from 'next/server';
import { authenticateServerComponent } from '@/lib/auth/jwt-middleware';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import {
  checkExpiringCertifications,
  getAlertsSummary,
  createAlertRecord,
  markAlertSent,
  type ExpiryAlert,
} from '@/lib/certifications/expiry-alerts';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/certifications/alerts/check - Check for expiring certifications
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    // Check for expiring certifications
    const { alerts, byThreshold } = await checkExpiringCertifications(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      profile.company_id
    );

    const summary = getAlertsSummary(alerts);

    return NextResponse.json({
      alerts,
      byThreshold: {
        sixtyDays: byThreshold.sixtyDays.length,
        thirtyDays: byThreshold.thirtyDays.length,
        sevenDays: byThreshold.sevenDays.length,
        expired: byThreshold.expired.length,
      },
      summary,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking expiring certifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/certifications/alerts/check - Run alert check and mark alerts sent
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    // Only admins can trigger alert processing
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { markAsSent = false, sendEmails = false } = body;

    // Check for expiring certifications
    const { alerts, byThreshold } = await checkExpiringCertifications(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      profile.company_id
    );

    const results = {
      processed: 0,
      alertsCreated: 0,
      emailsSent: 0,
      errors: [] as string[],
    };

    // Process alerts
    for (const alert of alerts) {
      try {
        // Create alert record
        await createAlertRecord(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          alert,
          {
            workerEmail: alert.workerEmail,
            supervisorEmail: null, // Would need to look up supervisor
            safetyManagerEmails: [], // Would need to look up safety managers
          },
          markAsSent ? 'sent' : 'pending'
        );
        results.alertsCreated++;

        // Mark as sent in certifications table
        if (markAsSent) {
          await markAlertSent(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            alert.certificationId,
            alert.alertType
          );
        }

        // TODO: Implement email sending when email service is configured
        // if (sendEmails) {
        //   await sendAlertEmail(alert);
        //   results.emailsSent++;
        // }

        results.processed++;
      } catch (err) {
        console.error('Error processing alert:', err);
        results.errors.push(`Failed to process alert for ${alert.workerName}: ${alert.certificationName}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: getAlertsSummary(alerts),
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
