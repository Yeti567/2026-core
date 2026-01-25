/**
 * Push Notifications Module
 * 
 * Central export for push notification functionality.
 */

// Client-side subscription management
export {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getSubscriptionStatus,
  isPushSupported,
  type PushSubscriptionResult
} from './subscription';

// Server-side send functions (only import in server components/API routes)
export {
  sendPushNotification,
  sendPushToCompany,
  sendPushToRole,
  logNotification,
  type PushNotificationPayload,
  type SendResult
} from './send';

// Notification triggers
export * from './triggers';
