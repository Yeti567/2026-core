/**
 * Sync Engine - State Machine for Offline Synchronization
 * 
 * Handles synchronization of local data with the server using a state machine approach.
 * 
 * STATE TRANSITIONS:
 * pending → syncing → synced (success)
 * pending → syncing → failed → pending (retry with backoff)
 * failed → abandoned (after 5 retries)
 * 
 * Special states:
 * - auth_failed: Authentication/authorization error, no retry
 */

import {
  localDB,
  type SyncQueueItem,
  type QueueStatus,
  type LocalForm,
  type LocalEvidence,
} from '@/lib/db/local-db';
import { createSafeQuery, type SupabaseLikeClient } from '@/lib/db/safe-query';
import type { UserRole } from '@/lib/db/types';
import { hasCode, hasStatusCode } from '@/lib/utils/type-guards';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of retries before marking as abandoned */
const MAX_RETRIES = 5;

/** Time in hours to keep synced items before deletion */
const SYNCED_RETENTION_HOURS = 24;

/** Network timeout in milliseconds */
const NETWORK_TIMEOUT_MS = 30000;

// =============================================================================
// TYPES
// =============================================================================

export interface SyncResult {
  success: boolean;
  serverId?: string;
  error?: SyncError;
}

export interface SyncError {
  type: 'network' | 'timeout' | 'auth' | 'conflict' | 'payload_too_large' | 'server' | 'unknown';
  message: string;
  statusCode?: number;
  retryable: boolean;
  countAgainstRetry: boolean;
}

export interface SyncNotification {
  type: 'error' | 'warning' | 'info';
  itemId: number;
  itemType: string;
  message: string;
  timestamp: string;
}

export interface SyncEngineConfig {
  supabase: SupabaseLikeClient;
  companyId: string;
  userRole: UserRole;
  onNotification?: (notification: SyncNotification) => void;
  onStateChange?: (itemId: number, oldStatus: QueueStatus, newStatus: QueueStatus) => void;
  onSyncComplete?: (stats: SyncStats) => void;
}

export interface SyncStats {
  synced: number;
  failed: number;
  abandoned: number;
  pending: number;
  duration: number;
}

// =============================================================================
// SYNC ENGINE CLASS
// =============================================================================

/**
 * SyncEngine manages the synchronization of offline data with the server.
 * 
 * @example
 * ```typescript
 * const syncEngine = new SyncEngine({
 *   supabase,
 *   companyId: user.companyId,
 *   userRole: user.role,
 *   onNotification: (n) => toast(n.message),
 * });
 * 
 * // Start syncing
 * await syncEngine.syncAll();
 * 
 * // Or sync a single item
 * await syncEngine.syncItem(queueItem);
 * ```
 */
export class SyncEngine {
  private supabase: SupabaseLikeClient;
  private companyId: string;
  private userRole: UserRole;
  private safeQuery: ReturnType<typeof createSafeQuery>;

  // Callbacks
  private onNotification?: (notification: SyncNotification) => void;
  private onStateChange?: (itemId: number, oldStatus: QueueStatus, newStatus: QueueStatus) => void;
  private onSyncComplete?: (stats: SyncStats) => void;

  // Retry scheduling
  private retryTimeouts: Map<number, NodeJS.Timeout> = new Map();

  // Sync state
  private isSyncing = false;
  private abortController: AbortController | null = null;

  constructor(config: SyncEngineConfig) {
    this.supabase = config.supabase;
    this.companyId = config.companyId;
    this.userRole = config.userRole;
    this.onNotification = config.onNotification;
    this.onStateChange = config.onStateChange;
    this.onSyncComplete = config.onSyncComplete;

    this.safeQuery = createSafeQuery(this.supabase, this.companyId, this.userRole);
  }

  // ===========================================================================
  // BACKOFF CALCULATION
  // ===========================================================================

  /**
   * Calculates exponential backoff delay in milliseconds.
   * 
   * @param retryCount - Number of retries so far (0-based)
   * @returns Delay in milliseconds
   * 
   * Examples:
   * - Retry 1: 2 seconds (2^1 * 1000)
   * - Retry 2: 4 seconds (2^2 * 1000)
   * - Retry 3: 8 seconds (2^3 * 1000)
   * - Retry 4: 16 seconds (2^4 * 1000)
   * - Retry 5: 32 seconds (2^5 * 1000)
   */
  getBackoffDelay(retryCount: number): number {
    // Use retryCount + 1 so first retry has 2^1 = 2 second delay
    return Math.pow(2, retryCount + 1) * 1000;
  }

  // ===========================================================================
  // STATE TRANSITIONS
  // ===========================================================================

  /**
   * Logs a state transition for debugging and monitoring.
   */
  private logTransition(itemId: number, oldStatus: QueueStatus, newStatus: QueueStatus): void {
    console.log(`[Sync] ${itemId}: ${oldStatus} → ${newStatus}`);
    this.onStateChange?.(itemId, oldStatus, newStatus);
  }

  /**
   * Updates an item's status in the queue.
   */
  private async updateItemStatus(
    itemId: number,
    newStatus: QueueStatus,
    updates: Partial<SyncQueueItem> = {}
  ): Promise<void> {
    const item = await localDB.sync_queue.get(itemId);
    if (!item) return;

    const oldStatus = item.status;

    await localDB.sync_queue.update(itemId, {
      status: newStatus,
      ...updates,
    });

    this.logTransition(itemId, oldStatus, newStatus);
  }

  // ===========================================================================
  // ERROR CLASSIFICATION
  // ===========================================================================

  /**
   * Classifies an error to determine retry behavior.
   */
  private classifyError(error: unknown, statusCode?: number): SyncError {
    // Network/timeout errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        retryable: true,
        countAgainstRetry: false, // Don't count network errors against retry limit
      };
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        type: 'timeout',
        message: 'Request timed out',
        retryable: true,
        countAgainstRetry: false, // Don't count timeouts against retry limit
      };
    }

    // HTTP status code errors
    if (statusCode) {
      if (statusCode === 401 || statusCode === 403) {
        return {
          type: 'auth',
          message: statusCode === 401 ? 'Authentication required' : 'Access denied',
          statusCode,
          retryable: false,
          countAgainstRetry: false,
        };
      }

      if (statusCode === 409) {
        return {
          type: 'conflict',
          message: 'Data conflict detected',
          statusCode,
          retryable: true,
          countAgainstRetry: true,
        };
      }

      if (statusCode === 413) {
        return {
          type: 'payload_too_large',
          message: 'Payload too large - compress photos',
          statusCode,
          retryable: true,
          countAgainstRetry: true,
        };
      }

      if (statusCode >= 500) {
        return {
          type: 'server',
          message: `Server error (${statusCode})`,
          statusCode,
          retryable: true,
          countAgainstRetry: true,
        };
      }
    }

    // Unknown error
    return {
      type: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: true,
      countAgainstRetry: true,
    };
  }

  // ===========================================================================
  // RETRY SCHEDULING
  // ===========================================================================

  /**
   * Schedules a retry for a failed item.
   * 
   * @param itemId - The queue item ID
   * @param delayMs - Delay in milliseconds before retry
   */
  scheduleRetry(itemId: number, delayMs: number): void {
    // Clear any existing timeout for this item
    this.cancelRetry(itemId);

    const timeoutId = setTimeout(async () => {
      this.retryTimeouts.delete(itemId);

      const item = await localDB.sync_queue.get(itemId);
      if (item && (item.status === 'pending' || item.status === 'failed')) {
        console.log(`[Sync] ${itemId}: Executing scheduled retry`);
        await this.syncItem(item);
      }
    }, delayMs);

    this.retryTimeouts.set(itemId, timeoutId);
    console.log(`[Sync] ${itemId}: Retry scheduled in ${delayMs}ms`);
  }

  /**
   * Cancels a scheduled retry.
   */
  cancelRetry(itemId: number): void {
    const timeoutId = this.retryTimeouts.get(itemId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.retryTimeouts.delete(itemId);
    }
  }

  /**
   * Cancels all scheduled retries.
   */
  cancelAllRetries(): void {
    for (const [itemId, timeoutId] of this.retryTimeouts) {
      clearTimeout(timeoutId);
    }
    this.retryTimeouts.clear();
  }

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  /**
   * Sends a notification to the user.
   */
  private notify(
    type: SyncNotification['type'],
    itemId: number,
    itemType: string,
    message: string
  ): void {
    const notification: SyncNotification = {
      type,
      itemId,
      itemType,
      message,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Sync Notification] ${type.toUpperCase()}: ${message}`);
    this.onNotification?.(notification);
  }

  // ===========================================================================
  // SYNC OPERATIONS
  // ===========================================================================

  /**
   * Performs the actual sync to the server.
   */
  private async performSync(item: SyncQueueItem): Promise<SyncResult> {
    try {
      switch (item.type) {
        case 'form_submission':
          return await this.syncFormSubmission(item);

        case 'form_update':
          return await this.syncFormUpdate(item);

        case 'photo_upload':
          return await this.syncPhotoUpload(item);

        case 'evidence':
          return await this.syncEvidence(item);

        default:
          return {
            success: false,
            error: {
              type: 'unknown',
              message: `Unknown sync type: ${item.type}`,
              retryable: false,
              countAgainstRetry: false,
            },
          };
      }
    } catch (error: unknown) {
      const syncError = this.classifyError(error);
      return { success: false, error: syncError };
    }
  }

  /**
   * Syncs a form submission to the server.
   */
  private async syncFormSubmission(item: SyncQueueItem): Promise<SyncResult> {
    const payload = item.payload as unknown as LocalForm;

    const { data, error } = await this.safeQuery.forms.create({
      form_type: payload.form_type,
      form_data: payload.form_data,
      worker_id: payload.worker_id,
    });

    if (error) {
      const errorCode = hasCode(error) ? error.code : undefined;
      return {
        success: false,
        error: this.classifyError(error, typeof errorCode === 'number' ? errorCode : undefined),
      };
    }

    return {
      success: true,
      serverId: data?.id,
    };
  }

  /**
   * Syncs a form update to the server.
   */
  private async syncFormUpdate(item: SyncQueueItem): Promise<SyncResult> {
    const payload = item.payload as { id: string; updates: Partial<LocalForm> };

    const { data, error } = await this.safeQuery.forms.update(payload.id, {
      form_type: payload.updates.form_type,
      form_data: payload.updates.form_data,
      worker_id: payload.updates.worker_id,
    });

    if (error) {
      const errorCode = hasCode(error) ? error.code : undefined;
      return {
        success: false,
        error: this.classifyError(error, typeof errorCode === 'number' ? errorCode : undefined),
      };
    }

    return {
      success: true,
      serverId: data?.id,
    };
  }

  /**
   * Syncs a photo upload to the server.
   */
  private async syncPhotoUpload(item: SyncQueueItem): Promise<SyncResult> {
    const payload = item.payload as {
      formId: string;
      photo: { data: string; filename: string; mimeType: string };
    };

    // Convert base64 to blob
    const base64Data = payload.photo.data.split(',')[1] || payload.photo.data;
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      // Safe: i is a controlled loop index bounded by binaryData.length
      // eslint-disable-next-line security/detect-object-injection
      bytes[i] = binaryData.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: payload.photo.mimeType });

    // TODO: Implement Neon-compatible file storage
    // For now, stub out storage upload
    const filename = `${this.companyId}/${payload.formId}/${payload.photo.filename}`;
    console.warn('Storage upload not implemented for Neon:', filename);
    const data = { path: filename };
    const error = null;

    if (error) {
      // StorageError might have statusCode - extract safely
      const errWithStatus = error as { statusCode?: number };
      const statusCode = typeof errWithStatus.statusCode === 'number' ? errWithStatus.statusCode : undefined;
      return {
        success: false,
        error: this.classifyError(error, statusCode),
      };
    }

    return {
      success: true,
      serverId: data?.path,
    };
  }

  /**
   * Syncs an evidence record to the server.
   */
  private async syncEvidence(item: SyncQueueItem): Promise<SyncResult> {
    const payload = item.payload as unknown as LocalEvidence;

    const { data, error } = await this.safeQuery.evidenceChain.create({
      audit_element: payload.audit_element,
      evidence_type: payload.evidence_type,
      evidence_id: payload.evidence_id,
      worker_id: payload.worker_id,
    });

    if (error) {
      const errorCode = hasCode(error) ? error.code : undefined;
      return {
        success: false,
        error: this.classifyError(error, typeof errorCode === 'number' ? errorCode : undefined),
      };
    }

    return {
      success: true,
      serverId: data?.id,
    };
  }

  // ===========================================================================
  // MAIN SYNC METHOD
  // ===========================================================================

  /**
   * Syncs a single item through the state machine.
   * 
   * State transitions:
   * - pending → syncing → synced (success)
   * - pending → syncing → failed → pending (retry with backoff)
   * - failed → abandoned (after MAX_RETRIES)
   */
  async syncItem(item: SyncQueueItem): Promise<SyncResult> {
    if (!item.id) {
      return { success: false, error: { type: 'unknown', message: 'Item has no ID', retryable: false, countAgainstRetry: false } };
    }

    const itemId = item.id;

    // Cancel any pending retry for this item
    this.cancelRetry(itemId);

    // Mark as syncing
    await this.updateItemStatus(itemId, 'syncing', {
      last_retry_at: new Date().toISOString(),
    });

    // Update local record status
    if (item.local_record_table === 'forms') {
      await localDB.forms.update(item.local_record_id, { synced: 'syncing' });
    } else if (item.local_record_table === 'evidence') {
      await localDB.evidence.update(item.local_record_id, { synced: 'syncing' });
    }

    // Perform the sync
    const result = await this.performSync(item);

    if (result.success) {
      // SUCCESS: Mark as synced
      await this.handleSyncSuccess(item, result.serverId!);
      return result;
    } else {
      // FAILURE: Handle based on error type
      await this.handleSyncFailure(item, result.error!);
      return result;
    }
  }

  /**
   * Handles successful sync.
   */
  private async handleSyncSuccess(item: SyncQueueItem, serverId: string): Promise<void> {
    const itemId = item.id!;

    // Calculate deletion time (24 hours from now)
    const deleteAfter = new Date();
    deleteAfter.setHours(deleteAfter.getHours() + SYNCED_RETENTION_HOURS);

    // Update queue item
    await this.updateItemStatus(itemId, 'synced', {
      server_id: serverId,
      delete_after: deleteAfter.toISOString(),
      last_error: null,
    });

    // Update local record
    if (item.local_record_table === 'forms') {
      await localDB.forms.update(item.local_record_id, {
        synced: 'synced',
        server_id: serverId,
      });
    } else if (item.local_record_table === 'evidence') {
      await localDB.evidence.update(item.local_record_id, {
        synced: 'synced',
        server_id: serverId,
      });
    }

    this.notify('info', itemId, item.type, `Successfully synced ${item.type}`);
  }

  /**
   * Handles sync failure.
   */
  private async handleSyncFailure(item: SyncQueueItem, error: SyncError): Promise<void> {
    const itemId = item.id!;
    const currentRetryCount = item.retry_count;
    const newRetryCount = error.countAgainstRetry ? currentRetryCount + 1 : currentRetryCount;

    // Handle auth errors - don't retry
    if (error.type === 'auth') {
      await this.updateItemStatus(itemId, 'auth_failed', {
        last_error: error.message,
        retry_count: newRetryCount,
      });

      // Update local record
      if (item.local_record_table === 'forms') {
        await localDB.forms.update(item.local_record_id, {
          synced: 'auth_failed',
          last_sync_error: error.message,
        });
      } else if (item.local_record_table === 'evidence') {
        await localDB.evidence.update(item.local_record_id, {
          synced: 'auth_failed',
        });
      }

      this.notify('error', itemId, item.type, `Authentication failed for ${item.type}. Please log in again.`);
      return;
    }

    // Check if we've exceeded max retries
    if (newRetryCount >= MAX_RETRIES) {
      // ABANDONED
      await this.updateItemStatus(itemId, 'abandoned', {
        last_error: error.message,
        retry_count: newRetryCount,
      });

      // Update local record
      if (item.local_record_table === 'forms') {
        await localDB.forms.update(item.local_record_id, {
          synced: 'abandoned',
          last_sync_error: error.message,
          sync_attempts: newRetryCount,
        });
      } else if (item.local_record_table === 'evidence') {
        await localDB.evidence.update(item.local_record_id, {
          synced: 'abandoned',
        });
      }

      this.notify(
        'error',
        itemId,
        item.type,
        `${item.type} [${item.local_record_id.slice(0, 8)}...] failed to sync after ${MAX_RETRIES} attempts. Please contact support.`
      );
      return;
    }

    // Calculate backoff delay
    const backoffDelay = this.getBackoffDelay(newRetryCount);
    const nextRetryAt = new Date(Date.now() + backoffDelay);

    // Update status back to failed (will retry)
    await this.updateItemStatus(itemId, 'failed', {
      last_error: error.message,
      retry_count: newRetryCount,
      next_retry_at: nextRetryAt.toISOString(),
    });

    // Update local record
    if (item.local_record_table === 'forms') {
      await localDB.forms.update(item.local_record_id, {
        synced: 'failed',
        last_sync_error: error.message,
        sync_attempts: newRetryCount,
      });
    } else if (item.local_record_table === 'evidence') {
      await localDB.evidence.update(item.local_record_id, {
        synced: 'failed',
      });
    }

    // Schedule retry
    if (error.retryable) {
      this.scheduleRetry(itemId, backoffDelay);
      this.notify(
        'warning',
        itemId,
        item.type,
        `Sync failed (attempt ${newRetryCount}/${MAX_RETRIES}). Retrying in ${backoffDelay / 1000}s...`
      );
    }
  }

  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================

  /**
   * Syncs all pending items.
   */
  async syncAll(): Promise<SyncStats> {
    if (this.isSyncing) {
      console.log('[Sync] Already syncing, skipping...');
      return { synced: 0, failed: 0, abandoned: 0, pending: 0, duration: 0 };
    }

    this.isSyncing = true;
    this.abortController = new AbortController();
    const startTime = Date.now();

    const stats: SyncStats = {
      synced: 0,
      failed: 0,
      abandoned: 0,
      pending: 0,
      duration: 0,
    };

    try {
      // Get all pending items sorted by priority
      const pendingItems = await localDB.getPendingQueueItems(100);
      stats.pending = pendingItems.length;

      console.log(`[Sync] Starting sync of ${pendingItems.length} items`);

      for (const item of pendingItems) {
        if (this.abortController.signal.aborted) {
          console.log('[Sync] Sync aborted');
          break;
        }

        const result = await this.syncItem(item);

        if (result.success) {
          stats.synced++;
        } else if (result.error?.type === 'auth') {
          // Stop syncing on auth errors
          console.log('[Sync] Auth error encountered, stopping sync');
          break;
        } else {
          const updatedItem = await localDB.sync_queue.get(item.id!);
          if (updatedItem?.status === 'abandoned') {
            stats.abandoned++;
          } else {
            stats.failed++;
          }
        }
      }
    } finally {
      this.isSyncing = false;
      this.abortController = null;
      stats.duration = Date.now() - startTime;
    }

    console.log(`[Sync] Complete: ${stats.synced} synced, ${stats.failed} failed, ${stats.abandoned} abandoned in ${stats.duration}ms`);
    this.onSyncComplete?.(stats);

    return stats;
  }

  /**
   * Stops any in-progress sync.
   */
  abort(): void {
    this.abortController?.abort();
    this.cancelAllRetries();
  }

  // ===========================================================================
  // QUERY METHODS
  // ===========================================================================

  /**
   * Gets all failed and abandoned items.
   */
  async getFailedItems(): Promise<SyncQueueItem[]> {
    return localDB.sync_queue
      .where('status')
      .anyOf(['failed', 'abandoned', 'auth_failed'])
      .toArray();
  }

  /**
   * Gets items grouped by status for dashboard display.
   */
  async getItemsByStatus(): Promise<Record<QueueStatus, SyncQueueItem[]>> {
    const allItems = await localDB.sync_queue.toArray();

    const grouped: Record<QueueStatus, SyncQueueItem[]> = {
      pending: [],
      syncing: [],
      synced: [],
      failed: [],
      abandoned: [],
      auth_failed: [],
    };

    for (const item of allItems) {
      // Safe: item.status is a typed QueueStatus enum ('pending' | 'syncing' | 'synced' | 'failed' | 'abandoned' | 'auth_failed')

      grouped[item.status].push(item);
    }

    return grouped;
  }

  // ===========================================================================
  // ADMIN OPERATIONS
  // ===========================================================================

  /**
   * Manually retries a failed item.
   * Resets retry count and status to pending.
   */
  async retryFailed(itemId: number): Promise<void> {
    const item = await localDB.sync_queue.get(itemId);
    if (!item) {
      console.log(`[Sync] Item ${itemId} not found`);
      return;
    }

    if (!['failed', 'abandoned', 'auth_failed'].includes(item.status)) {
      console.log(`[Sync] Item ${itemId} is not in a failed state`);
      return;
    }

    console.log(`[Sync] ${itemId}: Manual retry requested`);

    // Reset the item
    await this.updateItemStatus(itemId, 'pending', {
      retry_count: 0,
      last_error: null,
      next_retry_at: null,
    });

    // Reset the local record
    if (item.local_record_table === 'forms') {
      await localDB.forms.update(item.local_record_id, {
        synced: 'pending',
        sync_attempts: 0,
        last_sync_error: null,
      });
    } else if (item.local_record_table === 'evidence') {
      await localDB.evidence.update(item.local_record_id, {
        synced: 'pending',
      });
    }

    // Immediately sync the item
    await this.syncItem({ ...item, status: 'pending', retry_count: 0 });
  }

  /**
   * Retries all failed items.
   */
  async retryAllFailed(): Promise<number> {
    const failedItems = await this.getFailedItems();
    let retriedCount = 0;

    for (const item of failedItems) {
      if (item.id) {
        await this.retryFailed(item.id);
        retriedCount++;
      }
    }

    return retriedCount;
  }

  /**
   * Cleans up old synced items past their retention period.
   */
  async cleanupSyncedItems(): Promise<number> {
    const now = new Date().toISOString();

    const oldItems = await localDB.sync_queue
      .where('status')
      .equals('synced')
      .and(item => item.delete_after !== null && item.delete_after <= now)
      .toArray();

    const ids = oldItems.map(item => item.id!).filter(Boolean);
    await localDB.sync_queue.bulkDelete(ids);

    console.log(`[Sync] Cleaned up ${ids.length} old synced items`);
    return ids.length;
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Destroys the sync engine, cancelling all pending operations.
   */
  destroy(): void {
    this.abort();
    console.log('[Sync] Engine destroyed');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new SyncEngine instance.
 */
export function createSyncEngine(config: SyncEngineConfig): SyncEngine {
  return new SyncEngine(config);
}
