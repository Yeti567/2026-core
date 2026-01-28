/**
 * Daily Cron Job API
 * 
 * Triggered by Vercel Cron or external scheduler.
 * Runs daily notification jobs.
 * 
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily",
 *     "schedule": "0 7 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyNotifications, cleanupOldSubscriptions } from '@/lib/cron/daily-notifications';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Verify authorization
  const authHeader = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') === 'true';
  
  // In production, CRON_SECRET must be set
  if (process.env.NODE_ENV === 'production' && !CRON_SECRET) {
    console.error('[Cron] CRON_SECRET not configured in production');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }
  
  // Verify authorization: either Bearer token matches CRON_SECRET OR it's from Vercel Cron
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // If no CRON_SECRET is set (development), allow Vercel Cron or warn
  if (!CRON_SECRET && !isVercelCron) {
    console.warn('[Cron] CRON_SECRET not set - allowing request (development only)');
  }

  console.log('[Cron] Daily job started at', new Date().toISOString());

  try {
    // Run daily notifications
    const notificationResults = await runDailyNotifications();
    
    // Cleanup old subscriptions
    const cleanupResults = await cleanupOldSubscriptions();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        notifications: notificationResults,
        cleanup: cleanupResults
      }
    });

  } catch (error) {
    return handleApiError(error, 'Cron job failed', 500, 'Daily cron job');
  }
}

// Also allow POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
