'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // Already installed, don't show prompt
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 30) {
        return; // Don't show for 30 days after dismissal
      }
    }

    // For iOS, show after a delay
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
        setIsAnimating(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Listen for install prompt (Android/Desktop)
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => {
        setShowPrompt(true);
        setIsAnimating(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setShowPrompt(false);
    }, 300);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showPrompt) return null;

  return (
    <div 
      className={`
        fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 
        bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50
        transition-all duration-300 ease-out
        ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-[#0066CC] rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-gray-900 mb-1">
            Install COR Pathways
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Add to your home screen for quick access and offline use
          </p>

          {isIOS ? (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-600 mb-2">To install on iOS:</p>
              <ol className="text-xs text-gray-700 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  Tap the <strong>Share</strong> button
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  Select <strong>&quot;Add to Home Screen&quot;</strong>
                </li>
              </ol>
            </div>
          ) : null}

          <div className="flex gap-2">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="flex-1 bg-[#0066CC] hover:bg-[#0052a3] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Install App
              </button>
            )}
            <button
              onClick={handleDismiss}
              className={`${isIOS ? 'flex-1' : ''} border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
            >
              {isIOS ? 'Got It' : 'Not Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
