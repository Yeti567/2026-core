/**
 * Library Sync Service
 * 
 * Handles syncing master library data to IndexedDB for offline access.
 * Provides background sync, cache invalidation, and offline fallback.
 */

import { createClient } from '@/lib/supabase/client';
import { localDB } from '@/lib/db/local-db';
import type {
  CachedHazard,
  CachedEquipment,
  CachedWorker,
  CachedJobsite,
  CachedTask,
  CachedSDS,
} from '@/lib/db/local-db';

// =============================================================================
// Types
// =============================================================================

export interface LibrarySyncOptions {
  /** Force sync even if cache is fresh */
  force?: boolean;
  /** Maximum cache age in hours before refresh (default: 24) */
  maxCacheAgeHours?: number;
  /** Libraries to sync (default: all) */
  libraries?: Array<'hazards' | 'equipment' | 'workers' | 'jobsites' | 'tasks' | 'sds'>;
  /** Callback for progress updates */
  onProgress?: (library: string, status: 'syncing' | 'done' | 'error', count?: number) => void;
}

export interface LibrarySyncResult {
  success: boolean;
  synced: {
    hazards?: number;
    equipment?: number;
    workers?: number;
    jobsites?: number;
    tasks?: number;
    sds?: number;
  };
  errors: string[];
  duration: number;
}

// =============================================================================
// Main Sync Function
// =============================================================================

/**
 * Sync all master libraries to local IndexedDB
 */
export async function syncLibrariesToLocal(
  companyId: string,
  options: LibrarySyncOptions = {}
): Promise<LibrarySyncResult> {
  const startTime = Date.now();
  const {
    force = false,
    maxCacheAgeHours = 24,
    libraries = ['hazards', 'equipment', 'workers', 'jobsites', 'tasks', 'sds'],
    onProgress,
  } = options;

  const result: LibrarySyncResult = {
    success: true,
    synced: {},
    errors: [],
    duration: 0,
  };

  const supabase = createClient();

  // Check if user is online
  if (!navigator.onLine) {
    result.errors.push('Cannot sync: device is offline');
    result.success = false;
    result.duration = Date.now() - startTime;
    return result;
  }

  // Sync each library
  for (const library of libraries) {
    try {
      // Check if cache is stale
      const isStale = await localDB.isLibraryCacheStale(library, companyId, maxCacheAgeHours);
      
      if (!force && !isStale) {
        continue; // Skip fresh cache
      }

      onProgress?.(library, 'syncing');

      switch (library) {
        case 'hazards':
          result.synced.hazards = await syncHazards(supabase, companyId);
          break;
        case 'equipment':
          result.synced.equipment = await syncEquipment(supabase, companyId);
          break;
        case 'workers':
          result.synced.workers = await syncWorkers(supabase, companyId);
          break;
        case 'jobsites':
          result.synced.jobsites = await syncJobsites(supabase, companyId);
          break;
        case 'tasks':
          result.synced.tasks = await syncTasks(supabase, companyId);
          break;
        case 'sds':
          result.synced.sds = await syncSDS(supabase, companyId);
          break;
      }

      // Safe: library is from controlled libraries array
      // eslint-disable-next-line security/detect-object-injection
      onProgress?.(library, 'done', result.synced[library]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to sync ${library}`;
      result.errors.push(errorMessage);
      result.success = false;
      onProgress?.(library, 'error');
    }
  }

  result.duration = Date.now() - startTime;
  return result;
}

// =============================================================================
// Individual Library Sync Functions
// =============================================================================

async function syncHazards(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('hazard_library')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .eq('is_active', true);

  if (error) throw error;

  const hazards: CachedHazard[] = (data || []).map(h => ({
    id: h.id,
    company_id: h.company_id,
    hazard_code: h.hazard_code,
    name: h.name,
    description: h.description,
    category: h.category,
    subcategory: h.subcategory,
    applicable_trades: h.applicable_trades || [],
    default_severity: h.default_severity,
    default_likelihood: h.default_likelihood,
    default_risk_level: h.default_risk_level,
    recommended_controls: h.recommended_controls || [],
    required_ppe: h.required_ppe || [],
    regulatory_references: h.regulatory_references || [],
    cached_at: '',
  }));

  await localDB.syncHazards(hazards, companyId);
  return hazards.length;
}

async function syncEquipment(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('equipment_inventory')
    .select('*')
    .eq('company_id', companyId);

  if (error) throw error;

  const equipment: CachedEquipment[] = (data || []).map(e => ({
    id: e.id,
    company_id: e.company_id,
    equipment_number: e.equipment_number,
    name: e.name,
    equipment_type: e.equipment_type,
    category: e.category,
    make: e.make,
    model: e.model,
    serial_number: e.serial_number,
    status: e.status,
    current_location: e.current_location,
    assigned_jobsite_id: e.assigned_jobsite_id,
    last_inspection_date: e.last_inspection_date,
    next_inspection_due: e.next_inspection_due,
    inspection_checklist: e.inspection_checklist || [],
    required_certifications: e.required_certifications || [],
    cached_at: '',
  }));

  await localDB.syncEquipment(equipment, companyId);
  return equipment.length;
}

async function syncWorkers(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) throw error;

  const workers: CachedWorker[] = (data || []).map(w => ({
    id: w.id,
    company_id: w.company_id,
    first_name: w.first_name,
    last_name: w.last_name,
    email: w.email,
    phone: w.phone,
    position: w.position,
    trade: w.trade,
    is_active: w.is_active,
    emergency_contact_name: w.emergency_contact_name,
    emergency_contact_phone: w.emergency_contact_phone,
    cached_at: '',
  }));

  await localDB.syncWorkers(workers, companyId);
  return workers.length;
}

async function syncJobsites(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('jobsites')
    .select(`
      *,
      site_supervisor:workers!jobsites_site_supervisor_id_fkey(id, first_name, last_name)
    `)
    .eq('company_id', companyId);

  if (error) throw error;

  const jobsites: CachedJobsite[] = (data || []).map(j => ({
    id: j.id,
    company_id: j.company_id,
    jobsite_number: j.jobsite_number,
    name: j.name,
    address: j.address,
    city: j.city,
    province: j.province,
    status: j.status,
    is_active: j.is_active,
    site_supervisor_id: j.site_supervisor_id,
    site_supervisor_name: j.site_supervisor
      ? `${j.site_supervisor.first_name} ${j.site_supervisor.last_name}`
      : null,
    emergency_contact_primary: j.emergency_contact_primary,
    emergency_contact_secondary: j.emergency_contact_secondary,
    emergency_assembly_point: j.emergency_assembly_point,
    site_specific_hazards: j.site_specific_hazards || [],
    access_instructions: j.access_instructions,
    cached_at: '',
  }));

  await localDB.syncJobsites(jobsites, companyId);
  return jobsites.length;
}

async function syncTasks(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('job_task_library')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .eq('is_active', true);

  if (error) throw error;

  const tasks: CachedTask[] = (data || []).map(t => ({
    id: t.id,
    company_id: t.company_id,
    task_code: t.task_code,
    name: t.name,
    description: t.description,
    category: t.category,
    trade: t.trade,
    typical_hazards: t.typical_hazards || [],
    required_equipment: t.required_equipment || [],
    required_certifications: t.required_certifications || [],
    ppe_required: t.ppe_required || [],
    procedure_steps: t.procedure_steps || [],
    cached_at: '',
  }));

  await localDB.syncTasks(tasks, companyId);
  return tasks.length;
}

async function syncSDS(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('sds_library')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .eq('is_active', true);

  if (error) throw error;

  const sds: CachedSDS[] = (data || []).map(s => ({
    id: s.id,
    company_id: s.company_id,
    sds_number: s.sds_number,
    product_name: s.product_name,
    manufacturer: s.manufacturer,
    whmis_classification: s.whmis_classification || [],
    whmis_pictograms: s.whmis_pictograms || [],
    first_aid_inhalation: s.first_aid_inhalation,
    first_aid_skin: s.first_aid_skin,
    first_aid_eyes: s.first_aid_eyes,
    first_aid_ingestion: s.first_aid_ingestion,
    required_ppe: s.required_ppe || [],
    emergency_phone: s.emergency_phone,
    cached_at: '',
  }));

  await localDB.syncSDS(sds, companyId);
  return sds.length;
}

// =============================================================================
// Offline Data Access
// =============================================================================

/**
 * Get hazards from local cache, falling back to online if needed
 */
export async function getHazardsOfflineFirst(
  companyId: string,
  category?: string
): Promise<CachedHazard[]> {
  // Try local cache first
  const cached = await localDB.getCachedHazards(companyId, category);
  
  if (cached.length > 0) {
    return cached;
  }

  // If online and cache empty, sync and return
  if (navigator.onLine) {
    const supabase = createClient();
    await syncHazards(supabase, companyId);
    return localDB.getCachedHazards(companyId, category);
  }

  return [];
}

/**
 * Get equipment from local cache, falling back to online if needed
 */
export async function getEquipmentOfflineFirst(
  companyId: string,
  status?: string
): Promise<CachedEquipment[]> {
  const cached = await localDB.getCachedEquipment(companyId, status);
  
  if (cached.length > 0) {
    return cached;
  }

  if (navigator.onLine) {
    const supabase = createClient();
    await syncEquipment(supabase, companyId);
    return localDB.getCachedEquipment(companyId, status);
  }

  return [];
}

/**
 * Get workers from local cache, falling back to online if needed
 */
export async function getWorkersOfflineFirst(
  companyId: string,
  activeOnly: boolean = true
): Promise<CachedWorker[]> {
  const cached = await localDB.getCachedWorkers(companyId, activeOnly);
  
  if (cached.length > 0) {
    return cached;
  }

  if (navigator.onLine) {
    const supabase = createClient();
    await syncWorkers(supabase, companyId);
    return localDB.getCachedWorkers(companyId, activeOnly);
  }

  return [];
}

/**
 * Get jobsites from local cache, falling back to online if needed
 */
export async function getJobsitesOfflineFirst(
  companyId: string,
  activeOnly: boolean = true
): Promise<CachedJobsite[]> {
  const cached = await localDB.getCachedJobsites(companyId, activeOnly);
  
  if (cached.length > 0) {
    return cached;
  }

  if (navigator.onLine) {
    const supabase = createClient();
    await syncJobsites(supabase, companyId);
    return localDB.getCachedJobsites(companyId, activeOnly);
  }

  return [];
}

/**
 * Get tasks from local cache, falling back to online if needed
 */
export async function getTasksOfflineFirst(
  companyId: string,
  filters?: { category?: string; trade?: string }
): Promise<CachedTask[]> {
  const cached = await localDB.getCachedTasks(companyId, filters);
  
  if (cached.length > 0) {
    return cached;
  }

  if (navigator.onLine) {
    const supabase = createClient();
    await syncTasks(supabase, companyId);
    return localDB.getCachedTasks(companyId, filters);
  }

  return [];
}

/**
 * Get SDS from local cache, falling back to online if needed
 */
export async function getSDSOfflineFirst(companyId: string): Promise<CachedSDS[]> {
  const cached = await localDB.getCachedSDS(companyId);
  
  if (cached.length > 0) {
    return cached;
  }

  if (navigator.onLine) {
    const supabase = createClient();
    await syncSDS(supabase, companyId);
    return localDB.getCachedSDS(companyId);
  }

  return [];
}

// =============================================================================
// Background Sync
// =============================================================================

let syncInterval: NodeJS.Timeout | null = null;

/**
 * Start background library sync
 */
export function startBackgroundLibrarySync(
  companyId: string,
  intervalMinutes: number = 30
): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Initial sync
  syncLibrariesToLocal(companyId, { force: false });

  // Set up interval
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      syncLibrariesToLocal(companyId, { force: false });
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop background library sync
 */
export function stopBackgroundLibrarySync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}


