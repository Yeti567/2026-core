/**
 * Equipment Inspection Form Types
 * COR Element 13 - Equipment Inspection
 */

import type { BaseFormData } from '@/lib/sync/form-submission';

// =============================================================================
// CHECKLIST ITEM TYPES
// =============================================================================

export interface ChecklistItem {
  id: string;
  item: string;
  category: string;
  result: 'pass' | 'fail' | 'na' | '';
  notes?: string;
}

export interface Deficiency {
  id: string;
  description: string;
  checklist_item_id?: string;
  severity: 'minor' | 'major' | 'critical';
  photo?: string; // base64
  repair_required: boolean;
  repair_time_estimate?: string;
  parts_needed?: string;
  technician_required: boolean;
  cost_estimate?: number;
}

// =============================================================================
// EQUIPMENT TYPES & CHECKLISTS
// =============================================================================

export const EQUIPMENT_TYPES = [
  { value: 'extension_ladder', label: 'Extension Ladder', inspectionFrequency: 'daily' },
  { value: 'step_ladder', label: 'Step Ladder', inspectionFrequency: 'daily' },
  { value: 'scaffolding', label: 'Scaffolding', inspectionFrequency: 'daily' },
  { value: 'mewp_scissor_lift', label: 'MEWP/Scissor Lift', inspectionFrequency: 'daily' },
  { value: 'excavator', label: 'Excavator', inspectionFrequency: 'daily' },
  { value: 'skid_steer', label: 'Skid Steer', inspectionFrequency: 'daily' },
  { value: 'concrete_mixer', label: 'Concrete Mixer', inspectionFrequency: 'weekly' },
  { value: 'generator', label: 'Generator', inspectionFrequency: 'weekly' },
  { value: 'compressor', label: 'Compressor', inspectionFrequency: 'weekly' },
  { value: 'power_tools', label: 'Power Tools', inspectionFrequency: 'daily' },
  { value: 'hand_tools', label: 'Hand Tools', inspectionFrequency: 'daily' },
  { value: 'fall_protection', label: 'Fall Protection Equipment', inspectionFrequency: 'daily' },
  { value: 'slings_rigging', label: 'Slings & Rigging', inspectionFrequency: 'daily' },
  { value: 'formwork_shoring', label: 'Formwork/Shoring', inspectionFrequency: 'daily' },
  { value: 'other', label: 'Other (Custom)', inspectionFrequency: 'daily' },
] as const;

export type EquipmentType = typeof EQUIPMENT_TYPES[number]['value'];

export const EQUIPMENT_CHECKLISTS: Record<string, Array<{ id: string; item: string; category: string }>> = {
  extension_ladder: [
    { id: 'el1', item: 'Rails not bent, broken, or damaged', category: 'Structure' },
    { id: 'el2', item: 'Rungs secure and not loose', category: 'Structure' },
    { id: 'el3', item: 'Feet in good condition, not worn', category: 'Safety' },
    { id: 'el4', item: 'Rope and pulley working', category: 'Function' },
    { id: 'el5', item: 'Locks functioning properly', category: 'Function' },
    { id: 'el6', item: 'Labels/stickers readable', category: 'Compliance' },
    { id: 'el7', item: 'No oil, grease, or slippery substances', category: 'Safety' },
    { id: 'el8', item: 'Overall condition acceptable', category: 'General' },
  ],
  step_ladder: [
    { id: 'sl1', item: 'Rails not bent, broken, or damaged', category: 'Structure' },
    { id: 'sl2', item: 'Rungs secure and not loose', category: 'Structure' },
    { id: 'sl3', item: 'Feet/pads in good condition', category: 'Safety' },
    { id: 'sl4', item: 'Spreaders lock properly', category: 'Function' },
    { id: 'sl5', item: 'Top platform stable (if present)', category: 'Structure' },
    { id: 'sl6', item: 'Labels/stickers readable', category: 'Compliance' },
    { id: 'sl7', item: 'No oil, grease, or slippery substances', category: 'Safety' },
    { id: 'sl8', item: 'Overall condition acceptable', category: 'General' },
  ],
  scaffolding: [
    { id: 'sc1', item: 'Base plates level and secure', category: 'Foundation' },
    { id: 'sc2', item: 'Frames properly connected', category: 'Structure' },
    { id: 'sc3', item: 'Cross-bracing in place', category: 'Structure' },
    { id: 'sc4', item: 'Planks secured and no gaps', category: 'Platform' },
    { id: 'sc5', item: 'Guardrails installed (top rail)', category: 'Fall Protection' },
    { id: 'sc6', item: 'Guardrails installed (mid rail)', category: 'Fall Protection' },
    { id: 'sc7', item: 'Toe boards in place', category: 'Fall Protection' },
    { id: 'sc8', item: 'Access ladder properly secured', category: 'Access' },
    { id: 'sc9', item: 'Tie-offs to structure (every 26\' vertical)', category: 'Stability' },
    { id: 'sc10', item: 'No overloading (check load capacity)', category: 'Load' },
    { id: 'sc11', item: 'Weather conditions acceptable', category: 'Environment' },
    { id: 'sc12', item: 'Scaffold tag present and current', category: 'Compliance' },
  ],
  mewp_scissor_lift: [
    { id: 'mewp1', item: 'Pre-start walk-around completed', category: 'General' },
    { id: 'mewp2', item: 'Tires/tracks in good condition', category: 'Mobility' },
    { id: 'mewp3', item: 'No fluid leaks', category: 'Fluids' },
    { id: 'mewp4', item: 'Controls functioning properly', category: 'Controls' },
    { id: 'mewp5', item: 'Emergency lowering system tested', category: 'Emergency' },
    { id: 'mewp6', item: 'Platform guardrails intact', category: 'Fall Protection' },
    { id: 'mewp7', item: 'Safety decals visible', category: 'Compliance' },
    { id: 'mewp8', item: 'Horn/alarm operational', category: 'Safety' },
    { id: 'mewp9', item: 'Emergency stop button works', category: 'Emergency' },
    { id: 'mewp10', item: 'Battery charged/fuel adequate', category: 'Power' },
    { id: 'mewp11', item: 'Logbook up to date', category: 'Compliance' },
    { id: 'mewp12', item: 'Outriggers/stabilizers functional (if equipped)', category: 'Stability' },
  ],
  fall_protection: [
    { id: 'fp1', item: 'Harness: no cuts, tears, or burns', category: 'Harness' },
    { id: 'fp2', item: 'Harness: stitching intact', category: 'Harness' },
    { id: 'fp3', item: 'Harness: D-ring not bent or damaged', category: 'Harness' },
    { id: 'fp4', item: 'Harness: buckles function properly', category: 'Harness' },
    { id: 'fp5', item: 'Harness: labels/tags readable', category: 'Harness' },
    { id: 'fp6', item: 'Lanyard: no cuts or fraying', category: 'Lanyard' },
    { id: 'fp7', item: 'Lanyard: shock absorber not deployed', category: 'Lanyard' },
    { id: 'fp8', item: 'Lanyard: snap hooks close properly', category: 'Lanyard' },
    { id: 'fp9', item: 'Lanyard: no rust or corrosion', category: 'Lanyard' },
    { id: 'fp10', item: 'Lifeline: no cuts or abrasions', category: 'Lifeline' },
    { id: 'fp11', item: 'Lifeline: rope grab slides freely', category: 'Lifeline' },
    { id: 'fp12', item: 'Anchor point: rated for 5000 lbs', category: 'Anchor' },
    { id: 'fp13', item: 'Last formal inspection within 12 months', category: 'Compliance' },
  ],
  excavator: [
    { id: 'ex1', item: 'Engine oil level adequate', category: 'Fluids' },
    { id: 'ex2', item: 'Hydraulic fluid level adequate', category: 'Fluids' },
    { id: 'ex3', item: 'Coolant level adequate', category: 'Fluids' },
    { id: 'ex4', item: 'No hydraulic leaks', category: 'Fluids' },
    { id: 'ex5', item: 'Tracks/undercarriage in good condition', category: 'Mobility' },
    { id: 'ex6', item: 'Bucket teeth secure', category: 'Attachment' },
    { id: 'ex7', item: 'Boom/arm pins secure', category: 'Structure' },
    { id: 'ex8', item: 'Cab glass intact', category: 'Cab' },
    { id: 'ex9', item: 'Seat belt functional', category: 'Safety' },
    { id: 'ex10', item: 'Mirrors clean and positioned', category: 'Visibility' },
    { id: 'ex11', item: 'Backup alarm working', category: 'Safety' },
    { id: 'ex12', item: 'Lights operational (if required)', category: 'Visibility' },
    { id: 'ex13', item: 'Fire extinguisher charged', category: 'Emergency' },
    { id: 'ex14', item: 'Logbook entries current', category: 'Compliance' },
  ],
  skid_steer: [
    { id: 'ss1', item: 'Engine oil level adequate', category: 'Fluids' },
    { id: 'ss2', item: 'Hydraulic fluid level adequate', category: 'Fluids' },
    { id: 'ss3', item: 'No fluid leaks', category: 'Fluids' },
    { id: 'ss4', item: 'Tires/tracks in good condition', category: 'Mobility' },
    { id: 'ss5', item: 'Bucket/attachment secure', category: 'Attachment' },
    { id: 'ss6', item: 'ROPS/FOPS intact', category: 'Structure' },
    { id: 'ss7', item: 'Seat belt/bar functional', category: 'Safety' },
    { id: 'ss8', item: 'Controls responsive', category: 'Controls' },
    { id: 'ss9', item: 'Backup alarm working', category: 'Safety' },
    { id: 'ss10', item: 'Lights operational', category: 'Visibility' },
    { id: 'ss11', item: 'Fire extinguisher charged', category: 'Emergency' },
  ],
  concrete_mixer: [
    { id: 'cm1', item: 'Drum rotates freely', category: 'Function' },
    { id: 'cm2', item: 'Drum not cracked or damaged', category: 'Structure' },
    { id: 'cm3', item: 'Motor/engine running smoothly', category: 'Power' },
    { id: 'cm4', item: 'Guards in place', category: 'Safety' },
    { id: 'cm5', item: 'Controls functioning', category: 'Controls' },
    { id: 'cm6', item: 'Wheels/stand stable', category: 'Stability' },
    { id: 'cm7', item: 'Emergency stop works', category: 'Emergency' },
  ],
  generator: [
    { id: 'gn1', item: 'Fuel level adequate', category: 'Fuel' },
    { id: 'gn2', item: 'Oil level adequate', category: 'Fluids' },
    { id: 'gn3', item: 'No fuel leaks', category: 'Safety' },
    { id: 'gn4', item: 'Exhaust system intact', category: 'Exhaust' },
    { id: 'gn5', item: 'Grounding proper', category: 'Electrical' },
    { id: 'gn6', item: 'Outlets not damaged', category: 'Electrical' },
    { id: 'gn7', item: 'Cord connections secure', category: 'Electrical' },
    { id: 'gn8', item: 'Starts properly', category: 'Function' },
  ],
  compressor: [
    { id: 'cp1', item: 'Oil level adequate', category: 'Fluids' },
    { id: 'cp2', item: 'No air leaks', category: 'Function' },
    { id: 'cp3', item: 'Pressure gauge working', category: 'Gauges' },
    { id: 'cp4', item: 'Safety valve functional', category: 'Safety' },
    { id: 'cp5', item: 'Hoses in good condition', category: 'Hoses' },
    { id: 'cp6', item: 'Couplings secure', category: 'Connections' },
    { id: 'cp7', item: 'Belt/motor in good condition', category: 'Power' },
    { id: 'cp8', item: 'Tank not corroded', category: 'Structure' },
  ],
  power_tools: [
    { id: 'pt1', item: 'Cord not frayed or damaged', category: 'Electrical' },
    { id: 'pt2', item: 'Plug intact (3-prong if required)', category: 'Electrical' },
    { id: 'pt3', item: 'Guard in place and functional', category: 'Safety' },
    { id: 'pt4', item: 'Trigger/switch works properly', category: 'Controls' },
    { id: 'pt5', item: 'Blade/bit in good condition', category: 'Accessories' },
    { id: 'pt6', item: 'Handle secure', category: 'Structure' },
    { id: 'pt7', item: 'No unusual noise/vibration', category: 'Function' },
    { id: 'pt8', item: 'Tool runs smoothly', category: 'Function' },
  ],
  hand_tools: [
    { id: 'ht1', item: 'Handle secure and not cracked', category: 'Structure' },
    { id: 'ht2', item: 'Head secure (hammers, axes)', category: 'Structure' },
    { id: 'ht3', item: 'Cutting edge sharp (where applicable)', category: 'Function' },
    { id: 'ht4', item: 'No mushroomed heads (chisels)', category: 'Safety' },
    { id: 'ht5', item: 'No rust or corrosion', category: 'Condition' },
    { id: 'ht6', item: 'Proper tool for the job', category: 'Selection' },
  ],
  slings_rigging: [
    { id: 'sr1', item: 'No cuts, nicks, or gouges', category: 'Condition' },
    { id: 'sr2', item: 'No kinks or bird-caging (wire rope)', category: 'Condition' },
    { id: 'sr3', item: 'No broken wires (wire rope)', category: 'Condition' },
    { id: 'sr4', item: 'No excessive wear', category: 'Condition' },
    { id: 'sr5', item: 'Hooks not bent or cracked', category: 'Hardware' },
    { id: 'sr6', item: 'Safety latches functional', category: 'Hardware' },
    { id: 'sr7', item: 'Load rating tag readable', category: 'Compliance' },
    { id: 'sr8', item: 'Shackles not deformed', category: 'Hardware' },
    { id: 'sr9', item: 'Thimbles in place (where required)', category: 'Hardware' },
  ],
  formwork_shoring: [
    { id: 'fs1', item: 'Shores plumb and braced', category: 'Structure' },
    { id: 'fs2', item: 'Base plates on solid ground', category: 'Foundation' },
    { id: 'fs3', item: 'No bent or damaged components', category: 'Condition' },
    { id: 'fs4', item: 'Pins/clips in place', category: 'Connections' },
    { id: 'fs5', item: 'Load capacity adequate', category: 'Load' },
    { id: 'fs6', item: 'Ties/braces secure', category: 'Stability' },
    { id: 'fs7', item: 'Engineer\'s drawings followed', category: 'Compliance' },
  ],
  other: [
    { id: 'ot1', item: 'General condition acceptable', category: 'General' },
    { id: 'ot2', item: 'All safety features functional', category: 'Safety' },
    { id: 'ot3', item: 'No visible damage', category: 'Condition' },
    { id: 'ot4', item: 'Proper operation verified', category: 'Function' },
  ],
};

export const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor', description: 'Does not affect safe operation, monitor', color: 'amber' },
  { value: 'major', label: 'Major', description: 'Affects operation, repair needed soon', color: 'orange' },
  { value: 'critical', label: 'Critical', description: 'Unsafe to operate, immediate OOS', color: 'red' },
] as const;

export const MAINTENANCE_TYPES = [
  'Oil change',
  'Filter replacement',
  'Hydraulic fluid change',
  'Greasing/lubrication',
  'Calibration',
  'Load test',
  'Electrical inspection',
  'Belt replacement',
  'Brake inspection',
  'Tire/track replacement',
  'Annual certification',
  'Other',
] as const;

// =============================================================================
// MAIN INTERFACE
// =============================================================================

export interface EquipmentInspection extends BaseFormData {
  id?: string;
  inspection_number: string; // EQP-LIFT-001-2025-042
  company_id: string;
  
  // Equipment identification
  equipment_id: string;
  equipment_type: EquipmentType;
  custom_equipment_type?: string;
  equipment_serial: string;
  equipment_make?: string;
  equipment_model?: string;
  purchase_date?: string;
  last_inspection_date?: string;
  last_maintenance_date?: string;
  
  // Inspection details
  inspection_date: string;
  inspection_time: string;
  inspector_id: string;
  inspector_name: string;
  jobsite_id: string;
  
  // Checklist
  checklist_items: ChecklistItem[];
  
  // Deficiencies
  deficiencies: Deficiency[];
  
  // Out of service
  out_of_service: boolean;
  oos_tag_number?: string;
  oos_reason?: string;
  oos_tagged_by_signature?: string;
  oos_tag_photo?: string;
  
  // Maintenance
  maintenance_due: boolean;
  maintenance_required: string[];
  maintenance_scheduled_date?: string;
  maintenance_notes?: string;
  
  // Operator verification
  operator_id: string;
  operator_name: string;
  operator_licensed: boolean;
  operator_license_type?: string;
  operator_license_expiry?: string;
  operator_trained: boolean;
  operator_signature: string;
  
  // Result
  overall_result: 'pass' | 'conditional_pass' | 'fail' | '';
  inspector_signature: string;
  inspector_date: string;
  next_inspection_due: string;
  
  // Audit
  audit_element: string;
}

export const WIZARD_STEPS = [
  { id: 'equipment', label: 'Equipment', section: 'A' },
  { id: 'checklist', label: 'Checklist', section: 'B' },
  { id: 'deficiencies', label: 'Deficiencies', section: 'C' },
  { id: 'out-of-service', label: 'OOS Tag', section: 'D' },
  { id: 'maintenance', label: 'Maintenance', section: 'E' },
  { id: 'operator', label: 'Operator', section: 'F' },
  { id: 'signoff', label: 'Sign-off', section: 'G' },
] as const;
