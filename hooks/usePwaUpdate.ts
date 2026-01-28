'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_SNOOZE_MS = 60 * 60 * 1000;
const UPDATE_SNOOZE_KEY = 'cor_pwa_update_snooze_until';
const UPDATE_SUCCESS_KEY = 'cor_pwa_updated';

export type UpdateCheckReason = 'startup' | 'focus' | 'interval' | 'manual' | 'snooze-expired';

export interface UsePwaUpdateState {
  updateAvailable: boolean;
  shouldShowUpdate: boolean;
  isUpdating: boolean;
  showUpdatedToast: boolean;
  lastCheckedAt: number | null;
  versionLabel: string | null;
  updateNow: () => Promise<void>;
  dismissUpdate: () => void;
  checkForUpdate: (reason?: UpdateCheckReason) => Promise<void>;
}

export function usePwaUpdate(): UsePwaUpdateState {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const updateInProgressRef = useRef(false);
  const snoozeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const versionLabel = useMemo(() => {
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    return version && version.trim().length > 0 ? version : null;
  }, []);

  const supportsServiceWorker = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  const shouldShowUpdate = updateAvailable && (!snoozeUntil || Date.now() >= snoozeUntil);

  const logInfo = useCallback((message: string, context?: Record<string, unknown>) => {
    console.info(`[PWA Update] ${message}`, context ?? '');
  }, []);

  const logWarn = useCallback((message: string, context?: Record<string, unknown>) => {
    console.warn(`[PWA Update] ${message}`, context ?? '');
  }, []);

  const loadSnoozeState = useCallback(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(UPDATE_SNOOZE_KEY);
    if (!stored) return;
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      setSnoozeUntil(parsed);
    }
  }, []);

  const setSnoozeTimer = useCallback((until: number) => {
    if (snoozeTimeoutRef.current) {
      clearTimeout(snoozeTimeoutRef.current);
    }
    const delay = Math.max(until - Date.now(), 0);
    snoozeTimeoutRef.current = setTimeout(() => {
      checkForUpdate('snooze-expired').catch(() => undefined);
    }, delay);
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (process.env.NODE_ENV === 'development' || !supportsServiceWorker) return null;

    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) {
        setRegistration(existing);
        return existing;
      }
      const registered = await navigator.serviceWorker.register('/sw.js');
      logInfo('Service worker registered', { scope: registered.scope });
      setRegistration(registered);
      return registered;
    } catch (error) {
      logWarn('Service worker registration failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }, [logInfo, logWarn, supportsServiceWorker]);

  const markUpdateAvailable = useCallback((reg: ServiceWorkerRegistration) => {
    setRegistration(reg);
    setUpdateAvailable(true);
    logInfo('Update available');
  }, [logInfo]);

  const checkForUpdate = useCallback(async (reason: UpdateCheckReason = 'manual') => {
    if (process.env.NODE_ENV === 'development' || !supportsServiceWorker) return;
    if (!navigator.onLine) {
      logInfo('Skipped update check (offline)', { reason });
      return;
    }

    const reg = registration ?? await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    setLastCheckedAt(Date.now());
    logInfo('Checking for updates', { reason });

    try {
      await reg.update();
    } catch (error) {
      logWarn('Update check failed', {
        reason,
        error: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    if (reg.waiting) {
      markUpdateAvailable(reg);
    }
  }, [logInfo, logWarn, markUpdateAvailable, registration, supportsServiceWorker]);

  const updateNow = useCallback(async () => {
    if (!registration || process.env.NODE_ENV === 'development') return;
    if (!navigator.onLine) {
      logWarn('Update requested while offline');
      return;
    }

    const worker = registration.waiting ?? registration.installing;
    if (!worker) {
      logWarn('No waiting service worker found, re-checking');
      await checkForUpdate('manual');
      return;
    }

    updateInProgressRef.current = true;
    setIsUpdating(true);
    setUpdateAvailable(true);
    window.sessionStorage.setItem(UPDATE_SUCCESS_KEY, 'true');

    logInfo('Sending skip waiting + cache clear message');
    worker.postMessage({ type: 'SKIP_WAITING', clearCaches: true });
  }, [checkForUpdate, logInfo, logWarn, registration]);

  const dismissUpdate = useCallback(() => {
    const until = Date.now() + UPDATE_SNOOZE_MS;
    setSnoozeUntil(until);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(UPDATE_SNOOZE_KEY, String(until));
    }
    setSnoozeTimer(until);
    logInfo('Update prompt snoozed', { until });
  }, [logInfo, setSnoozeTimer]);

  useEffect(() => {
    loadSnoozeState();
  }, [loadSnoozeState]);

  useEffect(() => {
    if (!snoozeUntil || Date.now() >= snoozeUntil) return;
    setSnoozeTimer(snoozeUntil);
  }, [setSnoozeTimer, snoozeUntil]);

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development' || !supportsServiceWorker) {
      return;
    }

    const showUpdatedNotice = window.sessionStorage.getItem(UPDATE_SUCCESS_KEY) === 'true';
    if (showUpdatedNotice) {
      window.sessionStorage.removeItem(UPDATE_SUCCESS_KEY);
      setShowUpdatedToast(true);
      const timeout = setTimeout(() => setShowUpdatedToast(false), 2400);
      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [supportsServiceWorker]);

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development' || !supportsServiceWorker) {
      return;
    }

    let isMounted = true;

    registerServiceWorker().then((reg) => {
      if (!reg || !isMounted) return;

      if (reg.waiting) {
        markUpdateAvailable(reg);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            markUpdateAvailable(reg);
          }
        });
      });
    });

    const handleControllerChange = () => {
      if (!updateInProgressRef.current) return;
      logInfo('Service worker activated, reloading');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_ACTIVATED') {
        logInfo('Service worker activated', { timestamp: event.data?.timestamp });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    checkForUpdate('startup').catch(() => undefined);

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [checkForUpdate, logInfo, markUpdateAvailable, registerServiceWorker, supportsServiceWorker]);

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development' || !supportsServiceWorker) {
      return;
    }

    const scheduleIdleCheck = (reason: UpdateCheckReason) => {
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void })
          .requestIdleCallback(() => {
            checkForUpdate(reason).catch(() => undefined);
          }, { timeout: 2000 });
        return;
      }

      setTimeout(() => {
        checkForUpdate(reason).catch(() => undefined);
      }, 1000);
    };

    const handleFocus = () => scheduleIdleCheck('focus');
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleIdleCheck('focus');
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
      checkForUpdate('interval').catch(() => undefined);
    }, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [checkForUpdate, supportsServiceWorker]);

  useEffect(() => {
    return () => {
      if (snoozeTimeoutRef.current) {
        clearTimeout(snoozeTimeoutRef.current);
      }
    };
  }, []);

  return {
    updateAvailable,
    shouldShowUpdate,
    isUpdating,
    showUpdatedToast,
    lastCheckedAt,
    versionLabel,
    updateNow,
    dismissUpdate,
    checkForUpdate
  };
}
