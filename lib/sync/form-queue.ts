'use client';

import { localDB } from '@/lib/db/local-db';

/**
 * Simple form queue utility for offline-first form submissions.
 * Uses the existing localDB infrastructure.
 */

export interface QueuedForm {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

/**
 * Queue a form submission for syncing.
 * Will attempt immediate sync if online.
 */
export async function queueFormSubmission(formData: {
  company_id: string;
  worker_id?: string | null;
  form_type: string;
  form_data: Record<string, unknown>;
  photos?: Array<{
    id: string;
    data: string;
    mimeType: string;
    size: number;
    capturedAt: string;
  }>;
  signature_base64?: string | null;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
  } | null;
}): Promise<string> {
  // Create the form in local DB (automatically queues for sync)
  const formId = await localDB.createForm({
    company_id: formData.company_id,
    worker_id: formData.worker_id ?? null,
    form_type: formData.form_type,
    form_data: formData.form_data,
    photos: formData.photos?.map(p => ({
      ...p,
      filename: undefined,
      gps: undefined,
    })) ?? [],
    signature_base64: formData.signature_base64 ?? null,
    gps_coordinates: formData.gps_coordinates ?? null,
  });

  // Attempt immediate sync if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    // Don't await - let it run in background
    syncPendingForms().catch(console.error);

    // Also trigger service worker sync
    triggerBackgroundSync();
  }

  return formId;
}

/**
 * Sync all pending forms to the server.
 */
export async function syncPendingForms(): Promise<{
  synced: number;
  failed: number;
}> {
  const results = { synced: 0, failed: 0 };

  // Get pending queue items
  const pending = await localDB.getPendingQueueItems(20);
  const formItems = pending.filter(item => item.type === 'form_submission');

  for (const item of formItems) {
    try {
      // Update status to syncing
      await localDB.sync_queue.update(item.id!, { status: 'syncing' });
      await localDB.forms.update(item.local_record_id, { synced: 'syncing' });

      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        const data = await response.json();
        await localDB.markSyncCompleted(item.id!, data.id || item.local_record_id);
        results.synced++;
      } else {
        const errorText = await response.text();

        // Check for auth errors
        if (response.status === 401 || response.status === 403) {
          await localDB.sync_queue.update(item.id!, {
            status: 'auth_failed',
            last_error: 'Authentication required',
          });
          await localDB.forms.update(item.local_record_id, {
            synced: 'auth_failed',
            last_sync_error: 'Authentication required',
          });
        } else if (item.retry_count < 3) {
          await localDB.markSyncFailed(item.id!, errorText || `HTTP ${response.status}`);
        } else {
          // Max retries reached, mark as abandoned
          await localDB.sync_queue.update(item.id!, {
            status: 'abandoned',
            last_error: `Max retries reached: ${errorText}`,
          });
          await localDB.forms.update(item.local_record_id, {
            synced: 'abandoned',
            last_sync_error: `Max retries reached: ${errorText}`,
          });
        }
        results.failed++;
      }
    } catch (error) {
      console.error('[FormQueue] Sync failed for item:', item.id, error);

      if (item.retry_count < 3) {
        await localDB.markSyncFailed(
          item.id!,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      results.failed++;
    }
  }

  return results;
}

/**
 * Get count of pending forms
 */
export async function getPendingFormCount(): Promise<number> {
  const counts = await localDB.getPendingSyncCount();
  return counts.forms;
}

/**
 * Get all pending forms with their data
 */
export async function getPendingForms(companyId: string): Promise<QueuedForm[]> {
  const forms = await localDB.getUnsyncedForms(companyId);

  return forms.map(form => ({
    id: form.id,
    data: {
      company_id: form.company_id,
      worker_id: form.worker_id,
      form_type: form.form_type,
      form_data: form.form_data,
      photos: form.photos,
      signature_base64: form.signature_base64,
      gps_coordinates: form.gps_coordinates,
    },
    timestamp: new Date(form.created_at).getTime(),
    retryCount: form.sync_attempts,
  }));
}

/**
 * Delete a pending form (e.g., user wants to discard it)
 */
export async function deletePendingForm(formId: string): Promise<void> {
  await localDB.transaction('rw', [localDB.forms, localDB.sync_queue], async () => {
    await localDB.forms.delete(formId);
    await localDB.sync_queue.where('local_record_id').equals(formId).delete();
  });
}

/**
 * Retry a specific failed form
 */
export async function retryForm(formId: string): Promise<void> {
  await localDB.transaction('rw', [localDB.forms, localDB.sync_queue], async () => {
    // Reset form status
    await localDB.forms.update(formId, {
      synced: 'pending',
      last_sync_error: null,
    });

    // Reset queue item
    const queueItem = await localDB.sync_queue
      .where('local_record_id')
      .equals(formId)
      .first();

    if (queueItem) {
      await localDB.sync_queue.update(queueItem.id!, {
        status: 'pending',
        retry_count: 0,
        last_error: null,
        next_retry_at: null,
      });
    }
  });

  // Attempt sync
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    await syncPendingForms();
  }
}

/**
 * Trigger service worker background sync
 */
function triggerBackgroundSync(): void {
  if (typeof navigator === 'undefined' || process.env.NODE_ENV === 'development') return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if ('sync' in registration) {
        (registration as any).sync.register('sync-forms').catch(() => {
          // Background sync not supported
        });
      }
    }).catch(() => {
      // Service worker not ready
    });
  }
}

/**
 * Listen for online events and sync automatically
 */
export function setupAutoSync(): () => void {
  if (typeof window === 'undefined') return () => { };

  const handleOnline = () => {
    console.log('[FormQueue] Back online, syncing pending forms...');
    syncPendingForms().catch(console.error);
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
