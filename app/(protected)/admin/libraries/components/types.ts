// ============================================================================
// MASTER LIBRARY TYPES
// ============================================================================

// Hazard Library Types
export type HazardCategory = 
  | 'physical'
  | 'chemical'
  | 'biological'
  | 'ergonomic'
  | 'psychosocial'
  | 'electrical'
  | 'mechanical'
  | 'fall'
  | 'struck_by'
  | 'caught_in'
  | 'environmental'
  | 'fire_explosion'
  | 'confined_space'
  | 'radiation'
  | 'other';

export type RiskLevel = 'negligible' | 'low' | 'medium' | 'high' | 'critical';

export interface HazardControl {
  type: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
  control: string;
  required: boolean;
}

export interface RegulatoryReference {
  regulation: string;
  section: string;
  title: string;
}

export interface Hazard {
  id: string;
  hazard_code: string;
  name: string;
  description: string | null;
  category: HazardCategory;
  subcategory: string | null;
  applicable_trades: string[];
  applicable_activities: string[];
  default_severity: number;
  default_likelihood: number;
  default_risk_score: number;
  default_risk_level: RiskLevel;
  recommended_controls: HazardControl[];
  required_ppe: string[];
  regulatory_references: RegulatoryReference[];
  is_active: boolean;
  is_global: boolean;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

// Equipment Types
export type EquipmentStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

export interface Equipment {
  id: string;
  company_id: string;
  equipment_code: string;
  name: string;
  equipment_type: string;
  category: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  status: EquipmentStatus;
  current_location: string | null;
  assigned_to: string | null;
  assigned_jobsite_id: string | null;
  inspection_frequency_days: number;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  inspection_status: 'current' | 'due_soon' | 'overdue' | 'na';
  notes: string | null;
  photo_url: string | null;
  certifications_required: string[];
  created_at: string;
  updated_at: string;
}

// Task Library Types
export interface TaskHazardMapping {
  hazard_id: string;
  hazard_name: string;
  risk_level: RiskLevel;
}

export interface Task {
  id: string;
  company_id: string | null;
  task_code: string;
  name: string;
  description: string | null;
  category: string;
  trade: string;
  typical_duration_hours: number | null;
  crew_size_min: number | null;
  crew_size_max: number | null;
  procedure_steps: string[];
  hazards: TaskHazardMapping[];
  required_equipment: string[];
  required_certifications: string[];
  ppe_required: string[];
  is_active: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

// Jobsite Types
export interface JobsiteEmergencyContact {
  name: string;
  role: string;
  phone: string;
}

export interface Jobsite {
  id: string;
  company_id: string;
  jobsite_code: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  client_name: string | null;
  project_value: number | null;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'closed';
  supervisor_id: string | null;
  supervisor_name: string | null;
  emergency_contacts: JobsiteEmergencyContact[];
  site_specific_hazards: string[];
  nearest_hospital: string | null;
  emergency_assembly_point: string | null;
  access_instructions: string | null;
  worker_count: number;
  equipment_count: number;
  created_at: string;
  updated_at: string;
}

// SDS Library Types
export type WHMISHazardClass = 
  | 'flammable_gases'
  | 'flammable_liquids'
  | 'flammable_solids'
  | 'oxidizers'
  | 'gases_under_pressure'
  | 'acute_toxicity'
  | 'skin_corrosion'
  | 'serious_eye_damage'
  | 'respiratory_sensitization'
  | 'skin_sensitization'
  | 'carcinogenicity'
  | 'reproductive_toxicity'
  | 'specific_target_organ'
  | 'aspiration_hazard'
  | 'aquatic_toxicity'
  | 'biohazard';

export interface SDSEntry {
  id: string;
  company_id: string;
  product_name: string;
  manufacturer: string;
  product_identifier: string | null;
  sds_revision_date: string | null;
  whmis_hazard_classes: WHMISHazardClass[];
  hazard_statements: string[];
  precautionary_statements: string[];
  first_aid_measures: Record<string, string>;
  ppe_required: string[];
  storage_requirements: string | null;
  disposal_requirements: string | null;
  emergency_phone: string | null;
  sds_file_url: string | null;
  locations: string[];
  review_date: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

// Legislation Types
export interface LegislationSection {
  id: string;
  section_number: string;
  title: string;
  summary: string | null;
  full_text: string | null;
  is_bookmarked: boolean;
}

export interface Legislation {
  id: string;
  short_name: string;
  full_name: string;
  jurisdiction: string;
  effective_date: string | null;
  last_amended: string | null;
  description: string | null;
  url: string | null;
  sections: LegislationSection[];
}

// Filter/Search Types
export interface HazardFilters {
  search: string;
  categories: HazardCategory[];
  trades: string[];
  riskLevels: RiskLevel[];
  showInactive: boolean;
}

export interface EquipmentFilters {
  search: string;
  types: string[];
  statuses: EquipmentStatus[];
  locations: string[];
  inspectionStatus: ('current' | 'due_soon' | 'overdue')[];
}

// Risk level display configuration
export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Critical', color: 'text-white', bgColor: 'bg-black', icon: '⚫' },
  high: { label: 'High', color: 'text-white', bgColor: 'bg-red-600', icon: '🔴' },
  medium: { label: 'Medium', color: 'text-black', bgColor: 'bg-orange-400', icon: '🟠' },
  low: { label: 'Low', color: 'text-black', bgColor: 'bg-yellow-400', icon: '🟡' },
  negligible: { label: 'Negligible', color: 'text-black', bgColor: 'bg-green-400', icon: '🟢' },
};

// Hazard category display configuration
export const HAZARD_CATEGORY_CONFIG: Record<HazardCategory, { label: string; icon: string; description: string }> = {
  physical: { label: 'Physical', icon: '💥', description: 'Noise, vibration, temperature' },
  chemical: { label: 'Chemical', icon: '🧪', description: 'Dust, fumes, solvents' },
  biological: { label: 'Biological', icon: '🦠', description: 'Mold, bacteria, pathogens' },
  ergonomic: { label: 'Ergonomic', icon: '🏋️', description: 'Lifting, posture, repetition' },
  psychosocial: { label: 'Psychosocial', icon: '🧠', description: 'Stress, fatigue, harassment' },
  electrical: { label: 'Electrical', icon: '⚡', description: 'Live circuits, powerlines' },
  mechanical: { label: 'Mechanical', icon: '⚙️', description: 'Moving parts, pinch points' },
  fall: { label: 'Falls', icon: '⬇️', description: 'Heights, slips, trips' },
  struck_by: { label: 'Struck By', icon: '🎯', description: 'Falling objects, debris' },
  caught_in: { label: 'Caught In', icon: '🔒', description: 'Machinery, cave-ins' },
  environmental: { label: 'Environmental', icon: '🌡️', description: 'Weather, terrain' },
  fire_explosion: { label: 'Fire/Explosion', icon: '🔥', description: 'Hot work, flammables' },
  confined_space: { label: 'Confined Space', icon: '🚪', description: 'Atmospheres, engulfment' },
  radiation: { label: 'Radiation', icon: '☢️', description: 'UV, welding arc' },
  other: { label: 'Other', icon: '📌', description: 'Miscellaneous' },
};

// WHMIS pictogram configuration
export const WHMIS_PICTOGRAMS: Record<WHMISHazardClass, { icon: string; label: string }> = {
  flammable_gases: { icon: '🔥', label: 'Flammable Gas' },
  flammable_liquids: { icon: '🔥', label: 'Flammable Liquid' },
  flammable_solids: { icon: '🔥', label: 'Flammable Solid' },
  oxidizers: { icon: '⭕', label: 'Oxidizer' },
  gases_under_pressure: { icon: '💨', label: 'Gas Under Pressure' },
  acute_toxicity: { icon: '☠️', label: 'Acute Toxicity' },
  skin_corrosion: { icon: '🧴', label: 'Corrosive' },
  serious_eye_damage: { icon: '👁️', label: 'Eye Damage' },
  respiratory_sensitization: { icon: '🫁', label: 'Respiratory Sensitizer' },
  skin_sensitization: { icon: '⚠️', label: 'Skin Sensitizer' },
  carcinogenicity: { icon: '⚠️', label: 'Carcinogen' },
  reproductive_toxicity: { icon: '⚠️', label: 'Reproductive Toxicity' },
  specific_target_organ: { icon: '⚠️', label: 'Organ Toxicity' },
  aspiration_hazard: { icon: '⚠️', label: 'Aspiration Hazard' },
  aquatic_toxicity: { icon: '🐟', label: 'Environmental Hazard' },
  biohazard: { icon: '☣️', label: 'Biohazard' },
};
