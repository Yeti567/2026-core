/**
 * Push Notification Unsubscribe API
 * 
 * POST: Remove or deactivate a push subscription
 * Requires authentication - users can only unsubscribe themselves
 */

import { NextRequest, NextResponse } from 'next/server';
import { createNeonWrapper } from '@/lib/db/neon-wrapper';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const supabase = createNeonWrapper();
    // TODO: Implement user authentication without Supabase
      const authResult: { data: { user: { id: string } | null }; error: Error | null } = { data: { user: null }, error: new Error('Auth not implemented') };
      const { data: { user }, error: authError } = authResult;
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { userId, endpoint } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    // Users can only unsubscribe themselves - prevent unauthorized unsubscriptions
    if (userId !== user.id) {
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
