/**
 * Push Notification Subscription Manager
 * 
 * Client-side functions to manage push notification subscriptions.
 */

'use client';

export interface PushSubscriptionResult {
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  userId: string
): Promise<PushSubscriptionResult> {
  // Check browser support
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'Service workers not supported' };
  }
  
  if (!('PushManager' in window)) {
    return { success: false, error: 'Push notifications not supported' };
  }
  
  if (!('Notification' in window)) {
    return { success: false, error: 'Notifications not supported' };
  }
  
  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: permission === 'denied' 
          ? 'Notification permission denied. Please enable in browser settings.'
          : 'Notification permission not granted'
      };
    }
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Already subscribed, updating backend');
      await saveSubscriptionToBackend(userId, subscription);
      return { success: true, subscription };
    }
    
    // Get VAPID public key
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
      return { success: false, error: 'Push notification configuration missing' };
    }
    
    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource
    });
    
    console.log('[Push] New subscription created:', subscription.endpoint);
    
    // Save subscription to backend
    await saveSubscriptionToBackend(userId, subscription);
    
    return { success: true, subscription };
    
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to subscribe'
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(
  userId: string
): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      await removeSubscriptionFromBackend(userId, subscription.endpoint);
      console.log('[Push] Unsubscribed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Push] Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Check current subscription status
 */
export async function getSubscriptionStatus(): Promise<{
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
}> {
  const result = {
    isSubscribed: false,
    permission: 'default' as NotificationPermission,
    subscription: null as PushSubscription | null
  };
  
  if (!('Notification' in window)) {
    return result;
  }
  
  result.permission = Notification.permission;
  
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      result.isSubscribed = !!subscription;
      result.subscription = subscription;
    } catch (error) {
      console.error('[Push] Failed to get subscription status:', error);
    }
  }
  
  return result;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Save subscription to backend
 */
async function saveSubscriptionToBackend(
  userId: string, 
  subscription: PushSubscription
): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      subscription: subscription.toJSON()
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save subscription');
  }
}

/**
 * Remove subscription from backend
 */
async function removeSubscriptionFromBackend(
  userId: string,
  endpoint: string
): Promise<void> {
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, endpoint })
  });
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    // Safe: i is a controlled loop index within bounds of rawData string and outputArray
    // eslint-disable-next-line security/detect-object-injection
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
