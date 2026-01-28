/**
 * Push Notification Subscribe API
 * 
 * POST: Save or update a push subscription for a user
 * Requires authentication - users can only subscribe themselves
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.userId;
    const companyId = user.companyId;
    
    const { subscription, userId: requestUserId } = await req.json();
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'Missing subscription' },
        { status: 400 }
      );
    }
    
    // Initialize database connection
    const supabase = createRouteHandlerClient();
    
    // Users can only subscribe themselves - prevent unauthorized subscriptions
    if (requestUserId && requestUserId !== userId) {
      return NextResponse.json(
        { error: 'You can only subscribe yourself' },
        { status: 403 }
      );
    }
    
    // Verify user exists
    const userProfileResult = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();
    
    const userProfile = userProfileResult.data;
    const userError = userProfileResult.error;
    
    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Detect device type and browser from User-Agent
    const userAgent = req.headers.get('user-agent') || '';
    const deviceType = detectDeviceType(userAgent);
    const browser = detectBrowser(userAgent);
    
    // Upsert subscription (update if exists, insert if new)
    const subscriptionResult = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        company_id: companyId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        device_type: deviceType,
        browser: browser,
        is_active: true,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      })
      .select('id, device_type, browser')
      .single();
    
    const data = subscriptionResult.data;
    const error = subscriptionResult.error;
    
    if (error || !data) {
      console.error('[Push Subscribe] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }
    
    console.log('[Push Subscribe] Subscription saved for user:', userId);
    
    return NextResponse.json({ 
      success: true, 
      subscription: {
        id: data.id,
        device_type: data.device_type,
        browser: data.browser
      }
    });
    
  } catch (error) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function detectDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function detectBrowser(userAgent: string): string {
  if (/edg/i.test(userAgent)) return 'edge';
  if (/chrome/i.test(userAgent)) return 'chrome';
  if (/firefox/i.test(userAgent)) return 'firefox';
  if (/safari/i.test(userAgent)) return 'safari';
  return 'unknown';
}
