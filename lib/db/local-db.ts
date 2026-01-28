/**
 * Local IndexedDB Database for Offline Storage
 * 
 * Uses Dexie.js for a clean, Promise-based API over IndexedDB.
 * Stores forms, evidence, and sync queue for offline-first functionality.
 */

import Dexie, { type EntityTable } from 'dexie';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * GPS coordinates for geotagging
 */
export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp: number;
}

/**
 * Photo metadata for form attachments
 */
export interface PhotoAttachment {
  id: string;
  /** Base64-encoded image data */
  data: string;
  /** MIME type (e.g., 'image/jpeg') */
  mimeType: string;
  /** Original filename */
  filename?: string;
  /** File size in bytes */
  size: number;
  /** When the photo was taken/added */
  capturedAt: string;
  /** GPS coordinates if available */
  gps?: GPSCoordinates;
}

/**
 * Sync status for records
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'abandoned' | 'auth_failed';

/**
 * Sync queue item status
 */
export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'abandoned' | 'auth_failed';

/**
 * Sync queue item types
 */
export type SyncItemType = 'form_submission' | 'form_update' | 'photo_upload' | 'evidence';

/**
 * Priority levels for sync queue
 */
export type SyncPriority = 1 | 2 | 3 | 4 | 5; // 1 = highest, 5 = lowest

// =============================================================================
// TABLE INTERFACES
// =============================================================================

/**
 * Local form record for offline storage
 */
export interface LocalForm {
  /** UUID - can be client-generated for offline creation */
  id: string;
  /** Company ID for tenant isolation */
  company_id: string;
  /** Associated worker ID */
  worker_id: string | null;
  /** Form type identifier (e.g., 'safety_inspection', 'incident_report') */
  form_type: string;
  /** Form data as JSON */
  form_data: Record<string, unknown>;
  /** Attached photos */
  photos: PhotoAttachment[];
  /** Signature as base64-encoded PNG */
  signature_base64: string | null;
  /** GPS coordinates where form was completed */
  gps_coordinates: GPSCoordinates | null;
  /** Sync status */
  synced: SyncStatus;
  /** Server-side ID after sync (may differ from local ID) */
  server_id: string | null;
  /** When the form was created locally */
  created_at: string;
  /** When the form was last modified */
  updated_at: string;
  /** Number of sync attempts */
  sync_attempts: number;
  /** Last sync error message */
  last_sync_error: string | null;
}

/**
 * Local evidence chain record for offline storage
 */
export interface LocalEvidence {
  /** UUID - can be client-generated for offline creation */
  id: string;
  /** Company ID for tenant isolation */
  company_id: string;
  /** Audit element reference */
  audit_element: string;
  /** Type of evidence */
  evidence_type: string;
  /** Reference to the evidence source (form ID, document ID, etc.) */
  evidence_id: string | null;
  /** Associated worker ID */
  worker_id: string | null;
  /** Associated jobsite ID */
  jobsite_id: string | null;
  /** When the evidence was recorded */
  timestamp: string;
  /** Sync status */
  synced: SyncStatus;
  /** Server-side ID after sync */
  server_id: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Sync queue item for background synchronization
 */
export interface SyncQueueItem {
  /** Auto-incremented ID */
  id?: number;
  /** Type of item to sync */
  type: SyncItemType;
  /** The payload to sync (serialized record) */
  payload: Record<string, unknown>;
  /** Sync priority (1 = highest) */
  priority: SyncPriority;
  /** Current status */
  status: QueueStatus;
  /** When the item was queued (timestamp) */
  created_at: string;
  /** Number of retry attempts */
  retry_count: number;
  /** Last error message */
  last_error: string | null;
  /** When to retry next (for exponential backoff) */
  next_retry_at: string | null;
  /** Timestamp of last retry attempt */
  last_retry_at: string | null;
  /** Reference to the local record ID */
  local_record_id: string;
  /** Reference to the local record table */
  local_record_table: 'forms' | 'evidence';
  /** Server ID after successful sync */
  server_id: string | null;
  /** Scheduled for deletion after sync (ISO timestamp) */
  delete_after: string | null;
}

// =============================================================================
// LIBRARY CACHE INTERFACES
// =============================================================================

/**
 * Cached hazard library item
 */
export interface CachedHazard {
  id: string;
  company_id: string | null;
  hazard_code: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  applicable_trades: string[];
  default_severity: number;
  default_likelihood: number;
  default_risk_level: string;
  recommended_controls: Record<string, unknown>[];
  required_ppe: string[];
  regulatory_references: Record<string, unknown>[];
  cached_at: string;
}

/**
 * Cached equipment item
 */
export interface CachedEquipment {
  id: string;
  company_id: string;
  equipment_number: string;
  name: string;
  equipment_type: string;
  category: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  status: string;
  current_location: string | null;
  assigned_jobsite_id: string | null;
  last_inspection_date: string | null;
  next_inspection_due: string | null;
  inspection_checklist: Record<string, unknown>[];
  required_certifications: string[];
  cached_at: string;
}

/**
 * Cached worker item
 */
export interface CachedWorker {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  trade: string | null;
  is_active: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  cached_at: string;
}

/**
 * Cached jobsite item
 */
export interface CachedJobsite {
  id: string;
  company_id: string;
  jobsite_number: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  status: string;
  is_active: boolean;
  site_supervisor_id: string | null;
  site_supervisor_name: string | null;
  emergency_contact_primary: string | null;
  emergency_contact_secondary: string | null;
  emergency_assembly_point: string | null;
  site_specific_hazards: string[];
  access_instructions: string | null;
  cached_at: string;
}

/**
 * Cached task item
 */
export interface CachedTask {
  id: string;
  company_id: string | null;
  task_code: string;
  name: string;
  description: string | null;
  category: string;
  trade: string;
  typical_hazards: Record<string, unknown>[];
  required_equipment: string[];
  required_certifications: string[];
  ppe_required: string[];
  procedure_steps: string[];
  cached_at: string;
}

/**
 * Cached SDS item
 */
export interface CachedSDS {
  id: string;
  company_id: string | null;
  sds_number: string;
  product_name: string;
  manufacturer: string | null;
  whmis_classification: string[];
  whmis_pictograms: string[];
  first_aid_inhalation: string | null;
  first_aid_skin: string | null;
  first_aid_eyes: string | null;
  first_aid_ingestion: string | null;
  required_ppe: string[];
  emergency_phone: string | null;
  cached_at: string;
}

/**
 * Library sync metadata
 */
export interface LibrarySyncMeta {
  library: string;
  company_id: string;
  last_synced_at: string;
  record_count: number;
}

// =============================================================================
// DEXIE DATABASE CLASS
// =============================================================================

/**
 * COR 2026 Local Database
 * 
 * Extends Dexie to provide typed access to IndexedDB tables.
 */
class CORLocalDatabase extends Dexie {
  forms!: EntityTable<LocalForm, 'id'>;
  evidence!: EntityTable<LocalEvidence, 'id'>;
  sync_queue!: EntityTable<SyncQueueItem, 'id'>;
  // Library cache tables
  hazards!: EntityTable<CachedHazard, 'id'>;
  equipment!: EntityTable<CachedEquipment, 'id'>;
  workers!: EntityTable<CachedWorker, 'id'>;
  jobsites!: EntityTable<CachedJobsite, 'id'>;
  tasks!: EntityTable<CachedTask, 'id'>;
  sds!: EntityTable<CachedSDS, 'id'>;
  library_sync_meta!: EntityTable<LibrarySyncMeta, 'library'>;

  constructor() {
    super('COR2026LocalDB');

    // Schema version 1
    this.version(1).stores({
      // Forms table with compound indexes
      forms: [
        'id',                           // Primary key
        'company_id',                   // For tenant filtering
        '[company_id+synced]',          // Compound: find unsynced forms for company
        'synced',                       // Find all unsynced
        'created_at',                   // Sort by creation date
        'updated_at',                   // Sort by update date
        'form_type',                    // Filter by form type
        'worker_id',                    // Find forms by worker
      ].join(', '),

      // Evidence table with compound indexes
      evidence: [
        'id',                           // Primary key
        'company_id',                   // For tenant filtering
        '[company_id+audit_element]',   // Compound: find evidence by audit element
        '[company_id+synced]',          // Compound: find unsynced evidence
        'synced',                       // Find all unsynced
        'timestamp',                    // Sort by timestamp
        'evidence_type',                // Filter by type
        'worker_id',                    // Find evidence by worker
      ].join(', '),

      // Sync queue with compound indexes for priority processing
      sync_queue: [
        '++id',                         // Auto-increment primary key
        '[status+priority]',            // Compound: get pending items by priority
        'status',                       // Filter by status
        'created_at',                   // Sort by creation
        'type',                         // Filter by type
        'local_record_id',              // Find queue items for a record
      ].join(', '),
    });

    // Schema version 2 - Add library cache tables
    this.version(2).stores({
      // Keep existing tables
      forms: 'id, company_id, [company_id+synced], synced, created_at, updated_at, form_type, worker_id',
      evidence: 'id, company_id, [company_id+audit_element], [company_id+synced], synced, timestamp, evidence_type, worker_id',
      sync_queue: '++id, [status+priority], status, created_at, type, local_record_id',

      // Library cache tables
      hazards: 'id, company_id, hazard_code, name, category, *applicable_trades, cached_at',
      equipment: 'id, company_id, equipment_number, name, equipment_type, status, assigned_jobsite_id, cached_at',
      workers: 'id, company_id, [first_name+last_name], position, trade, is_active, cached_at',
      jobsites: 'id, company_id, jobsite_number, name, status, is_active, cached_at',
      tasks: 'id, company_id, task_code, name, category, trade, cached_at',
      sds: 'id, company_id, sds_number, product_name, manufacturer, cached_at',
      library_sync_meta: '[library+company_id], library, company_id, last_synced_at',
    });
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Gets the count of items pending synchronization.
   * Includes forms, evidence, and queue items.
   */
  async getPendingSyncCount(): Promise<{
    forms: number;
    evidence: number;
    queue: number;
    total: number;
  }> {
    const [formsCount, evidenceCount, queueCount] = await Promise.all([
      this.forms.where('synced').anyOf(['pending', 'failed']).count(),
      this.evidence.where('synced').anyOf(['pending', 'failed']).count(),
      this.sync_queue.where('status').anyOf(['pending', 'failed']).count(),
    ]);

    return {
      forms: formsCount,
      evidence: evidenceCount,
      queue: queueCount,
      total: formsCount + evidenceCount + queueCount,
    };
  }

  /**
   * Clears synced data older than the specified number of days.
   * Helps manage local storage usage.
   * 
   * @param daysOld - Number of days after which synced data is removed (default: 7)
   * @returns Count of deleted records
   */
  async clearSyncedData(daysOld: number = 7): Promise<{
    forms: number;
    evidence: number;
    queue: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    // Delete old synced forms
    const oldForms = await this.forms
      .where('synced')
      .equals('synced')
      .and(form => form.updated_at < cutoffISO)
      .toArray();
    
    const formIds = oldForms.map(f => f.id);
    await this.forms.bulkDelete(formIds);

    // Delete old synced evidence
    const oldEvidence = await this.evidence
      .where('synced')
      .equals('synced')
      .and(ev => ev.timestamp < cutoffISO)
      .toArray();
    
    const evidenceIds = oldEvidence.map(e => e.id);
    await this.evidence.bulkDelete(evidenceIds);

    // Delete completed queue items
    const oldQueue = await this.sync_queue
      .where('status')
      .equals('completed')
      .and(item => item.created_at < cutoffISO)
      .toArray();
    
    const queueIds = oldQueue.map(q => q.id!);
    await this.sync_queue.bulkDelete(queueIds);

    return {
      forms: formIds.length,
      evidence: evidenceIds.length,
      queue: queueIds.length,
    };
  }

  /**
   * Gets unsynced forms for a specific company.
   */
  async getUnsyncedForms(companyId: string): Promise<LocalForm[]> {
    return this.forms
      .where('[company_id+synced]')
      .anyOf([
        [companyId, 'pending'],
        [companyId, 'failed'],
      ])
      .toArray();
  }

  /**
   * Gets unsynced evidence for a specific company.
   */
  async getUnsyncedEvidence(companyId: string): Promise<LocalEvidence[]> {
    return this.evidence
      .where('[company_id+synced]')
      .anyOf([
        [companyId, 'pending'],
        [companyId, 'failed'],
      ])
      .toArray();
  }

  /**
   * Gets pending sync queue items ordered by priority.
   * @param limit - Maximum number of items to return
   */
  async getPendingQueueItems(limit: number = 10): Promise<SyncQueueItem[]> {
    const now = new Date().toISOString();
    
    return this.sync_queue
      .where('status')
      .anyOf(['pending', 'failed'])
      .and(item => !item.next_retry_at || item.next_retry_at <= now)
      .sortBy('priority')
      .then(items => items.slice(0, limit));
  }

  /**
   * Adds an item to the sync queue.
   */
  async queueForSync(
    type: SyncItemType,
    localRecordId: string,
    localRecordTable: 'forms' | 'evidence',
    payload: Record<string, unknown>,
    priority: SyncPriority = 3
  ): Promise<number> {
    const id = await this.sync_queue.add({
      type,
      payload,
      priority,
      status: 'pending',
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null,
      next_retry_at: null,
      last_retry_at: null,
      local_record_id: localRecordId,
      local_record_table: localRecordTable,
      server_id: null,
      delete_after: null,
    });
    return id as number;
  }

  /**
   * Marks a sync queue item as completed and updates the source record.
   */
  async markSyncCompleted(
    queueItemId: number,
    serverId: string
  ): Promise<void> {
    await this.transaction('rw', [this.sync_queue, this.forms, this.evidence], async () => {
      const queueItem = await this.sync_queue.get(queueItemId);
      if (!queueItem) return;

      // Update the source record
      if (queueItem.local_record_table === 'forms') {
        await this.forms.update(queueItem.local_record_id, {
          synced: 'synced',
          server_id: serverId,
          sync_attempts: ((await this.forms.get(queueItem.local_record_id))?.sync_attempts ?? 0) + 1,
        });
      } else if (queueItem.local_record_table === 'evidence') {
        await this.evidence.update(queueItem.local_record_id, {
          synced: 'synced',
          server_id: serverId,
        });
      }

      // Mark queue item as completed
      await this.sync_queue.update(queueItemId, {
        status: 'synced',
      });
    });
  }

  /**
   * Marks a sync queue item as failed with exponential backoff.
   */
  async markSyncFailed(
    queueItemId: number,
    error: string
  ): Promise<void> {
    const queueItem = await this.sync_queue.get(queueItemId);
    if (!queueItem) return;

    const retryCount = queueItem.retry_count + 1;
    
    // Exponential backoff: 1min, 2min, 4min, 8min, 16min, then cap at 30min
    const backoffMinutes = Math.min(Math.pow(2, retryCount - 1), 30);
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);

    await this.transaction('rw', [this.sync_queue, this.forms, this.evidence], async () => {
      // Update queue item
      await this.sync_queue.update(queueItemId, {
        status: 'failed',
        retry_count: retryCount,
        last_error: error,
        next_retry_at: nextRetry.toISOString(),
      });

      // Update source record
      if (queueItem.local_record_table === 'forms') {
        await this.forms.update(queueItem.local_record_id, {
          synced: 'failed',
          sync_attempts: retryCount,
          last_sync_error: error,
        });
      } else if (queueItem.local_record_table === 'evidence') {
        await this.evidence.update(queueItem.local_record_id, {
          synced: 'failed',
        });
      }
    });
  }

  /**
   * Creates a new form and queues it for sync.
   */
  async createForm(
    form: Omit<LocalForm, 'id' | 'synced' | 'server_id' | 'created_at' | 'updated_at' | 'sync_attempts' | 'last_sync_error'>
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newForm: LocalForm = {
      ...form,
      id,
      synced: 'pending',
      server_id: null,
      created_at: now,
      updated_at: now,
      sync_attempts: 0,
      last_sync_error: null,
    };

    await this.transaction('rw', [this.forms, this.sync_queue], async () => {
      await this.forms.add(newForm);
      await this.queueForSync('form_submission', id, 'forms', newForm as unknown as Record<string, unknown>, 2);
    });

    return id;
  }

  /**
   * Creates a new evidence record and queues it for sync.
   */
  async createEvidence(
    evidence: Omit<LocalEvidence, 'id' | 'synced' | 'server_id'>
  ): Promise<string> {
    const id = crypto.randomUUID();

    const newEvidence: LocalEvidence = {
      ...evidence,
      id,
      synced: 'pending',
      server_id: null,
    };

    await this.transaction('rw', [this.evidence, this.sync_queue], async () => {
      await this.evidence.add(newEvidence);
      await this.queueForSync('evidence', id, 'evidence', newEvidence as unknown as Record<string, unknown>, 3);
    });

    return id;
  }

  /**
   * Gets storage usage statistics.
   */
  async getStorageStats(): Promise<{
    forms: number;
    evidence: number;
    queueItems: number;
    estimatedSizeMB: number;
  }> {
    const [formsCount, evidenceCount, queueCount] = await Promise.all([
      this.forms.count(),
      this.evidence.count(),
      this.sync_queue.count(),
    ]);

    // Rough estimate: assume average 10KB per form (including photos), 1KB per evidence
    const estimatedSizeMB = ((formsCount * 10) + (evidenceCount * 1)) / 1024;

    return {
      forms: formsCount,
      evidence: evidenceCount,
      queueItems: queueCount,
      estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
    };
  }

  // ===========================================================================
  // LIBRARY CACHE METHODS
  // ===========================================================================

  /**
   * Syncs hazards to local cache
   */
  async syncHazards(hazards: CachedHazard[], companyId: string): Promise<void> {
    const now = new Date().toISOString();
    const hazardsWithTimestamp = hazards.map(h => ({ ...h, cached_at: now }));

    await this.transaction('rw', [this.hazards, this.library_sync_meta], async () => {
      // Clear existing hazards for this company
      await this.hazards.where('company_id').equals(companyId).delete();
      // Also clear global hazards
      await this.hazards.where('company_id').equals(null as unknown as string).delete();
      
      // Add new hazards
      await this.hazards.bulkPut(hazardsWithTimestamp);
      
      // Update sync metadata
      await this.library_sync_meta.put({
        library: 'hazards',
        company_id: companyId,
        last_synced_at: now,
        record_count: hazards.length,
      });
    });
  }

  /**
   * Syncs equipment to local cache
   */
  async syncEquipment(equipment: CachedEquipment[], companyId: string): Promise<void> {
    const now = new Date().toISOString();
    const equipmentWithTimestamp = equipment.map(e => ({ ...e, cached_at: now }));

    await this.transaction('rw', [this.equipment, this.library_sync_meta], async () => {
      await this.equipment.where('company_id').equals(companyId).delete();
      await this.equipment.bulkPut(equipmentWithTimestamp);
      
      await this.library_sync_meta.put({
        library: 'equipment',
        company_id: companyId,
        last_synced_at: now,
        record_count: equipment.length,
      });
    });
  }

  /**
   * Syncs workers to local cache
   */
  async syncWorkers(workers: CachedWorker[], companyId: string): Promise<void> {
    const now = new Date().toISOString();
    const workersWithTimestamp = workers.map(w => ({ ...w, cached_at: now }));

    await this.transaction('rw', [this.workers, this.library_sync_meta], async () => {
      await this.workers.where('company_id').equals(companyId).delete();
      await this.workers.bulkPut(workersWithTimestamp);
      
      await this.library_sync_meta.put({
        library: 'workers',
        company_id: companyId,
        last_synced_at: now,
        record_count: workers.length,
      });
    });
  }

  /**
   * Syncs jobsites to local cache
   */
  async syncJobsites(jobsites: CachedJobsite[], companyId: string): Promise<void> {
    const now = new Date().toISOString();
    const jobsitesWithTimestamp = jobsites.map(j => ({ ...j, cached_at: now }));

    await this.transaction('rw', [this.jobsites, this.library_sync_meta], async () => {
      await this.jobsites.where('company_id').equals(companyId).delete();
      await this.jobsites.bulkPut(jobsitesWithTimestamp);
      
      await this.library_sync_meta.put({
        library: 'jobsites',
        company_id: companyId,
        last_synced_at: now,
        record_count: jobsites.length,
      });
    });
  }

  /**
   * Syncs tasks to local cache
   */
  async syncTasks(tasks: CachedTask[], companyId: string): Promise<void> {
    const now = new Date().toISOString();
    const tasksWithTimestamp = tasks.map(t => ({ ...t, cached_at: now }));

    await this.transaction('rw', [this.tasks, this.library_sync_meta], async () => {
      await this.tasks.where('company_id').equals(companyId).delete();
      await this.tasks.where('company_id').equals(null as unknown as string).delete();
      await this.tasks.bulkPut(tasksWithTimestamp);
      
      await this.library_sync_meta.put({
        library: 'tasks',
        company_id: companyId,
        last_synced_at: now,
        record_count: tasks.length,
      });
    });
  }

  /**
   * Syncs SDS to local cache
   */
  async syncSDS(sds: CachedSDS[], companyId: string): Promise<void> {
    const now = new Date().toISOString();
    const sdsWithTimestamp = sds.map(s => ({ ...s, cached_at: now }));

    await this.transaction('rw', [this.sds, this.library_sync_meta], async () => {
      await this.sds.where('company_id').equals(companyId).delete();
      await this.sds.where('company_id').equals(null as unknown as string).delete();
      await this.sds.bulkPut(sdsWithTimestamp);
      
      await this.library_sync_meta.put({
        library: 'sds',
        company_id: companyId,
        last_synced_at: now,
        record_count: sds.length,
      });
    });
  }

  /**
   * Gets cached hazards, optionally filtered by category
   */
  async getCachedHazards(companyId: string, category?: string): Promise<CachedHazard[]> {
    let query = this.hazards.where('company_id').anyOf([companyId, null as unknown as string]);
    
    if (category) {
      const results = await query.toArray();
      return results.filter(h => h.category === category);
    }
    
    return query.toArray();
  }

  /**
   * Gets cached equipment, optionally filtered by status
   */
  async getCachedEquipment(companyId: string, status?: string): Promise<CachedEquipment[]> {
    let query = this.equipment.where('company_id').equals(companyId);
    
    if (status) {
      const results = await query.toArray();
      return results.filter(e => e.status === status);
    }
    
    return query.toArray();
  }

  /**
   * Gets cached workers, optionally filtered by active status
   */
  async getCachedWorkers(companyId: string, activeOnly: boolean = true): Promise<CachedWorker[]> {
    const query = this.workers.where('company_id').equals(companyId);
    const results = await query.toArray();
    
    if (activeOnly) {
      return results.filter(w => w.is_active);
    }
    
    return results;
  }

  /**
   * Gets cached jobsites, optionally filtered by active status
   */
  async getCachedJobsites(companyId: string, activeOnly: boolean = true): Promise<CachedJobsite[]> {
    const query = this.jobsites.where('company_id').equals(companyId);
    const results = await query.toArray();
    
    if (activeOnly) {
      return results.filter(j => j.is_active);
    }
    
    return results;
  }

  /**
   * Gets cached tasks, optionally filtered by category or trade
   */
  async getCachedTasks(companyId: string, filters?: { category?: string; trade?: string }): Promise<CachedTask[]> {
    const query = this.tasks.where('company_id').anyOf([companyId, null as unknown as string]);
    let results = await query.toArray();
    
    if (filters?.category) {
      results = results.filter(t => t.category === filters.category);
    }
    if (filters?.trade) {
      results = results.filter(t => t.trade === filters.trade);
    }
    
    return results;
  }

  /**
   * Gets cached SDS items
   */
  async getCachedSDS(companyId: string): Promise<CachedSDS[]> {
    return this.sds.where('company_id').anyOf([companyId, null as unknown as string]).toArray();
  }

  /**
   * Checks if library cache is stale (older than specified hours)
   */
  async isLibraryCacheStale(library: string, companyId: string, maxAgeHours: number = 24): Promise<boolean> {
    const meta = await this.library_sync_meta
      .where('[library+company_id]')
      .equals([library, companyId])
      .first();
    
    if (!meta) return true;
    
    const lastSynced = new Date(meta.last_synced_at);
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    
    return Date.now() - lastSynced.getTime() > maxAge;
  }

  /**
   * Gets library sync metadata
   */
  async getLibrarySyncStatus(companyId: string): Promise<Record<string, { lastSynced: string; recordCount: number } | null>> {
    const libraries = ['hazards', 'equipment', 'workers', 'jobsites', 'tasks', 'sds'];
    const result: Record<string, { lastSynced: string; recordCount: number } | null> = {};
    
    for (const library of libraries) {
      const meta = await this.library_sync_meta
        .where('[library+company_id]')
        .equals([library, companyId])
        .first();
      
      // Safe: library is iterated from a controlled array of known library names
      // eslint-disable-next-line security/detect-object-injection
      result[library] = meta ? {
        lastSynced: meta.last_synced_at,
        recordCount: meta.record_count,
      } : null;
    }
    
    return result;
  }

  /**
   * Clears all library caches for a company
   */
  async clearLibraryCache(companyId: string): Promise<void> {
    await this.transaction('rw', [
      this.hazards,
      this.equipment,
      this.workers,
      this.jobsites,
      this.tasks,
      this.sds,
      this.library_sync_meta,
    ], async () => {
      await this.hazards.where('company_id').anyOf([companyId, null as unknown as string]).delete();
      await this.equipment.where('company_id').equals(companyId).delete();
      await this.workers.where('company_id').equals(companyId).delete();
      await this.jobsites.where('company_id').equals(companyId).delete();
      await this.tasks.where('company_id').anyOf([companyId, null as unknown as string]).delete();
      await this.sds.where('company_id').anyOf([companyId, null as unknown as string]).delete();
      await this.library_sync_meta.where('company_id').equals(companyId).delete();
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the local database.
 * Use this throughout the application for offline data storage.
 * 
 * The database is lazily instantiated to prevent SSR errors since
 * IndexedDB is only available in browser environments.
 * 
 * @example
 * ```typescript
 * import { localDB } from '@/lib/db/local-db';
 * 
 * // Create a form
 * const formId = await localDB.createForm({
 *   company_id: 'uuid',
 *   worker_id: 'uuid',
 *   form_type: 'safety_inspection',
 *   form_data: { ... },
 *   photos: [],
 *   signature_base64: null,
 *   gps_coordinates: null,
 * });
 * 
 * // Get pending sync count
 * const { total } = await localDB.getPendingSyncCount();
 * ```
 */
let _localDB: CORLocalDatabase | null = null;

function getLocalDB(): CORLocalDatabase {
  if (typeof window === 'undefined') {
    throw new Error('localDB can only be accessed in browser environment');
  }
  if (!_localDB) {
    _localDB = new CORLocalDatabase();
  }
  return _localDB;
}

export const localDB = new Proxy({} as CORLocalDatabase, {
  get(_target, prop) {
    const db = getLocalDB();
    const value = (db as any)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
});

// =============================================================================
// RE-EXPORT TYPES
// =============================================================================

export type { CORLocalDatabase };
