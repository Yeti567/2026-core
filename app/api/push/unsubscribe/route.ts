/**
 * Push Notification Unsubscribe API
 * 
 * POST: Remove or deactivate a push subscription
 * Requires authentication - users can only unsubscribe themselves
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/helpers';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createRouteHandlerClient();
    
    const { userId, endpoint } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    // Users can only unsubscribe themselves - prevent unauthorized unsubscriptions
    if (userId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only unsubscribe yourself' },
        { status: 403 }
      );
    }
    
    if (endpoint) {
      // Deactivate specific subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('endpoint', endpoint);
      
      if (error) {
        console.error('[Push Unsubscribe] Error:', error);
        return NextResponse.json(
          { error: 'Failed to unsubscribe' },
          { status: 500 }
        );
      }
    } else {
      // Deactivate all subscriptions for user
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId);
      
      if (error) {
        console.error('[Push Unsubscribe] Error:', error);
        return NextResponse.json(
          { error: 'Failed to unsubscribe' },
          { status: 500 }
        );
      }
    }
    
    console.log('[Push Unsubscribe] Unsubscribed user:', userId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
