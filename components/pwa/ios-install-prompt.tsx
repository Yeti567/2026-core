'use client';

import { useState, useEffect } from 'react';
import { X, Share2, Plus, ArrowDown } from 'lucide-react';

/**
 * iOS-specific install prompt with Safari instructions
 */
export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS Safari
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                        !(window as any).MSStream;
    
    // Check if already installed as PWA
    const isInStandaloneMode = ('standalone' in window.navigator) && 
                               (window.navigator as any).standalone === true;
    
    // Check if using Chrome on iOS (different install flow)
    const isChromeIOS = /CriOS/.test(navigator.userAgent);

    setIsIOS(isIOSDevice);

    if (isIOSDevice && !isInStandaloneMode && !isChromeIOS) {
      // Check if user dismissed before
      const dismissed = localStorage.getItem('ios-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      // Show after 30 days or if never dismissed
      if (!dismissed || daysSinceDismissed > 30) {
        // Show after 5 seconds to not be intrusive
        const timer = setTimeout(() => setShowPrompt(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
  };

  // Don't render for non-iOS or if prompt is hidden
  if (!isIOS || !showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1001] animate-in slide-in-from-bottom duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm -z-10"
        onClick={handleDismiss}
      />
      
      {/* Prompt Card */}
      <div className="bg-white rounded-t-3xl shadow-2xl safe-area-bottom">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pb-8 pt-2">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
              <img 
                src="/icons/icon-192x192.png" 
                alt="COR Pathways" 
                className="w-full h-full"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Install COR Pathways
              </h2>
              <p className="text-sm text-gray-500">
                Add to your home screen for the best experience
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="flex gap-4 mb-6">
            {[
              { icon: '⚡', label: 'Faster' },
              { icon: '📴', label: 'Works Offline' },
              { icon: '🔔', label: 'Notifications' },
            ].map(({ icon, label }) => (
              <div 
                key={label}
                className="flex-1 flex flex-col items-center gap-1 py-3 bg-gray-50 rounded-xl"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-3 text-sm">
              To install, follow these steps:
            </h3>
            
            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Tap the <strong>Share</strong> button in Safari
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <ArrowDown className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">at the bottom of Safari</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-white rounded-lg shadow-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700">Add to Home Screen</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Tap <strong>&quot;Add&quot;</strong> in the top right corner
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium text-sm transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
