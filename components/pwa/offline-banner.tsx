'use client';

import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNetworkStatus } from '@/hooks';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 rounded-none bg-amber-50 border-b-2 border-amber-500">
      <WifiOff className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-sm text-amber-800">
        You're offline. Forms will sync when reconnected.
      </AlertDescription>
    </Alert>
  );
}
