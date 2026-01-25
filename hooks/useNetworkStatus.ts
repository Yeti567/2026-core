'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether we've confirmed connectivity with a real request */
  isConnected: boolean;
  /** Time of last connectivity check */
  lastChecked: Date | null;
  /** Connection type if available (e.g., 'wifi', '4g') */
  connectionType: string | null;
  /** Effective connection type (e.g., 'slow-2g', '4g') */
  effectiveType: string | null;
  /** Estimated downlink speed in Mbps */
  downlink: number | null;
  /** Estimated round-trip time in ms */
  rtt: number | null;
}

interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: EventListener;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Hook to monitor network connectivity status.
 * 
 * @param pingUrl - Optional URL to ping for connectivity verification
 * @param pingInterval - How often to verify connectivity (default: 30000ms)
 * @returns NetworkStatus object
 * 
 * @example
 * ```tsx
 * function App() {
 *   const network = useNetworkStatus();
 *   
 *   return (
 *     <div>
 *       {network.isOnline ? '🟢 Online' : '🔴 Offline'}
 *       {network.effectiveType && <span>({network.effectiveType})</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNetworkStatus(
  pingUrl?: string,
  pingInterval: number = 30000
): NetworkStatus {
  // Always start as online to prevent hydration mismatch
  // The real status will be detected in useEffect after mount
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isConnected: true,
    lastChecked: null,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
  });

  // Get connection info from Network Information API
  const getConnectionInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return {};

    const connection = navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (!connection) return {};

    return {
      connectionType: connection.type || null,
      effectiveType: connection.effectiveType || null,
      downlink: connection.downlink || null,
      rtt: connection.rtt || null,
    };
  }, []);

  // Update status with current values
  const updateStatus = useCallback((online: boolean, connected?: boolean) => {
    setStatus(prev => ({
      ...prev,
      isOnline: online,
      isConnected: connected ?? online,
      lastChecked: new Date(),
      ...getConnectionInfo(),
    }));
  }, [getConnectionInfo]);

  // Verify connectivity with a real request
  const verifyConnectivity = useCallback(async () => {
    if (!pingUrl) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      updateStatus(true, response.ok);
    } catch {
      updateStatus(navigator.onLine, false);
    }
  }, [pingUrl, updateStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle online/offline events
    const handleOnline = () => {
      updateStatus(true);
      if (pingUrl) verifyConnectivity();

      // Trigger background sync when coming back online
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            (registration as any).sync.register('sync-forms').catch(() => {
              // Background sync not supported or failed to register
            });
            (registration as any).sync.register('sync-certifications').catch(() => {
              // Background sync not supported or failed to register
            });
          }
        }).catch(() => {
          // Service worker not ready
        });
      }
    };

    const handleOffline = () => {
      updateStatus(false, false);
    };

    // Handle connection change
    const handleConnectionChange = () => {
      setStatus(prev => ({
        ...prev,
        ...getConnectionInfo(),
      }));
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API
    const connection = navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial check
    updateStatus(navigator.onLine);
    if (pingUrl && navigator.onLine) {
      verifyConnectivity();
    }

    // Periodic connectivity check
    let intervalId: NodeJS.Timeout | null = null;
    if (pingUrl && pingInterval > 0) {
      intervalId = setInterval(() => {
        if (navigator.onLine) {
          verifyConnectivity();
        }
      }, pingInterval);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }

      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pingUrl, pingInterval, updateStatus, verifyConnectivity, getConnectionInfo]);

  return status;
}

/**
 * Simple hook that just returns online/offline boolean.
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}
