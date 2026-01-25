'use client';

/**
 * PWA Installation Detection Utilities
 * 
 * These functions help detect whether the app is installed as a PWA,
 * what device/platform is being used, and the current display mode.
 */

/**
 * Check if the PWA is installed and running in standalone mode
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if running as standalone app (Chrome, Firefox, Edge)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS standalone mode (Safari)
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  // Check fullscreen mode (some browsers use this for PWAs)
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }

  return false;
}

/**
 * Check if the current device is an iOS device
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
         !(window as any).MSStream;
}

/**
 * Check if the current device is an Android device
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
}

/**
 * Check if running in Safari browser on iOS
 */
export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isIOS = isIOSDevice();
  const isSafari = /Safari/.test(navigator.userAgent) && 
                   !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent);
  
  return isIOS && isSafari;
}

/**
 * Check if running in Chrome browser on iOS
 */
export function isIOSChrome(): boolean {
  if (typeof window === 'undefined') return false;
  
  return isIOSDevice() && /CriOS/.test(navigator.userAgent);
}

/**
 * Get the current PWA display mode
 */
export function getPWADisplayMode(): 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' {
  if (typeof window === 'undefined') return 'browser';

  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  return 'browser';
}

/**
 * Get device type (mobile, tablet, desktop)
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for tablets first
  if (/ipad/.test(userAgent) || 
      (/android/.test(userAgent) && !/mobile/.test(userAgent))) {
    return 'tablet';
  }
  
  // Check for mobile
  if (/iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|mobile/.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Get the platform/OS name
 */
export function getPlatform(): 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();
  
  if (isIOSDevice()) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  if (/windows/.test(userAgent)) return 'windows';
  if (/macintosh|mac os x/.test(userAgent)) return 'macos';
  if (/linux/.test(userAgent)) return 'linux';
  
  return 'unknown';
}

/**
 * Check if the browser supports PWA installation
 */
export function supportsPWAInstall(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for beforeinstallprompt event support (Chrome, Edge)
  if ('BeforeInstallPromptEvent' in window) {
    return true;
  }

  // iOS Safari supports Add to Home Screen
  if (isIOSSafari()) {
    return true;
  }

  return false;
}

/**
 * Check if service workers are supported
 */
export function supportsServiceWorker(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator;
}

/**
 * Check if push notifications are supported
 */
export function supportsPushNotifications(): boolean {
  if (typeof window === 'undefined') return false;
  return 'PushManager' in window && 'Notification' in window;
}

/**
 * Check if the app is running in a secure context (HTTPS)
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true;
}

/**
 * Listen for PWA display mode changes
 */
export function onDisplayModeChange(callback: (mode: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const modes = ['standalone', 'fullscreen', 'minimal-ui', 'browser'] as const;
  const cleanupFunctions: (() => void)[] = [];

  modes.forEach(mode => {
    const mediaQuery = window.matchMedia(`(display-mode: ${mode})`);
    
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        callback(mode);
      }
    };

    mediaQuery.addEventListener('change', handler);
    cleanupFunctions.push(() => mediaQuery.removeEventListener('change', handler));
  });

  return () => cleanupFunctions.forEach(fn => fn());
}

/**
 * Get comprehensive PWA status
 */
export function getPWAStatus() {
  return {
    isInstalled: isPWAInstalled(),
    displayMode: getPWADisplayMode(),
    deviceType: getDeviceType(),
    platform: getPlatform(),
    isIOS: isIOSDevice(),
    isAndroid: isAndroidDevice(),
    isIOSSafari: isIOSSafari(),
    supportsInstall: supportsPWAInstall(),
    supportsServiceWorker: supportsServiceWorker(),
    supportsPush: supportsPushNotifications(),
    isSecure: isSecureContext(),
  };
}
