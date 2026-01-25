/**
 * Library Integration Module
 * 
 * Integrates master data libraries (hazards, equipment, tasks, workers, jobsites, SDS)
 * with the form system for auto-population and dynamic dropdowns.
 */

import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

export type LibrarySource = 
  | 'hazards' 
  | 'equipment' 
  | 'tasks' 
  | 'workers' 
  | 'jobsites' 
  | 'sds'
  | 'legislation';

export interface LibraryFilters {
  category?: string;
  trade?: string;
  status?: string;
  is_active?: boolean;
  is_on_site?: boolean;
  search?: string;
  company_id?: string;
  jobsite_id?: string;
  [key: string]: string | boolean | undefined;
}

export interface AutoPopulateConfig {
  /** Source field in the library item */
  sourceField: string;
  /** Target field code in the form */
  targetField: string;
  /** Optional transform function */
  transform?: (value: unknown) => unknown;
}

export interface LibraryFieldConfig {
  /** Which library to fetch from */
  library_source: LibrarySource;
  /** Filters to apply when fetching */
  library_filters?: LibraryFilters;
  /** Fields to auto-populate when an item is selected */
  auto_populate_fields?: string[];
  /** Detailed auto-populate mappings */
  auto_populate_mappings?: AutoPopulateConfig[];
  /** Whether to allow quick-add of new items */
  allow_quick_add?: boolean;
  /** Whether to use search/autocomplete mode for large lists */
  use_search_mode?: boolean;
  /** Minimum items before switching to search mode */
  search_mode_threshold?: number;
}

// =============================================================================
// Library Item Types
// =============================================================================

export interface HazardLibraryItem {
  id: string;
  hazard_code: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  applicable_trades: string[];
  applicable_activities: string[];
  default_severity: number;
  default_likelihood: number;
  default_risk_score: number;
  default_risk_level: string;
  recommended_controls: Array<{ type: string; control: string; required: boolean }>;
  required_ppe: string[];
  regulatory_references: Array<{ regulation: string; section: string; title: string }>;
  is_active: boolean;
  is_global: boolean;
}

export interface EquipmentLibraryItem {
  id: string;
  equipment_number: string;
  name: string;
  equipment_type: string;
  category: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  status: string;
  current_location: string | null;
  assigned_jobsite_id: string | null;
  last_inspection_date: string | null;
  next_inspection_due: string | null;
  inspection_frequency_days: number;
  inspection_status: string;
  required_certifications: string[];
  inspection_checklist: Array<{ item: string; category: string }>;
}

export interface TaskLibraryItem {
  id: string;
  task_code: string;
  name: string;
  description: string | null;
  category: string;
  trade: string;
  typical_duration_hours: number | null;
  crew_size_min: number | null;
  crew_size_max: number | null;
  procedure_steps: string[];
  typical_hazards: Array<{ hazard_id: string; hazard_name: string; risk_level: string }>;
  required_equipment: string[];
  required_certifications: string[];
  ppe_required: string[];
  permits_required: string[];
  jha_template: Record<string, unknown> | null;
  is_active: boolean;
  is_global: boolean;
}

export interface WorkerLibraryItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  trade: string | null;
  certifications: Array<{ name: string; expiry: string | null }>;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  is_active: boolean;
}

export interface JobsiteLibraryItem {
  id: string;
  jobsite_number: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  status: string;
  start_date: string | null;
  expected_end_date: string | null;
  site_supervisor_id: string | null;
  site_supervisor_name: string | null;
  client_name: string | null;
  emergency_contact_primary: string | null;
  emergency_contact_secondary: string | null;
  emergency_assembly_point: string | null;
  nearest_hospital: string | null;
  site_specific_hazards: string[];
  required_orientations: string[];
  access_instructions: string | null;
  is_active: boolean;
}

export interface SDSLibraryItem {
  id: string;
  sds_number: string;
  product_name: string;
  manufacturer: string | null;
  whmis_classification: string[];
  whmis_pictograms: string[];
  hazard_statements: string[];
  precautionary_statements: string[];
  first_aid_inhalation: string | null;
  first_aid_skin: string | null;
  first_aid_eyes: string | null;
  first_aid_ingestion: string | null;
  required_ppe: string[];
  storage_requirements: string | null;
  spill_procedure: string | null;
  emergency_phone: string | null;
  pdf_url: string | null;
  is_on_site: boolean;
  current_location: string | null;
  expiry_date: string | null;
  is_active: boolean;
}

export type LibraryItem = 
  | HazardLibraryItem 
  | EquipmentLibraryItem 
  | TaskLibraryItem 
  | WorkerLibraryItem 
  | JobsiteLibraryItem 
  | SDSLibraryItem;

// =============================================================================
// Fetch Functions
// =============================================================================

export async function fetchLibraryItems(
  source: LibrarySource,
  filters?: LibraryFilters,
  companyId?: string
): Promise<LibraryItem[]> {
  const supabase = createClient();
  
  switch (source) {
    case 'hazards':
      return fetchHazards(supabase, filters, companyId);
    case 'equipment':
      return fetchEquipment(supabase, filters, companyId);
    case 'tasks':
      return fetchTasks(supabase, filters, companyId);
    case 'workers':
      return fetchWorkers(supabase, filters, companyId);
    case 'jobsites':
      return fetchJobsites(supabase, filters, companyId);
    case 'sds':
      return fetchSDS(supabase, filters, companyId);
    default:
      return [];
  }
}

async function fetchHazards(
  supabase: ReturnType<typeof createClient>,
  filters?: LibraryFilters,
  companyId?: string
): Promise<HazardLibraryItem[]> {
  let query = supabase
    .from('hazard_library')
    .select('*')
    .eq('is_active', true);
  
  // Include global hazards OR company-specific
  if (companyId) {
    query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
  } else {
    query = query.is('company_id', null);
  }
  
  // Apply filters
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.trade) {
    query = query.contains('applicable_trades', [filters.trade]);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  
  query = query.order('category').order('name');
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching hazards:', error);
    return [];
  }
  
  return data || [];
}

async function fetchEquipment(
  supabase: ReturnType<typeof createClient>,
  filters?: LibraryFilters,
  companyId?: string
): Promise<EquipmentLibraryItem[]> {
  let query = supabase
    .from('equipment_inventory')
    .select('*');
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.jobsite_id) {
    query = query.eq('assigned_jobsite_id', filters.jobsite_id);
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('status', filters.is_active ? 'in_service' : 'out_of_service');
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,equipment_number.ilike.%${filters.search}%`);
  }
  
  query = query.order('name');
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
  
  return data || [];
}

async function fetchTasks(
  supabase: ReturnType<typeof createClient>,
  filters?: LibraryFilters,
  companyId?: string
): Promise<TaskLibraryItem[]> {
  let query = supabase
    .from('job_task_library')
    .select('*')
    .eq('is_active', true);
  
  if (companyId) {
    query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
  } else {
    query = query.is('company_id', null);
  }
  
  // Apply filters
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.trade) {
    query = query.eq('trade', filters.trade);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  
  query = query.order('category').order('name');
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  
  return data || [];
}

async function fetchWorkers(
  supabase: ReturnType<typeof createClient>,
  filters?: LibraryFilters,
  companyId?: string
): Promise<WorkerLibraryItem[]> {
  let query = supabase
    .from('workers')
    .select('*')
    .eq('is_active', true);
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  // Apply filters
  if (filters?.trade) {
    query = query.eq('trade', filters.trade);
  }
  if (filters?.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
  }
  
  query = query.order('last_name').order('first_name');
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching workers:', error);
    return [];
  }
  
  return data || [];
}

async function fetchJobsites(
  supabase: ReturnType<typeof createClient>,
  filters?: LibraryFilters,
  companyId?: string
): Promise<JobsiteLibraryItem[]> {
  let query = supabase
    .from('jobsites')
    .select(`
      *,
      site_supervisor:workers!jobsites_site_supervisor_id_fkey(
        id, first_name, last_name
      )
    `);
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,jobsite_number.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
  }
  
  query = query.order('name');
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching jobsites:', error);
    return [];
  }
  
  // Transform to include supervisor name
  return (data || []).map(site => ({
    ...site,
    site_supervisor_name: site.site_supervisor 
      ? `${site.site_supervisor.first_name} ${site.site_supervisor.last_name}`
      : null,
  }));
}

async function fetchSDS(
  supabase: ReturnType<typeof createClient>,
  filters?: LibraryFilters,
  companyId?: string
): Promise<SDSLibraryItem[]> {
  let query = supabase
    .from('sds_library')
    .select('*')
    .eq('is_active', true);
  
  if (companyId) {
    query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
  }
  
  // Apply filters
  if (filters?.is_on_site !== undefined) {
    // Need to join with sds_inventory to check if on site
    // For now, filter client-side or use a view
  }
  if (filters?.search) {
    query = query.or(`product_name.ilike.%${filters.search}%,manufacturer.ilike.%${filters.search}%`);
  }
  
  query = query.order('product_name');
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching SDS:', error);
    return [];
  }
  
  return data || [];
}

// =============================================================================
// Single Item Fetch
// =============================================================================

export async function getLibraryItem(
  source: LibrarySource,
  itemId: string
): Promise<LibraryItem | null> {
  const supabase = createClient();
  
  const tableMap: Record<LibrarySource, string> = {
    hazards: 'hazard_library',
    equipment: 'equipment_inventory',
    tasks: 'job_task_library',
    workers: 'workers',
    jobsites: 'jobsites',
    sds: 'sds_library',
    legislation: 'legislation_library',
  };
  
  // Safe: source is a typed LibrarySource enum
  // eslint-disable-next-line security/detect-object-injection
  const table = tableMap[source];
  if (!table) return null;
  
  // Special handling for jobsites to include supervisor
  if (source === 'jobsites') {
    const { data, error } = await supabase
      .from(table)
      .select(`
        *,
        site_supervisor:workers!jobsites_site_supervisor_id_fkey(
          id, first_name, last_name
        )
      `)
      .eq('id', itemId)
      .single();
    
    if (error || !data) return null;
    
    return {
      ...data,
      site_supervisor_name: data.site_supervisor 
        ? `${data.site_supervisor.first_name} ${data.site_supervisor.last_name}`
        : null,
    } as JobsiteLibraryItem;
  }
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', itemId)
    .single();
  
  if (error) {
    console.error(`Error fetching ${source} item:`, error);
    return null;
  }
  
  return data;
}

// =============================================================================
// Auto-Population Logic
// =============================================================================

/**
 * Default field mappings for auto-population
 */
export const DEFAULT_FIELD_MAPPINGS: Record<LibrarySource, Record<string, string>> = {
  jobsites: {
    site_supervisor: 'site_supervisor_name',
    site_supervisor_id: 'site_supervisor_id',
    emergency_contact: 'emergency_contact_primary',
    emergency_contact_secondary: 'emergency_contact_secondary',
    site_hazards: 'site_specific_hazards',
    assembly_point: 'emergency_assembly_point',
    nearest_hospital: 'nearest_hospital',
    client_name: 'client_name',
    address: 'address',
    access_instructions: 'access_instructions',
  },
  equipment: {
    equipment_type: 'equipment_type',
    equipment_category: 'category',
    make: 'make',
    model: 'model',
    make_model: 'make_model', // computed field
    serial_number: 'serial_number',
    last_inspection: 'last_inspection_date',
    next_inspection: 'next_inspection_due',
    inspection_status: 'inspection_status',
    required_certifications: 'required_certifications',
    inspection_checklist: 'inspection_checklist',
    current_location: 'current_location',
  },
  hazards: {
    required_ppe: 'required_ppe',
    engineering_controls: 'engineering_controls', // extracted from recommended_controls
    admin_controls: 'administrative_controls', // extracted from recommended_controls
    ppe_controls: 'ppe_controls', // extracted from recommended_controls
    risk_level: 'default_risk_level',
    risk_score: 'default_risk_score',
    regulatory_references: 'regulatory_references',
    description: 'description',
  },
  tasks: {
    task_hazards: 'typical_hazards',
    required_equipment: 'required_equipment',
    required_certifications: 'required_certifications',
    required_ppe: 'ppe_required',
    permits_required: 'permits_required',
    procedure_steps: 'procedure_steps',
    typical_duration: 'typical_duration_hours',
    crew_size: 'crew_size_min', // or could be a range
    jha_template: 'jha_template',
  },
  workers: {
    worker_name: 'full_name', // computed
    worker_email: 'email',
    worker_phone: 'phone',
    worker_position: 'position',
    worker_trade: 'trade',
    emergency_contact_name: 'emergency_contact_name',
    emergency_contact_phone: 'emergency_contact_phone',
  },
  sds: {
    whmis_classification: 'whmis_classification',
    whmis_pictograms: 'whmis_pictograms',
    hazard_statements: 'hazard_statements',
    first_aid_inhalation: 'first_aid_inhalation',
    first_aid_skin: 'first_aid_skin',
    first_aid_eyes: 'first_aid_eyes',
    first_aid_ingestion: 'first_aid_ingestion',
    first_aid_procedure: 'first_aid_combined', // computed
    required_ppe: 'required_ppe',
    emergency_phone: 'emergency_phone',
    spill_procedure: 'spill_procedure',
    storage_requirements: 'storage_requirements',
  },
  legislation: {},
};

/**
 * Get values to auto-populate from a selected library item
 */
export function getAutoPopulateValues(
  item: LibraryItem,
  source: LibrarySource,
  fieldsToPopulate: string[],
  customMappings?: AutoPopulateConfig[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // Safe: source is a typed LibrarySource enum
  // eslint-disable-next-line security/detect-object-injection
  const defaultMappings = DEFAULT_FIELD_MAPPINGS[source] || {};
  
  // Apply custom mappings first
  if (customMappings) {
    for (const mapping of customMappings) {
      if (fieldsToPopulate.includes(mapping.targetField)) {
        let value = getNestedValue(item, mapping.sourceField);
        if (mapping.transform) {
          value = mapping.transform(value);
        }
        // Safe: mapping.targetField is from customMappings AutoPopulateConfig (controlled)
         
        result[mapping.targetField] = value;
      }
    }
  }
  
  // Apply default mappings for remaining fields
  for (const fieldCode of fieldsToPopulate) {
    // Safe: fieldCode is from fieldsToPopulate array (controlled field codes)
    // eslint-disable-next-line security/detect-object-injection
    if (result[fieldCode] !== undefined) continue; // Already set by custom mapping
    
    // Safe: fieldCode is from fieldsToPopulate array (controlled field codes)
    // eslint-disable-next-line security/detect-object-injection
    const sourceField = defaultMappings[fieldCode];
    if (sourceField) {
      // eslint-disable-next-line security/detect-object-injection
      result[fieldCode] = getComputedValue(item, source, sourceField);
    }
  }
  
  return result;
}

/**
 * Get a potentially computed value from a library item
 */
function getComputedValue(item: LibraryItem, source: LibrarySource, field: string): unknown {
  // Handle computed fields
  if (field === 'make_model' && 'make' in item && 'model' in item) {
    return [item.make, item.model].filter(Boolean).join(' ') || null;
  }
  
  if (field === 'full_name' && 'first_name' in item && 'last_name' in item) {
    return `${item.first_name} ${item.last_name}`;
  }
  
  if (field === 'first_aid_combined' && 'first_aid_skin' in item) {
    const sds = item as SDSLibraryItem;
    return {
      inhalation: sds.first_aid_inhalation,
      skin: sds.first_aid_skin,
      eyes: sds.first_aid_eyes,
      ingestion: sds.first_aid_ingestion,
    };
  }
  
  // Handle extracting specific control types from recommended_controls
  if (source === 'hazards' && 'recommended_controls' in item) {
    const hazard = item as HazardLibraryItem;
    if (field === 'engineering_controls') {
      return hazard.recommended_controls
        .filter(c => c.type === 'engineering')
        .map(c => c.control);
    }
    if (field === 'administrative_controls') {
      return hazard.recommended_controls
        .filter(c => c.type === 'administrative')
        .map(c => c.control);
    }
    if (field === 'ppe_controls') {
      return hazard.recommended_controls
        .filter(c => c.type === 'ppe')
        .map(c => c.control);
    }
  }
  
  // Default: get direct field value
  return getNestedValue(item, field);
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    return current && typeof current === 'object'
      // eslint-disable-next-line security/detect-object-injection -- Safe: key from path.split('.')
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Format a library item for display in a dropdown
 */
export function formatLibraryItemLabel(item: LibraryItem, source: LibrarySource): string {
  switch (source) {
    case 'hazards': {
      const h = item as HazardLibraryItem;
      return h.name;
    }
    case 'equipment': {
      const e = item as EquipmentLibraryItem;
      return `${e.equipment_number}: ${e.name}`;
    }
    case 'tasks': {
      const t = item as TaskLibraryItem;
      return t.name;
    }
    case 'workers': {
      const w = item as WorkerLibraryItem;
      return `${w.first_name} ${w.last_name}`;
    }
    case 'jobsites': {
      const j = item as JobsiteLibraryItem;
      return `${j.jobsite_number}: ${j.name}`;
    }
    case 'sds': {
      const s = item as SDSLibraryItem;
      return s.product_name;
    }
    default:
      return 'id' in item ? String(item.id) : 'Unknown';
  }
}

/**
 * Format a library item for display with additional details
 */
export function formatLibraryItemDescription(item: LibraryItem, source: LibrarySource): string | null {
  switch (source) {
    case 'hazards': {
      const h = item as HazardLibraryItem;
      return h.description;
    }
    case 'equipment': {
      const e = item as EquipmentLibraryItem;
      return [e.make, e.model].filter(Boolean).join(' ') || e.equipment_type;
    }
    case 'tasks': {
      const t = item as TaskLibraryItem;
      return t.description;
    }
    case 'workers': {
      const w = item as WorkerLibraryItem;
      return w.position;
    }
    case 'jobsites': {
      const j = item as JobsiteLibraryItem;
      return j.address;
    }
    case 'sds': {
      const s = item as SDSLibraryItem;
      return s.manufacturer;
    }
    default:
      return null;
  }
}

/**
 * Get the ID field for a library item
 */
export function getLibraryItemId(item: LibraryItem): string {
  return (item as { id: string }).id;
}

// =============================================================================
// Quick Add Support
// =============================================================================

export interface QuickAddData {
  name: string;
  [key: string]: unknown;
}

/**
 * Quick add a new item to a library
 */
export async function quickAddLibraryItem(
  source: LibrarySource,
  data: QuickAddData,
  companyId: string
): Promise<LibraryItem | null> {
  const supabase = createClient();
  
  const tableMap: Record<LibrarySource, string> = {
    hazards: 'hazard_library',
    equipment: 'equipment_inventory',
    tasks: 'job_task_library',
    workers: 'workers',
    jobsites: 'jobsites',
    sds: 'sds_library',
    legislation: 'legislation_library',
  };
  
  // Safe: source is a typed LibrarySource enum
  // eslint-disable-next-line security/detect-object-injection
  const table = tableMap[source];
  if (!table) return null;
  
  // Add company_id to the data
  const insertData = {
    ...data,
    company_id: companyId,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  
  const { data: result, error } = await supabase
    .from(table)
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error(`Error quick-adding to ${source}:`, error);
    return null;
  }
  
  return result;
}

// =============================================================================
// Search Support
// =============================================================================

/**
 * Search a library with text query
 */
export async function searchLibrary(
  source: LibrarySource,
  searchTerm: string,
  companyId?: string,
  limit: number = 20
): Promise<LibraryItem[]> {
  return fetchLibraryItems(
    source,
    { search: searchTerm },
    companyId
  ).then(items => items.slice(0, limit));
}


