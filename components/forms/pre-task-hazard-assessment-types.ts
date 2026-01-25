/**
 * Pre-Task Hazard Assessment Form Types
 * COR Element 3 - Detailed Hazard Assessment for High-Risk Work
 */

import type { BaseFormData } from '@/lib/sync/form-submission';

// =============================================================================
// RISK MATRIX TYPES
// =============================================================================

export type Likelihood = 1 | 2 | 3 | 4 | 5;
export type Consequence = 1 | 2 | 3 | 4 | 5;
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  1: 'Rare',
  2: 'Unlikely',
  3: 'Possible',
  4: 'Likely',
  5: 'Almost Certain',
};

export const CONSEQUENCE_LABELS: Record<Consequence, string> = {
  1: 'Insignificant',
  2: 'Minor',
  3: 'Moderate',
  4: 'Major',
  5: 'Catastrophic',
};

export const calculateRiskRating = (likelihood: Likelihood, consequence: Consequence): number => {
  return likelihood * consequence;
};

export const getRiskLevel = (rating: number): RiskLevel => {
  if (rating <= 5) return 'low';
  if (rating <= 12) return 'medium';
  if (rating <= 20) return 'high';
  return 'extreme';
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  extreme: 'bg-red-500',
};

// =============================================================================
// CREW MEMBER
// =============================================================================

export interface CrewMember {
  worker_id: string;
  name: string;
  position: string;
  years_experience: number;
  required_certs: string[];
  certs_valid: boolean;
  missing_certs: string[];
  signature: string;
  signed_at?: string;
}

// =============================================================================
// HAZARD TYPES
// =============================================================================

export interface HeightHazard {
  enabled: boolean;
  height_meters: number;
  type: 'ladder' | 'scaffold' | 'mewp' | 'roof' | 'open_edge' | 'other';
  other_type?: string;
  fall_protection_required: boolean;
}

export interface ConfinedSpaceHazard {
  enabled: boolean;
  space_tested: boolean;
  oxygen_level: number;
  lel_reading: number;
  toxic_gases_ppm: number;
  attendant_assigned: boolean;
  attendant_name?: string;
}

export interface ChemicalItem {
  id: string;
  product_name: string;
  sds_reviewed: boolean;
  sds_link?: string;
  hazard_classification: string;
  ppe_required: string[];
}

export interface ElectricalHazard {
  overhead_lines: boolean;
  distance_meters?: number;
  voltage_kv?: number;
  clearance_adequate?: boolean;
  underground_utilities: boolean;
  one_call_completed?: boolean;
  one_call_ticket?: string;
  utilities_marked?: boolean;
  equipment_lockout: boolean;
  loto_required?: boolean;
  loto_by?: string;
}

export interface CraneHazard {
  enabled: boolean;
  lift_plan_completed: boolean;
  load_weight_kg: number;
  crane_capacity_kg: number;
  safety_factor_adequate: boolean;
}

export interface WeatherConditions {
  current: string;
  forecast: string;
  wind_speed_kmh: number;
  temperature_c: number;
  precipitation_expected: boolean;
  lightning_risk: boolean;
  ground_conditions: 'dry' | 'wet' | 'icy' | 'muddy';
  visibility: 'excellent' | 'good' | 'fair' | 'poor';
}

// =============================================================================
// RISK ASSESSMENT
// =============================================================================

export interface ControlMeasures {
  elimination?: string;
  elimination_possible: boolean;
  substitution?: string;
  substitution_possible: boolean;
  engineering: string[];
  administrative: string[];
  permits_required: string[];
  ppe: string[];
}

export interface RiskAssessmentItem {
  id: string;
  hazard: string;
  hazard_category: string;
  likelihood_before: Likelihood;
  consequence_before: Consequence;
  risk_rating_before: number;
  risk_level_before: RiskLevel;
  controls: ControlMeasures;
  likelihood_after: Likelihood;
  consequence_after: Consequence;
  risk_rating_after: number;
  risk_level_after: RiskLevel;
  acceptable: boolean;
}

// =============================================================================
// EMERGENCY RESPONSE
// =============================================================================

export interface EmergencyResponse {
  emergency_numbers_displayed: boolean;
  first_aid_location: string;
  first_aid_attendant: string;
  nearest_hospital: string;
  hospital_distance_km: number;
  evacuation_reviewed: boolean;
  communication_method: 'radio' | 'phone' | 'hand_signals' | 'all';
  fire_extinguisher: boolean;
  fire_extinguisher_location?: string;
  rescue_equipment: boolean;
  rescue_equipment_type?: string;
  spill_kit: boolean;
  spill_kit_location?: string;
  eyewash_station: boolean;
  eyewash_location?: string;
}

// =============================================================================
// PERMITS
// =============================================================================

export interface PermitInfo {
  type: string;
  number: string;
  attached: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const HIGH_RISK_TASKS = [
  { value: 'working_at_heights', label: 'Working at Heights (>10 feet)' },
  { value: 'confined_space', label: 'Confined Space Entry' },
  { value: 'hot_work', label: 'Hot Work (Welding, Cutting, Grinding)' },
  { value: 'excavation', label: 'Excavation (>4 feet deep)' },
  { value: 'crane_operations', label: 'Crane/Heavy Lifting Operations' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'electrical_work', label: 'Electrical Work' },
  { value: 'road_work', label: 'Road/Traffic Work' },
  { value: 'roof_work', label: 'Roof Work' },
  { value: 'other', label: 'Other High-Risk Task' },
] as const;

export const PHYSICAL_HAZARDS = [
  { id: 'heights', label: 'Working at Heights', requiresDetails: true },
  { id: 'struck_by', label: 'Struck by Falling Objects', requiresDetails: false },
  { id: 'slips_trips_falls', label: 'Slips, Trips, Falls', requiresDetails: false },
  { id: 'confined_space', label: 'Confined Spaces', requiresDetails: true },
  { id: 'noise', label: 'Noise Exposure (>85 dB)', requiresDetails: false },
  { id: 'vibration', label: 'Vibration', requiresDetails: false },
  { id: 'temperature', label: 'Temperature Extremes', requiresDetails: false },
] as const;

export const BIOLOGICAL_HAZARDS = [
  'Mold exposure',
  'Bloodborne pathogens',
  'Animal/insect hazards',
  'Infectious disease risk',
] as const;

export const ERGONOMIC_HAZARDS = [
  'Repetitive motion',
  'Awkward postures',
  'Heavy lifting (>23 kg)',
  'Sustained static posture',
] as const;

export const EQUIPMENT_HAZARDS = [
  'Mobile equipment in area',
  'Power tools',
  'Heavy machinery',
  'Cranes/hoisting equipment',
] as const;

export const PPE_OPTIONS = [
  { value: 'hard_hat', label: 'Hard Hat' },
  { value: 'safety_glasses', label: 'Safety Glasses' },
  { value: 'goggles', label: 'Goggles' },
  { value: 'face_shield', label: 'Face Shield' },
  { value: 'hearing_protection', label: 'Hearing Protection' },
  { value: 'respirator_dust', label: 'Respirator (Dust/Particulate)' },
  { value: 'respirator_chemical', label: 'Respirator (Chemical/Organic)' },
  { value: 'scba', label: 'SCBA' },
  { value: 'gloves_leather', label: 'Gloves (Leather)' },
  { value: 'gloves_chemical', label: 'Gloves (Chemical Resistant)' },
  { value: 'gloves_cut', label: 'Gloves (Cut Resistant)' },
  { value: 'safety_boots', label: 'Safety Boots (CSA)' },
  { value: 'hi_vis', label: 'High-Vis Clothing' },
  { value: 'fall_protection', label: 'Fall Protection (Harness + Lanyard)' },
  { value: 'arc_flash', label: 'Arc Flash Suit' },
  { value: 'chemical_suit', label: 'Chemical Suit' },
  { value: 'welding_gear', label: 'Welding PPE' },
] as const;

export const ENGINEERING_CONTROLS = [
  'Guardrails installed',
  'Barricades/barriers',
  'Ventilation system',
  'Machine guards',
  'Dust suppression',
  'Noise barriers',
  'Lighting adequate',
  'Shoring/trench box',
] as const;

export const ADMINISTRATIVE_CONTROLS = [
  'Safe Work Procedure followed',
  'Work area isolated',
  'Signage posted',
  'Warning tape/barriers',
  'Spotter assigned',
  'Traffic control plan',
  'Buddy system',
  'Work rotation schedule',
] as const;

export const PERMIT_TYPES = [
  { value: 'hot_work', label: 'Hot Work Permit' },
  { value: 'confined_space', label: 'Confined Space Entry Permit' },
  { value: 'excavation', label: 'Excavation Permit' },
  { value: 'roof_access', label: 'Roof Access Permit' },
  { value: 'loto', label: 'Lock-out/Tag-out Permit' },
  { value: 'crane_lift', label: 'Crane Lift Permit' },
  { value: 'work_at_height', label: 'Work at Height Permit' },
] as const;

export const WEATHER_OPTIONS = [
  'Clear/Sunny',
  'Partly Cloudy',
  'Overcast',
  'Light Rain',
  'Heavy Rain',
  'Snow',
  'Fog',
  'High Wind',
  'Extreme Heat',
  'Extreme Cold',
] as const;

export const REQUIRED_CERTS: Record<string, string[]> = {
  working_at_heights: ['Working at Heights', 'Fall Protection'],
  confined_space: ['Confined Space Entry', 'Atmospheric Testing'],
  hot_work: ['Hot Work', 'Fire Watch'],
  crane_operations: ['Crane Operator', 'Rigging'],
  electrical_work: ['Electrical Safety', 'LOTO'],
};

export const WIZARD_STEPS = [
  { id: 'task', label: 'Task Info', section: 'A' },
  { id: 'crew', label: 'Crew', section: 'B' },
  { id: 'hazards-physical', label: 'Physical', section: 'C1' },
  { id: 'hazards-chemical', label: 'Chemical', section: 'C2' },
  { id: 'hazards-other', label: 'Other Hazards', section: 'C3-C7' },
  { id: 'risk-assessment', label: 'Risk Matrix', section: 'D' },
  { id: 'controls', label: 'Controls', section: 'E' },
  { id: 'emergency', label: 'Emergency', section: 'F' },
  { id: 'permits', label: 'Permits', section: 'H' },
  { id: 'meeting', label: 'Crew Meeting', section: 'I' },
  { id: 'signoff', label: 'Sign-off', section: 'Final' },
] as const;

// =============================================================================
// MAIN INTERFACE
// =============================================================================

export interface PreTaskHazardAssessment extends BaseFormData {
  id?: string;
  ptha_number: string; // PTHA-2025-001
  company_id: string;
  
  // Section A: Task Information
  task_type: string;
  task_description: string;
  jobsite_id: string;
  specific_location: string;
  date: string;
  start_time: string;
  end_time: string;
  task_lead_id: string;
  task_lead_name: string;
  task_lead_signature: string;
  
  // Section B: Crew
  crew_count: number;
  crew_members: CrewMember[];
  all_crew_briefed: boolean;
  
  // Section C: Hazards
  physical_hazards: string[];
  height_hazard?: HeightHazard;
  confined_space_hazard?: ConfinedSpaceHazard;
  noise_db?: number;
  temperature_c?: number;
  
  chemical_hazards: ChemicalItem[];
  dust_silica_exposure: boolean;
  fumes_gases: boolean;
  asbestos_potential: boolean;
  asbestos_tested?: boolean;
  
  biological_hazards: string[];
  ergonomic_hazards: string[];
  electrical_hazards: ElectricalHazard;
  weather_conditions: WeatherConditions;
  equipment_hazards: string[];
  crane_hazard?: CraneHazard;
  spotter_required: boolean;
  traffic_control_plan: boolean;
  
  // Section D-E: Risk Assessments with Controls
  risk_assessments: RiskAssessmentItem[];
  
  // Section F: Emergency Response
  emergency_response: EmergencyResponse;
  
  // Section G: Stop Work
  stop_work_understood: boolean;
  
  // Section H: Permits
  permits: PermitInfo[];
  
  // Section I: Pre-Task Meeting
  meeting_held: boolean;
  meeting_datetime: string;
  all_attended: boolean;
  hazards_explained: boolean;
  questions_answered: boolean;
  crew_comfortable: boolean;
  concerns_raised?: string;
  
  // Section J: Monitoring
  monitoring_frequency: 'hourly' | '2_hours' | 'continuous';
  designated_monitor: string;
  
  // Approvals
  supervisor_signature: string;
  supervisor_date: string;
  safety_manager_signature?: string;
  safety_manager_date?: string;
  client_signature?: string;
  client_date?: string;
  
  // Status
  highest_risk_level: RiskLevel;
  can_proceed: boolean;
  approval_required_from: 'supervisor' | 'safety_manager' | 'both';
  form_status: 'draft' | 'approved' | 'work_in_progress' | 'completed' | 'rejected';
  audit_element: string;
}
