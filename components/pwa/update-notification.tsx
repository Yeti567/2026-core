'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
              setRegistration(reg);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <Card className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg z-50 bg-blue-50 border-2 border-blue-500">
      <div className="flex items-start gap-3">
        <Download className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Update Available</h3>
          <p className="text-xs text-gray-600 mb-3">
            A new version of COR Pathways is ready. Update now for the latest features and fixes.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleUpdate}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Update Now
            </Button>
            <Button 
              onClick={() => setShowUpdate(false)}
              size="sm"
              variant="outline"
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={() => setShowUpdate(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}
