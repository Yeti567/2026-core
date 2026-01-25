'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <WifiOff className="w-24 h-24 mx-auto text-orange-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>
        <p className="text-gray-600 mb-6">
          COR Pathways works offline! Your saved forms and data are still accessible. 
          New submissions will sync automatically when you reconnect.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
