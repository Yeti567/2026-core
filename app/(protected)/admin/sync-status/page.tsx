'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus, type NetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncStatus, type SyncLogEntry } from '@/hooks/useSyncStatus';
import { localDB, type SyncQueueItem } from '@/lib/db/local-db';
import { SyncEngine, type SyncNotification } from '@/lib/sync/sync-engine';
import Link from 'next/link';

// =============================================================================
// COMPONENTS
// =============================================================================

function NetworkIndicator({ status }: { status: NetworkStatus }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      status.isOnline 
        ? 'bg-emerald-500/20 text-emerald-400' 
        : 'bg-red-500/20 text-red-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        status.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
      }`} />
      {status.isOnline ? 'Online' : 'Offline'}
      {status.effectiveType && (
        <span className="text-xs opacity-70">({status.effectiveType})</span>
      )}
    </div>
  );
}

function StatCard({ 
  label, 
  count, 
  color, 
  icon 
}: { 
  label: string; 
  count: number; 
  color: 'yellow' | 'blue' | 'green' | 'red' | 'gray';
  icon: string;
}) {
  const colorClasses = {
    yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  return (
    // Safe: color is a typed prop from component's defined union type
    // eslint-disable-next-line security/detect-object-injection
    <div className={`card border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-70">{label}</p>
          <p className="text-3xl font-bold mt-1">{count}</p>
        </div>
        <div className="text-4xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    syncing: 'bg-blue-500/20 text-blue-400',
    synced: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-red-500/20 text-red-400',
    abandoned: 'bg-zinc-500/20 text-zinc-400',
    auth_failed: 'bg-purple-500/20 text-purple-400',
  };

  return (
    // Safe: status comes from database sync status values with fallback, not arbitrary user input
    // eslint-disable-next-line security/detect-object-injection
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[status] || 'bg-zinc-500/20 text-zinc-400'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function FailedItemsTable({ 
  items, 
  onRetry,
  isRetrying
}: { 
  items: SyncQueueItem[];
  onRetry: (id: number) => void;
  isRetrying: number | null;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted)]">
        <div className="text-4xl mb-2">✅</div>
        <p>No failed items</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">Type</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">Status</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">Error</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">Retries</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--muted)]">Last Attempt</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--muted)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--card)]">
              <td className="py-3 px-4">
                <span className="font-mono text-xs">{item.type}</span>
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={item.status} />
              </td>
              <td className="py-3 px-4">
                <span className="text-red-400 text-xs max-w-[200px] truncate block">
                  {item.last_error || '-'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="font-mono">{item.retry_count}/5</span>
              </td>
              <td className="py-3 px-4 text-[var(--muted)] text-xs">
                {item.last_retry_at 
                  ? new Date(item.last_retry_at).toLocaleString()
                  : '-'
                }
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => item.id && onRetry(item.id)}
                  disabled={isRetrying === item.id || item.status === 'auth_failed'}
                  className="btn text-xs px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying === item.id ? 'Retrying...' : 'Retry Now'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyncLog({ entries }: { entries: SyncLogEntry[] }) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted)]">
        <p>No sync events yet</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return '✅';
      case 'failed': return '❌';
      case 'abandoned': return '⛔';
      case 'auth_failed': return '🔐';
      case 'syncing': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <div 
      ref={logRef}
      className="font-mono text-xs space-y-1 max-h-[300px] overflow-y-auto"
    >
      {entries.map((entry) => (
        <div 
          key={entry.id}
          className="flex items-start gap-2 py-1 px-2 rounded hover:bg-[var(--background)]"
        >
          <span className="text-[var(--muted)] whitespace-nowrap">
            [{entry.timestamp.toLocaleTimeString()}]
          </span>
          <span className="text-blue-400">{entry.itemType}</span>
          <span className="text-[var(--muted)]">{entry.itemId}:</span>
          <span className="text-amber-400">{entry.oldStatus}</span>
          <span className="text-[var(--muted)]">→</span>
          <span className={
            entry.newStatus === 'synced' ? 'text-emerald-400' :
            entry.newStatus === 'failed' ? 'text-red-400' :
            entry.newStatus === 'abandoned' ? 'text-zinc-400' :
            'text-blue-400'
          }>
            {entry.newStatus}
          </span>
          <span>{getStatusIcon(entry.newStatus)}</span>
          {entry.message && (
            <span className="text-[var(--muted)] truncate">({entry.message})</span>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SyncStatusPage() {
  const network = useNetworkStatus();
  const { counts, failedItems, recentLogs, isLoading, lastRefresh, refresh, addLogEntry, clearLogs } = useSyncStatus(3000);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRetrying, setIsRetrying] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const syncEngineRef = useRef<SyncEngine | null>(null);

  // Update page title with pending count
  useEffect(() => {
    const pendingCount = counts.pending + counts.failed;
    document.title = pendingCount > 0 
      ? `(${pendingCount}) Sync Status - COR 2026`
      : 'Sync Status - COR 2026';
  }, [counts.pending, counts.failed]);

  // Initialize sync engine (server-only)
  useEffect(() => {
    // TODO: Initialize SyncEngine on server side only
    // For now, stub out client-side sync engine
    console.warn('SyncEngine not available on client side');
  }, []);

  // Force sync all
  const handleForceSync = useCallback(async () => {
    if (!syncEngineRef.current || isSyncing) return;

    setIsSyncing(true);
    try {
      const stats = await syncEngineRef.current.syncAll();
      console.log('Sync complete:', stats);
      await refresh();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refresh]);

  // Retry single item
  const handleRetry = useCallback(async (itemId: number) => {
    if (!syncEngineRef.current) return;

    setIsRetrying(itemId);
    try {
      await syncEngineRef.current.retryFailed(itemId);
      await refresh();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(null);
    }
  }, [refresh]);

  // Clear old synced items
  const handleClearOld = useCallback(async () => {
    setIsClearing(true);
    try {
      const cleared = await localDB.clearSyncedData(7);
      console.log('Cleared:', cleared);
      await refresh();
    } catch (error) {
      console.error('Clear failed:', error);
    } finally {
      setIsClearing(false);
    }
  }, [refresh]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Sync Status</h1>
            <p className="text-[var(--muted)]">
              Monitor and manage offline data synchronization
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NetworkIndicator status={network} />
            <Link href="/admin" className="btn border border-[var(--border)]">
              ← Back to Admin
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard 
            label="Pending" 
            count={counts.pending} 
            color="yellow" 
            icon="⏳" 
          />
          <StatCard 
            label="Syncing" 
            count={counts.syncing} 
            color="blue" 
            icon="🔄" 
          />
          <StatCard 
            label="Synced Today" 
            count={counts.synced} 
            color="green" 
            icon="✅" 
          />
          <StatCard 
            label="Failed" 
            count={counts.failed} 
            color="red" 
            icon="❌" 
          />
          <StatCard 
            label="Abandoned" 
            count={counts.abandoned} 
            color="gray" 
            icon="⛔" 
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleForceSync}
            disabled={isSyncing || !network.isOnline}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Syncing...
              </>
            ) : (
              <>🔄 Force Sync All</>
            )}
          </button>
          
          <button
            onClick={handleClearOld}
            disabled={isClearing}
            className="btn border border-[var(--border)] disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : '🗑️ Clear Old Synced Items'}
          </button>

          <button
            onClick={refresh}
            className="btn border border-[var(--border)]"
          >
            ↻ Refresh
          </button>

          {lastRefresh && (
            <span className="text-xs text-[var(--muted)] self-center">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Failed Items Table */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Failed Items</h2>
            <span className="badge badge-red">{failedItems.length}</span>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 text-[var(--muted)]">Loading...</div>
          ) : (
            <FailedItemsTable 
              items={failedItems} 
              onRetry={handleRetry}
              isRetrying={isRetrying}
            />
          )}
        </div>

        {/* Sync Log */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Sync Events</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted)]">
                {recentLogs.length} entries
              </span>
              <button
                onClick={clearLogs}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Clear
              </button>
            </div>
          </div>
          
          <SyncLog entries={recentLogs} />
        </div>

        {/* Help Text */}
        <div className="mt-8 text-sm text-[var(--muted)]">
          <p>
            <strong>Auto-refresh:</strong> This page refreshes every 3 seconds.
            Failed items will retry automatically with exponential backoff.
            Items are abandoned after 5 failed attempts.
          </p>
        </div>
      </div>
    </main>
  );
}
