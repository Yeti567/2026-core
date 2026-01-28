/**
 * Notification Tracking API
 * 
 * POST: Track notification interactions (clicks, dismissals)
 * Requires authentication - users can only track their own notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const supabase = createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { notificationId, action, timestamp } = await req.json();
    
    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'Missing notificationId or action' },
        { status: 400 }
      );
    }
    
    // Verify the notification belongs to the authenticated user
    // This prevents users from tracking other users' notifications
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single();
    
    if (notifError || !notification) {
      // If notification doesn't exist, still allow tracking (might be deleted)
      // But log for security monitoring
      console.warn('[Notification Track] Notification not found:', notificationId);
    } else if (notification.user_id !== user.id) {
      // Prevent tracking other users' notifications
      return NextResponse.json(
        { error: 'Unauthorized to track this notification' },
        { status: 403 }
      );
    }
    
    // Log the interaction
    await supabase
      .from('notification_interactions')
      .insert({
        notification_id: notificationId,
        action: action,
        interacted_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      });
    
    console.log('[Notification Track]', notificationId, action);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Notification Track] Error:', error);
    // Don't fail for tracking errors
    return NextResponse.json({ success: true });
  }
}
