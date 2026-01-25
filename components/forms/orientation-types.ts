/**
 * Worker Orientation Form Types
 * COR Element 4 - New Worker Orientation
 */

import type { BaseFormData } from '@/lib/sync/form-submission';
import type { CapturedPhoto } from '@/components/ui/photo-capture';

// =============================================================================
// CORE TYPES
// =============================================================================

export interface PPEItem {
  item: string;
  size?: string;
  serial_number?: string;
  issued_date: string;
}

export interface SiteHazard {
  hazard: string;
  controls: string;
  ppe_required: string[];
  swp_reference?: string;
}

export interface KeyPersonnel {
  role: string;
  name: string;
  signature: string;
  date: string;
}

export interface MandatoryTraining {
  course: string;
  completed: boolean;
  certificate_url?: string;
  expiry_date?: string;
}

export interface TrainingRequired {
  course: string;
  target_date: string;
  provider: string;
}

export interface SWPReviewed {
  swp_name: string;
  reviewed: boolean;
  worker_initials: string;
  date: string;
}

export interface CompetencyDemo {
  task: string;
  result: 'pass' | 'fail' | 'needs_practice' | '';
  evaluator_id: string;
  evaluator_signature: string;
  date: string;
  notes?: string;
}

export interface BuddyCheckIn {
  day: number;
  date: string;
  notes: string;
  concerns: string;
  buddy_signature: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  answer: string;
  correct: boolean;
}

// =============================================================================
// MAIN ORIENTATION INTERFACE
// =============================================================================

export interface WorkerOrientation extends BaseFormData {
  id?: string;
  orientation_number: string; // ORI-2025-001
  company_id: string;
  worker_id: string;
  hire_date: string;
  start_date: string; // First day of orientation

  // Section A: Worker Information
  worker_name: string;
  position: string;
  previous_experience: boolean;
  years_experience?: number;
  previous_training: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;

  // Section B: Admin
  paperwork: {
    tax_forms: boolean;
    wsib_confirmed: boolean;
    emergency_contact_form: boolean;
    banking: boolean;
    criminal_check?: boolean;
  };
  ppe_issued: PPEItem[];
  policies_reviewed: string[];
  worker_receipt_signature: string;
  admin_signature: string;
  admin_date: string;

  // Section C: Safety
  worker_rights: {
    right_to_know: boolean;
    right_to_participate: boolean;
    right_to_refuse: boolean;
    responsibilities: boolean;
  };
  right_to_refuse_quiz_answer: string;
  worker_rights_signature: string;
  safety_policies_reviewed: string[];
  site_tour_completed: boolean;
  site_tour_date: string;
  site_tour_time: string;
  site_hazards: SiteHazard[];
  site_rules_explained: string[];
  site_photos: CapturedPhoto[];
  emergency_assembly_shown: boolean;
  emergency_phones_posted: boolean;
  fire_extinguisher_shown: boolean;
  first_aid_shown: boolean;
  nearest_hospital: string;
  evacuation_explained: boolean;
  severe_weather_explained: boolean;
  emergency_contacts_provided: boolean;
  emergency_quiz_answer: string;
  key_personnel: KeyPersonnel[];
  buddy_assigned: boolean;
  buddy_id?: string;
  buddy_name?: string;
  equipment_signout_explained: boolean;
  personal_tool_policy: boolean;
  tool_inspection_explained: boolean;
  lockout_tagout_explained: boolean;
  lockout_demo_passed: boolean;
  lockout_evaluator_signature: string;
  mobile_equipment_explained: boolean;

  // Section D: Training
  mandatory_training: MandatoryTraining[];
  training_required: TrainingRequired[];
  swp_reviewed: SWPReviewed[];
  competency_demos: CompetencyDemo[];

  // Section E: Final Sign-off
  worker_questions_answered: boolean;
  outstanding_questions?: string;
  worker_understands_requirements: boolean;
  worker_comfortable: boolean;
  buddy_extension_needed: boolean;
  buddy_extension_days?: number;
  worker_declaration_signature: string;
  worker_declaration_date: string;
  supervisor_ready_independent: boolean;
  supervisor_signature: string;
  supervisor_date: string;
  supervisor_notes?: string;
  safety_manager_signature: string;
  safety_manager_date: string;

  // Quiz/Assessment
  quiz_taken: boolean;
  quiz_questions: QuizQuestion[];
  quiz_score?: number;
  quiz_passed: boolean;

  // Buddy tracking
  buddy_check_ins: BuddyCheckIn[];
  buddy_final_signoff: boolean;
  buddy_final_signature?: string;
  buddy_final_date?: string;

  // Status tracking
  completion_percentage: number;
  current_day: 1 | 2 | 3;
  days_to_complete: number;
  form_status: 'in_progress' | 'completed' | 'extended' | 'failed';
  audit_element: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SITE_HAZARDS_OPTIONS = [
  { value: 'working_at_heights', label: 'Working at Heights' },
  { value: 'excavations', label: 'Excavations/Trenches' },
  { value: 'confined_spaces', label: 'Confined Spaces' },
  { value: 'electrical', label: 'Electrical Hazards' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'overhead_work', label: 'Overhead Work' },
  { value: 'noise', label: 'Noise' },
  { value: 'dust_silica', label: 'Dust/Silica' },
  { value: 'chemical', label: 'Chemical Exposure' },
] as const;

export const PPE_OPTIONS = [
  { value: 'hard_hat', label: 'Hard Hat', hasSize: true, hasSerial: true },
  { value: 'safety_glasses', label: 'Safety Glasses', hasSize: false, hasSerial: false },
  { value: 'safety_boots', label: 'Safety Boots (CSA Approved)', hasSize: true, hasSerial: false },
  { value: 'hi_vis_vest', label: 'High-Visibility Vest', hasSize: true, hasSerial: false },
  { value: 'gloves', label: 'Gloves', hasSize: true, hasSerial: false },
  { value: 'hearing_protection', label: 'Hearing Protection', hasSize: false, hasSerial: false },
  { value: 'respirator', label: 'Respirator', hasSize: true, hasSerial: true },
] as const;

export const POLICIES_OPTIONS = [
  'Code of Conduct',
  'Drug & Alcohol Policy',
  'Harassment & Discrimination Policy',
  'Disciplinary Procedures',
  'Pay & Benefits',
] as const;

export const SAFETY_POLICIES_OPTIONS = [
  'Health & Safety Policy',
  'Safety Rules & Regulations',
  'Consequences of Violations',
  'Incident Reporting Procedures',
  'Stop Work Authority',
  'Zero Tolerance - Violence',
  'Zero Tolerance - Harassment',
  'Zero Tolerance - Substance Abuse',
] as const;

export const SITE_RULES_OPTIONS = [
  'No smoking areas',
  'Parking locations',
  'Break areas',
  'Washroom locations',
  'First aid station location',
  'Fire extinguisher locations',
  'Emergency assembly point',
] as const;

export const MANDATORY_TRAINING_OPTIONS = [
  { value: 'whmis', label: 'WHMIS 2015', expiry_years: null },
  { value: 'working_at_heights', label: 'Working at Heights', expiry_years: 3 },
  { value: 'fall_protection', label: 'Fall Protection', expiry_years: null },
  { value: 'confined_space', label: 'Confined Space Entry', expiry_years: null },
  { value: 'propane', label: 'Propane Handling', expiry_years: null },
  { value: 'forklift', label: 'Forklift/Equipment Operator', expiry_years: null },
  { value: 'first_aid', label: 'First Aid/CPR', expiry_years: 3 },
  { value: 'scaffolding', label: 'Scaffolding Erection', expiry_years: null },
] as const;

export const KEY_PERSONNEL_ROLES = [
  'Immediate Supervisor',
  'Health & Safety Representative',
  'Site Foreman',
  'First Aid Attendant',
] as const;

export const QUIZ_QUESTIONS_BANK: Array<{ id: string; question: string; category: string; correctAnswer: string }> = [
  { id: 'q1', question: 'What are the three worker rights under OHSA?', category: 'rights', correctAnswer: 'Right to know, right to participate, right to refuse unsafe work' },
  { id: 'q2', question: 'If you feel work is unsafe, what is the first thing you should do?', category: 'rights', correctAnswer: 'Report to your supervisor immediately' },
  { id: 'q3', question: 'Can you be punished for refusing unsafe work?', category: 'rights', correctAnswer: 'No, you are protected from reprisal under OHSA Section 50' },
  { id: 'q4', question: 'Where do you go if the emergency alarm sounds?', category: 'emergency', correctAnswer: 'Go to the emergency assembly point' },
  { id: 'q5', question: 'Who do you report incidents to?', category: 'emergency', correctAnswer: 'Report immediately to your supervisor' },
  { id: 'q6', question: 'What is the purpose of a pre-job hazard assessment?', category: 'hazard', correctAnswer: 'To identify hazards and controls before starting work' },
  { id: 'q7', question: 'What should you do if you find a hazard on site?', category: 'hazard', correctAnswer: 'Report it immediately and do not proceed until controlled' },
  { id: 'q8', question: 'What is Stop Work Authority?', category: 'policy', correctAnswer: 'Any worker can stop work if they believe it is unsafe' },
  { id: 'q9', question: 'What is the consequence of violating safety rules?', category: 'policy', correctAnswer: 'Disciplinary action up to and including termination' },
  { id: 'q10', question: 'Who is responsible for your safety?', category: 'policy', correctAnswer: 'Everyone - employer, supervisor, and workers share responsibility' },
];

export const WIZARD_STEPS = [
  { id: 'worker-info', label: 'Worker Info', day: 1, section: 'A' },
  { id: 'admin', label: 'Admin', day: 1, section: 'B' },
  { id: 'rights', label: 'Rights', day: 1, section: 'C1-C2' },
  { id: 'site-tour', label: 'Site Tour', day: 1, section: 'C3-C4' },
  { id: 'introductions', label: 'People', day: 1, section: 'C5' },
  { id: 'equipment', label: 'Equipment', day: 2, section: 'C6' },
  { id: 'training', label: 'Training', day: 2, section: 'D1-D2' },
  { id: 'swp', label: 'SWPs', day: 2, section: 'D3' },
  { id: 'competency', label: 'Competency', day: 3, section: 'D3' },
  { id: 'quiz', label: 'Quiz', day: 3, section: '' },
  { id: 'signoff', label: 'Sign-off', day: 3, section: 'E' },
] as const;

export type WizardStepId = typeof WIZARD_STEPS[number]['id'];
