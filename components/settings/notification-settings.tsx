'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Monitor, 
  Check, 
  X, 
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications,
  getSubscriptionStatus,
  isPushSupported 
} from '@/lib/push-notifications/subscription';

interface NotificationSettingsProps {
  userId: string;
}

interface NotificationPreferences {
  push_cert_expiry: boolean;
  push_form_approval: boolean;
  push_audit_reminders: boolean;
  push_daily_safety: boolean;
  push_incidents: boolean;
  push_documents: boolean;
  push_training: boolean;
}

const defaultPreferences: NotificationPreferences = {
  push_cert_expiry: true,
  push_form_approval: true,
  push_audit_reminders: true,
  push_daily_safety: true,
  push_incidents: true,
  push_documents: true,
  push_training: true,
};

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isSupported, setIsSupported] = useState(true);

  // Check subscription status on mount
  useEffect(() => {
    async function checkStatus() {
      setIsSupported(isPushSupported());
      
      if (!isPushSupported()) {
        setIsLoading(false);
        return;
      }

      const status = await getSubscriptionStatus();
      setIsSubscribed(status.isSubscribed);
      setPermission(status.permission);
      setIsLoading(false);
    }
    
    checkStatus();
  }, []);

  // Toggle push notifications
  const handleToggle = useCallback(async () => {
    setIsToggling(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSubscribed) {
        await unsubscribeFromPushNotifications(userId);
        setIsSubscribed(false);
        setSuccess('Push notifications disabled');
      } else {
        const result = await subscribeToPushNotifications(userId);
        if (result.success) {
          setIsSubscribed(true);
          setSuccess('Push notifications enabled!');
          // Update permission state
          setPermission(Notification.permission);
        } else {
          setError(result.error || 'Failed to enable notifications');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsToggling(false);
    }
  }, [isSubscribed, userId]);

  // Send test notification
  const handleTestNotification = async () => {
    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success && data.result.sent > 0) {
        setSuccess('Test notification sent! Check your device.');
      } else {
        setError('No active subscriptions found. Please enable notifications first.');
      }
    } catch (err) {
      setError('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  // Toggle individual preference
  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      // Safe: key is constrained to keyof NotificationPreferences
      // eslint-disable-next-line security/detect-object-injection
      [key]: !prev[key]
    }));
    // TODO: Save to backend
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-200">Not Supported</h3>
            <p className="text-sm text-yellow-300/80 mt-1">
              Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-300">{success}</span>
        </div>
      )}

      {/* Permission Denied Warning */}
      {permission === 'denied' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-200">Notifications Blocked</h3>
              <p className="text-sm text-red-300/80 mt-1">
                You've blocked notifications for this site. To enable them, click the lock icon in your browser's address bar and allow notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Toggle */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-400" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                <BellOff className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div>
              <h3 className="font-medium text-white">Push Notifications</h3>
              <p className="text-sm text-slate-400">
                {isSubscribed 
                  ? 'You\'ll receive important updates' 
                  : 'Enable to get notified of important updates'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggle}
            disabled={isToggling || permission === 'denied'}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${isSubscribed ? 'bg-green-500' : 'bg-slate-600'}
              ${isToggling || permission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                ${isSubscribed ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
            {isToggling && (
              <Loader2 className="absolute inset-0 m-auto w-3 h-3 text-white animate-spin" />
            )}
          </button>
        </div>
      </div>

      {/* Notification Types */}
      {isSubscribed && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            Notification Types
          </h3>
          
          <div className="space-y-3">
            {[
              { key: 'push_cert_expiry' as const, label: 'Certification Expiry Alerts', icon: '📜' },
              { key: 'push_form_approval' as const, label: 'Form Approvals', icon: '📋' },
              { key: 'push_audit_reminders' as const, label: 'Audit Reminders', icon: '🔍' },
              { key: 'push_daily_safety' as const, label: 'Daily Safety Checks', icon: '👷' },
              { key: 'push_incidents' as const, label: 'Incident Alerts', icon: '🚨' },
              { key: 'push_documents' as const, label: 'Document Updates', icon: '📄' },
              { key: 'push_training' as const, label: 'Training Reminders', icon: '📚' },
            ].map(({ key, label, icon }) => {
              // Safe: key is from const array of known preference keys
              // eslint-disable-next-line security/detect-object-injection
              const isEnabled = preferences[key];
              return (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-300 flex items-center gap-2">
                  <span>{icon}</span>
                  {label}
                </span>
                <button
                  onClick={() => togglePreference(key)}
                  className={`
                    w-9 h-5 rounded-full transition-colors
                    ${isEnabled ? 'bg-blue-500' : 'bg-slate-600'}
                  `}
                >
                  <span
                    className={`
                      block w-3 h-3 rounded-full bg-white shadow-sm transition-transform mx-1
                      ${isEnabled ? 'translate-x-4' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Test Notification */}
      {isSubscribed && (
        <button
          onClick={handleTestNotification}
          disabled={isTesting}
          className="w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-medium text-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Send Test Notification
            </>
          )}
        </button>
      )}

      {/* Device Info */}
      {isSubscribed && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {/mobile/i.test(navigator.userAgent) ? (
              <Smartphone className="w-3 h-3" />
            ) : (
              <Monitor className="w-3 h-3" />
            )}
            <span>This device is subscribed</span>
          </div>
        </div>
      )}
    </div>
  );
}
