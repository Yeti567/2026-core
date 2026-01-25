'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { localDB } from '@/lib/db/local-db';

export function PendingSyncBadge() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPending = async () => {
      try {
        const counts = await localDB.getPendingSyncCount();
        setPendingCount(counts.total);
      } catch (error) {
        console.error('[PendingSyncBadge] Error checking pending count:', error);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) return null;

  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
      {pendingCount} pending sync
    </Badge>
  );
}
