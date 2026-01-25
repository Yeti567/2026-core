/**
 * Push Notification Send Functions
 * 
 * Server-side functions to send push notifications to users.
 */

import webPush from 'web-push';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// Configure web-push with VAPID details
if (process.env.VAPID_EMAIL && 
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && 
    process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// =============================================================================
// TYPES
// =============================================================================

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  tag?: string;
  notificationId?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

// =============================================================================
// SEND FUNCTIONS
// =============================================================================

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<SendResult> {
  const supabase = createRouteHandlerClient();
  
  // Get user's active subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (error) {
    console.error('[Push] Failed to fetch subscriptions:', error);
    return { sent: 0, failed: 0, errors: [error.message] };
  }
  
  if (!subscriptions || subscriptions.length === 0) {
    console.log('[Push] No active subscriptions for user:', userId);
    return { sent: 0, failed: 0, errors: [] };
  }
  
  return sendToSubscriptions(subscriptions, payload, supabase);
}

/**
 * Send push notification to all users in a company
 */
export async function sendPushToCompany(
  companyId: string,
  payload: PushNotificationPayload,
  options?: { 
    roles?: string[];
    excludeUserIds?: string[];
  }
): Promise<SendResult> {
  const supabase = createRouteHandlerClient();
  
  // Build query for company users
  let query = supabase
    .from('user_profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_active', true);
  
  if (options?.roles && options.roles.length > 0) {
    query = query.in('role', options.roles);
  }
  
  if (options?.excludeUserIds && options.excludeUserIds.length > 0) {
    query = query.not('id', 'in', `(${options.excludeUserIds.join(',')})`);
  }
  
  const { data: users, error: usersError } = await query;
  
  if (usersError || !users || users.length === 0) {
    return { sent: 0, failed: 0, errors: usersError ? [usersError.message] : [] };
  }
  
  const userIds = users.map(u => u.id);
  
  // Get all subscriptions for these users
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true);
  
  if (error || !subscriptions) {
    return { sent: 0, failed: 0, errors: error ? [error.message] : [] };
  }
  
  return sendToSubscriptions(subscriptions, payload, supabase);
}

/**
 * Send push notification to specific role(s) across all companies
 */
export async function sendPushToRole(
  roles: string[],
  payload: PushNotificationPayload
): Promise<SendResult> {
  const supabase = createRouteHandlerClient();
  
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id')
    .in('role', roles)
    .eq('is_active', true);
  
  if (!users || users.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }
  
  const userIds = users.map(u => u.id);
  
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true);
  
  if (!subscriptions) {
    return { sent: 0, failed: 0, errors: [] };
  }
  
  return sendToSubscriptions(subscriptions, payload, supabase);
}

/**
 * Internal function to send to multiple subscriptions
 */
async function sendToSubscriptions(
  subscriptions: any[],
  payload: PushNotificationPayload,
  supabase: ReturnType<typeof createRouteHandlerClient>
): Promise<SendResult> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Add notification ID if not provided
  const notificationPayload = {
    ...payload,
    notificationId: payload.notificationId || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  for (const subscription of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };
      
      await webPush.sendNotification(
        pushSubscription,
        JSON.stringify(notificationPayload)
      );
      
      // Update last_used_at
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', subscription.id);
      
      sent++;
      
    } catch (error: any) {
      console.error('[Push] Send failed:', error.message);
      
      // If subscription is expired or invalid, mark as inactive
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);
        
        errors.push(`Subscription ${subscription.id} expired`);
      } else {
        errors.push(error.message);
      }
      
      failed++;
    }
  }
  
  console.log(`[Push] Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed, errors };
}

/**
 * Log notification to database for tracking
 */
export async function logNotification(
  userId: string,
  companyId: string,
  payload: PushNotificationPayload,
  result: SendResult
): Promise<void> {
  const supabase = createRouteHandlerClient();
  
  await supabase
    .from('notification_logs')
    .insert({
      user_id: userId,
      company_id: companyId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      sent_count: result.sent,
      failed_count: result.failed,
      created_at: new Date().toISOString()
    });
}
