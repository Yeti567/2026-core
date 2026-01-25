'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { localDB, type SyncQueueItem, type QueueStatus } from '@/lib/db/local-db';

// =============================================================================
// TYPES
// =============================================================================

export interface SyncStatusCounts {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  abandoned: number;
  authFailed: number;
  total: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  itemId: number;
  itemType: string;
  oldStatus: QueueStatus;
  newStatus: QueueStatus;
  message?: string;
}

export interface UseSyncStatusReturn {
  /** Current counts by status */
  counts: SyncStatusCounts;
  /** Failed and abandoned items */
  failedItems: SyncQueueItem[];
  /** Recent sync log entries */
  recentLogs: SyncLogEntry[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
  /** Manually refresh data */
  refresh: () => Promise<void>;
  /** Add a log entry */
  addLogEntry: (entry: Omit<SyncLogEntry, 'id' | 'timestamp'>) => void;
  /** Clear logs */
  clearLogs: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to monitor sync status for the admin dashboard.
 * 
 * @param refreshInterval - How often to refresh data (default: 3000ms)
 * @param maxLogEntries - Maximum log entries to keep (default: 50)
 * @returns Sync status data and methods
 * 
 * @example
 * ```tsx
 * function SyncDashboard() {
 *   const { counts, failedItems, recentLogs, refresh } = useSyncStatus();
 *   
 *   return (
 *     <div>
 *       <span>Pending: {counts.pending}</span>
 *       <span>Failed: {counts.failed}</span>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncStatus(
  refreshInterval: number = 3000,
  maxLogEntries: number = 50
): UseSyncStatusReturn {
  const [counts, setCounts] = useState<SyncStatusCounts>({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    abandoned: 0,
    authFailed: 0,
    total: 0,
  });

  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<SyncLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const logIdCounter = useRef(0);

  // Add a log entry
  const addLogEntry = useCallback((entry: Omit<SyncLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: SyncLogEntry = {
      ...entry,
      id: `log-${++logIdCounter.current}`,
      timestamp: new Date(),
    };

    setRecentLogs(prev => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, maxLogEntries);
    });
  }, [maxLogEntries]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setRecentLogs([]);
  }, []);

  // Refresh data from IndexedDB
  const refresh = useCallback(async () => {
    try {
      // Get all items and count by status
      const allItems = await localDB.sync_queue.toArray();
      
      const newCounts: SyncStatusCounts = {
        pending: 0,
        syncing: 0,
        synced: 0,
        failed: 0,
        abandoned: 0,
        authFailed: 0,
        total: allItems.length,
      };

      for (const item of allItems) {
        switch (item.status) {
          case 'pending':
            newCounts.pending++;
            break;
          case 'syncing':
            newCounts.syncing++;
            break;
          case 'synced':
            newCounts.synced++;
            break;
          case 'failed':
            newCounts.failed++;
            break;
          case 'abandoned':
            newCounts.abandoned++;
            break;
          case 'auth_failed':
            newCounts.authFailed++;
            break;
        }
      }

      setCounts(newCounts);

      // Get failed items
      const failed = allItems.filter(item => 
        item.status === 'failed' || 
        item.status === 'abandoned' || 
        item.status === 'auth_failed'
      );
      setFailedItems(failed);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('[useSyncStatus] Error refreshing:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    refresh();

    if (refreshInterval > 0) {
      const intervalId = setInterval(refresh, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refresh, refreshInterval]);

  return {
    counts,
    failedItems,
    recentLogs,
    isLoading,
    lastRefresh,
    refresh,
    addLogEntry,
    clearLogs,
  };
}

/**
 * Simple hook that returns just the pending count.
 * Useful for showing badge counts in navigation.
 */
export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const pending = await localDB.getPendingSyncCount();
      setCount(pending.total);
    };

    updateCount();
    const intervalId = setInterval(updateCount, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  return count;
}
