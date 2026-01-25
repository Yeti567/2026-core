'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { localDB, type LocalForm, type SyncQueueItem } from '@/lib/db/local-db';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

interface PendingItem {
  id: string | number;
  type: string;
  createdAt: string;
  status: string;
}

type IndicatorState = 'hidden' | 'syncing' | 'offline-pending' | 'offline-idle';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formats a date string to a human-readable relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Formats form type to display name
 */
function formatFormType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine the current indicator state
  const getState = useCallback((): IndicatorState => {
    if (isOnline && pendingCount === 0) return 'hidden';
    if (isOnline && pendingCount > 0) return 'syncing';
    if (!isOnline && pendingCount > 0) return 'offline-pending';
    return 'offline-idle'; // offline, no pending
  }, [isOnline, pendingCount]);

  const state = getState();

  // Fetch pending count and items from IndexedDB
  const fetchPendingData = useCallback(async () => {
    try {
      // Get pending sync count
      const counts = await localDB.getPendingSyncCount();
      setPendingCount(counts.total);

      // Get detailed pending items for the expanded view
      const [pendingForms, pendingQueue] = await Promise.all([
        localDB.forms
          .where('synced')
          .anyOf(['pending', 'failed', 'syncing'])
          .toArray(),
        localDB.sync_queue
          .where('status')
          .anyOf(['pending', 'failed', 'syncing'])
          .toArray(),
      ]);

      // Combine and format items
      const items: PendingItem[] = [
        ...pendingForms.map((form: LocalForm) => ({
          id: form.id,
          type: formatFormType(form.form_type),
          createdAt: form.created_at,
          status: form.synced,
        })),
        ...pendingQueue
          .filter((item: SyncQueueItem) => 
            !pendingForms.some((f: LocalForm) => f.id === item.local_record_id)
          )
          .map((item: SyncQueueItem) => ({
            id: item.id ?? item.local_record_id,
            type: formatFormType(item.type),
            createdAt: item.created_at,
            status: item.status,
          })),
      ].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setPendingItems(items);
    } catch (error) {
      console.error('[OfflineIndicator] Error fetching pending data:', error);
    }
  }, []);

  // Poll for updates every 2 seconds
  useEffect(() => {
    fetchPendingData();
    const interval = setInterval(fetchPendingData, 2000);
    return () => clearInterval(interval);
  }, [fetchPendingData]);

  // Control visibility with animation
  useEffect(() => {
    if (state === 'hidden') {
      // Delay hiding to allow slide-up animation
      const timeout = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timeout);
    } else {
      setIsVisible(true);
    }
  }, [state]);

  // Close expanded panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsExpanded(!isExpanded);
    }
    if (event.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  // Don't render anything if hidden and not visible
  if (!isVisible && state === 'hidden') {
    return null;
  }

  // Get styling based on state
  const getStateConfig = () => {
    switch (state) {
      case 'syncing':
        return {
          bgClass: 'bg-yellow-400',
          textClass: 'text-black',
          icon: '🔄',
          message: `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}...`,
          showPulse: true,
        };
      case 'offline-pending':
        return {
          bgClass: 'bg-red-600',
          textClass: 'text-white',
          icon: '📵',
          message: `Offline - ${pendingCount} item${pendingCount !== 1 ? 's' : ''} will sync when connected`,
          showPulse: false,
        };
      case 'offline-idle':
        return {
          bgClass: 'bg-orange-500',
          textClass: 'text-white',
          icon: '📵',
          message: "You're offline",
          showPulse: false,
        };
      default:
        return {
          bgClass: 'bg-gray-500',
          textClass: 'text-white',
          icon: '',
          message: '',
          showPulse: false,
        };
    }
  };

  const config = getStateConfig();

  return (
    <div
      ref={containerRef}
      className={`fixed top-0 left-0 right-0 z-[1000] transition-transform duration-300 ease-out ${
        state === 'hidden' ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{ position: 'sticky' }}
    >
      {/* Main Banner */}
      <div
        role="status"
        aria-live="polite"
        aria-expanded={isExpanded}
        tabIndex={0}
        onClick={() => pendingCount > 0 && setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        className={`
          h-12 flex items-center justify-center gap-2 
          ${config.bgClass} ${config.textClass}
          ${pendingCount > 0 ? 'cursor-pointer hover:opacity-95' : ''}
          transition-colors duration-200
          select-none
        `}
      >
        {/* Icon with optional pulse animation */}
        <span 
          className={`text-lg ${config.showPulse ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        >
          {config.icon}
        </span>
        
        {/* Message */}
        <span className="font-medium text-sm">
          {config.message}
        </span>

        {/* Expand indicator */}
        {pendingCount > 0 && (
          <span 
            className={`ml-2 text-xs transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          >
            ▼
          </span>
        )}

        {/* Syncing animation bar */}
        {config.showPulse && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20 overflow-hidden">
            <div className="h-full bg-black/30 animate-sync-progress" />
          </div>
        )}
      </div>

      {/* Expanded Details Panel */}
      <div
        className={`
          ${config.bgClass} ${config.textClass}
          overflow-hidden transition-all duration-300 ease-out
          ${isExpanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}
        `}
        aria-hidden={!isExpanded}
      >
        <div className="border-t border-black/10 px-4 py-3">
          {/* Pending Items List */}
          {pendingItems.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-2">
                Pending Items
              </p>
              {pendingItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-black/10"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className={`
                        w-2 h-2 rounded-full
                        ${item.status === 'syncing' ? 'bg-blue-400 animate-pulse' : ''}
                        ${item.status === 'pending' ? 'bg-yellow-300' : ''}
                        ${item.status === 'failed' ? 'bg-red-400' : ''}
                      `}
                      aria-label={`Status: ${item.status}`}
                    />
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <span className="text-xs opacity-70">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              ))}
              {pendingItems.length > 10 && (
                <p className="text-xs opacity-70 text-center mt-2">
                  +{pendingItems.length - 10} more items...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-center py-4 opacity-70">
              No pending items
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center pt-2 border-t border-black/10">
            <Link
              href="/admin/sync-status"
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg
                bg-black/20 hover:bg-black/30 
                transition-colors duration-200
                text-sm font-medium
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <span>📊</span>
              View Sync Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
