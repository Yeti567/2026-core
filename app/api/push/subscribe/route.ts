/**
 * Push Notification Subscribe API
 * 
 * POST: Save or update a push subscription for a user
 * Requires authentication - users can only subscribe themselves
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const supabase = createRouteHandlerClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { userId, subscription } = await req.json();
    
    if (!userId || !subscription) {
      return NextResponse.json(
        { error: 'Missing userId or subscription' },
        { status: 400 }
      );
    }
    
    // Users can only subscribe themselves - prevent unauthorized subscriptions
    if (userId !== authUser.id) {
      return NextResponse.json(
        { error: 'You can only subscribe yourself' },
        { status: 403 }
      );
    }
    
    // Verify user exists and get company
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();
    
    if (userError || !user) {
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
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        company_id: user.company_id,
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
      .select()
      .single();
    
    if (error) {
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
