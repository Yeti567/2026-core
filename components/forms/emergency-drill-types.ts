// Emergency Response Drill Types and Constants (COR Element 11)

export type DrillType = 'fire' | 'medical' | 'spill' | 'weather' | 'violence' | 'bomb' | 'other';
export type OverallEffectiveness = 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
export type NonParticipantReason = 'off_site' | 'on_break' | 'refused' | 'other';
export type ActionPriority = 'low' | 'medium' | 'high';
export type ActionStatus = 'open' | 'in_progress' | 'completed';
export type RollCallMethod = 'buddy_system' | 'supervisor_count' | 'signin_sheet';

export const DRILL_TYPES: { value: DrillType; label: string; frequency: string; frequencyDays: number }[] = [
  { value: 'fire', label: 'Fire Evacuation', frequency: 'Quarterly', frequencyDays: 90 },
  { value: 'medical', label: 'Medical Emergency', frequency: 'Annually', frequencyDays: 365 },
  { value: 'spill', label: 'Hazardous Material Spill', frequency: 'Annually', frequencyDays: 365 },
  { value: 'weather', label: 'Severe Weather (tornado, lightning)', frequency: 'Annually', frequencyDays: 365 },
  { value: 'violence', label: 'Workplace Violence', frequency: 'Annually', frequencyDays: 365 },
  { value: 'bomb', label: 'Bomb Threat', frequency: 'Annually', frequencyDays: 365 },
  { value: 'other', label: 'Other', frequency: 'As Required', frequencyDays: 365 },
];

export const LEARNING_OBJECTIVES = [
  { id: 'evacuation', label: 'Test evacuation procedures' },
  { id: 'communication', label: 'Test emergency communication' },
  { id: 'first_aid', label: 'Test first aid response' },
  { id: 'spill_containment', label: 'Test spill containment' },
  { id: 'accountability', label: 'Test accountability' },
  { id: 'equipment', label: 'Test emergency equipment' },
];

export const SPECIFIC_ISSUES = [
  { id: 'confused_route', label: 'Workers confused about route' },
  { id: 'unknown_assembly', label: "Workers didn't know assembly point" },
  { id: 'delayed_leaving', label: 'Workers delayed leaving' },
  { id: 'slow_headcount', label: 'Headcount took too long' },
  { id: 'equipment_failure', label: 'Emergency equipment not working' },
  { id: 'communication_breakdown', label: 'Communication breakdown' },
];

export const TRAINING_NEEDS = [
  { id: 'fire_extinguisher', label: 'Fire extinguisher use' },
  { id: 'first_aid_refresher', label: 'First aid refresher' },
  { id: 'emergency_communication', label: 'Emergency communication' },
  { id: 'evacuation_procedures', label: 'Evacuation procedures' },
  { id: 'spill_response', label: 'Spill response' },
];

export const ROLL_CALL_METHODS: { value: RollCallMethod; label: string }[] = [
  { value: 'buddy_system', label: 'Buddy System' },
  { value: 'supervisor_count', label: 'Supervisor Count' },
  { value: 'signin_sheet', label: 'Sign-in Sheet' },
];

export const OBSERVER_TYPES = [
  { id: 'safety_manager', label: 'Safety Manager' },
  { id: 'client_representative', label: 'Client Representative' },
  { id: 'emergency_services', label: 'Emergency Services' },
];

export const EFFECTIVENESS_LEVELS: { value: OverallEffectiveness; label: string; minScore: number; maxScore: number; color: string }[] = [
  { value: 'excellent', label: 'Excellent (90-100%)', minScore: 90, maxScore: 100, color: 'text-green-600' },
  { value: 'good', label: 'Good (75-89%)', minScore: 75, maxScore: 89, color: 'text-blue-600' },
  { value: 'satisfactory', label: 'Satisfactory (60-74%)', minScore: 60, maxScore: 74, color: 'text-yellow-600' },
  { value: 'needs_improvement', label: 'Needs Improvement (<60%)', minScore: 0, maxScore: 59, color: 'text-red-600' },
];

export interface NonParticipant {
  worker_id: string;
  worker_name: string;
  reason: NonParticipantReason;
  other_reason?: string;
}

export interface EvacuationObservations {
  alarm_audible: boolean | null;
  workers_stopped_immediately: boolean | null;
  workers_stopped_percentage: number;
  proceeded_to_assembly: boolean | null;
  proper_route: boolean | null;
  evacuation_time_minutes: number;
  evacuation_time_seconds: number;
  target_time_minutes: number;
  target_time_seconds: number;
  met_target: boolean | null;
}

export interface AssemblyObservations {
  all_accounted: boolean | null;
  headcount_time_minutes: number;
  headcount_time_seconds: number;
  roll_call_method: RollCallMethod | '';
  missing_workers_identified: boolean | null;
  search_initiated: boolean | null;
}

export interface CommunicationObservations {
  contact_list_available: boolean | null;
  emergency_call_made: boolean | null;
  client_notified: boolean | null;
  emergency_services_arrival_minutes?: number;
}

export interface FirstAidObservations {
  applicable: boolean;
  attendant_responded: boolean | null;
  response_time_minutes: number;
  kit_accessible: boolean | null;
  aed_available: boolean | null;
  treatment_correct: boolean | null;
}

export interface SpillObservations {
  applicable: boolean;
  spill_kit_available: boolean | null;
  containment_followed: boolean | null;
  sds_consulted: boolean | null;
  proper_ppe: boolean | null;
}

export interface EquipmentObservations {
  extinguishers_accessible: boolean | null;
  exits_clear: boolean | null;
  lighting_adequate: boolean | null;
  communication_working: boolean | null;
  emergency_supplies_available: boolean | null;
}

export interface DrillObservations {
  evacuation: EvacuationObservations;
  assembly: AssemblyObservations;
  communication: CommunicationObservations;
  first_aid: FirstAidObservations;
  spill: SpillObservations;
  equipment: EquipmentObservations;
}

export interface CorrectiveAction {
  id: string;
  issue: string;
  root_cause: string;
  action: string;
  responsible_person_id: string;
  responsible_person_name: string;
  target_date: string;
  priority: ActionPriority;
  status: ActionStatus;
}

export interface EmergencyDrill {
  id: string;
  drill_number: string; // DRL-2025-FIRE-001
  company_id: string;
  drill_type: DrillType;
  custom_type?: string;
  date: string;
  time_started: string;
  time_ended: string;
  duration_minutes: number;
  announced: boolean | null;
  jobsite_id: string;
  jobsite_name: string;
  coordinator_id: string;
  coordinator_name: string;

  // Participants
  total_workers: number;
  participants: Array<{ worker_id: string; worker_name: string }>;
  participation_rate: number;
  non_participants: NonParticipant[];
  observers: string[];

  // Scenario
  scenario_description: string;
  learning_objectives: string[];
  expected_response: string;

  // Observations
  observations: DrillObservations;

  // Evaluation
  went_well: string[];
  needs_improvement: string[];
  specific_issues: string[];
  overall_effectiveness: OverallEffectiveness | '';
  effectiveness_score: number;

  // Corrective actions
  corrective_actions: CorrectiveAction[];

  // Debriefing
  debriefing_held: boolean | null;
  debriefing_date: string;
  debriefing_time: string;
  debriefing_attendees: Array<{ worker_id: string; worker_name: string }>;
  key_points: string;
  worker_feedback: string;
  lessons_learned: string;

  // Training needs
  training_required: boolean | null;
  training_needs: string[];
  other_training_need?: string;
  training_scheduled: boolean | null;
  training_date?: string;

  // Evidence
  photos: string[]; // base64
  photo_descriptions: string[];
  video_recorded: boolean | null;
  video_url?: string;
  signin_sheet_photo?: string;

  // Signatures
  coordinator_signature: string;
  coordinator_signature_date: string;
  safety_manager_signature: string;
  safety_manager_signature_date: string;

  // Metadata
  status: 'draft' | 'completed' | 'reviewed';
  audit_element: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

export const WIZARD_STEPS = [
  { id: 'drill-info', title: 'Drill Information', description: 'Type, date, time, location' },
  { id: 'participants', title: 'Participants', description: 'Attendance and participation' },
  { id: 'scenario', title: 'Scenario', description: 'Description and objectives' },
  { id: 'evacuation', title: 'Evacuation', description: 'Evacuation observations' },
  { id: 'assembly', title: 'Assembly Point', description: 'Headcount and accountability' },
  { id: 'response', title: 'Emergency Response', description: 'Communication, first aid, spill' },
  { id: 'equipment', title: 'Equipment', description: 'Resources and equipment check' },
  { id: 'evaluation', title: 'Evaluation', description: 'Performance assessment' },
  { id: 'corrective', title: 'Corrective Actions', description: 'Issues and actions' },
  { id: 'debriefing', title: 'Debriefing', description: 'Post-drill discussion' },
  { id: 'training', title: 'Training Needs', description: 'Identified training' },
  { id: 'evidence', title: 'Photos & Evidence', description: 'Documentation' },
  { id: 'signatures', title: 'Sign-Off', description: 'Review and signatures' },
];

export const getEmptyDrill = (): EmergencyDrill => ({
  id: '',
  drill_number: '',
  company_id: '',
  drill_type: 'fire',
  date: new Date().toISOString().split('T')[0],
  time_started: '',
  time_ended: '',
  duration_minutes: 0,
  announced: null,
  jobsite_id: '',
  jobsite_name: '',
  coordinator_id: '',
  coordinator_name: '',
  total_workers: 0,
  participants: [],
  participation_rate: 0,
  non_participants: [],
  observers: [],
  scenario_description: '',
  learning_objectives: [],
  expected_response: '',
  observations: {
    evacuation: {
      alarm_audible: null,
      workers_stopped_immediately: null,
      workers_stopped_percentage: 100,
      proceeded_to_assembly: null,
      proper_route: null,
      evacuation_time_minutes: 0,
      evacuation_time_seconds: 0,
      target_time_minutes: 5,
      target_time_seconds: 0,
      met_target: null,
    },
    assembly: {
      all_accounted: null,
      headcount_time_minutes: 0,
      headcount_time_seconds: 0,
      roll_call_method: '',
      missing_workers_identified: null,
      search_initiated: null,
    },
    communication: {
      contact_list_available: null,
      emergency_call_made: null,
      client_notified: null,
    },
    first_aid: {
      applicable: false,
      attendant_responded: null,
      response_time_minutes: 0,
      kit_accessible: null,
      aed_available: null,
      treatment_correct: null,
    },
    spill: {
      applicable: false,
      spill_kit_available: null,
      containment_followed: null,
      sds_consulted: null,
      proper_ppe: null,
    },
    equipment: {
      extinguishers_accessible: null,
      exits_clear: null,
      lighting_adequate: null,
      communication_working: null,
      emergency_supplies_available: null,
    },
  },
  went_well: [],
  needs_improvement: [],
  specific_issues: [],
  overall_effectiveness: '',
  effectiveness_score: 0,
  corrective_actions: [],
  debriefing_held: null,
  debriefing_date: '',
  debriefing_time: '',
  debriefing_attendees: [],
  key_points: '',
  worker_feedback: '',
  lessons_learned: '',
  training_required: null,
  training_needs: [],
  training_scheduled: null,
  photos: [],
  photo_descriptions: [],
  video_recorded: null,
  signin_sheet_photo: '',
  coordinator_signature: '',
  coordinator_signature_date: '',
  safety_manager_signature: '',
  safety_manager_signature_date: '',
  status: 'draft',
  audit_element: 'Element 11',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Helper function to generate drill number
export const generateDrillNumber = (drillType: DrillType, sequence: number): string => {
  const year = new Date().getFullYear();
  const typeCode = drillType.toUpperCase();
  const seqPadded = sequence.toString().padStart(3, '0');
  return `DRL-${year}-${typeCode}-${seqPadded}`;
};

// Helper function to calculate participation rate
export const calculateParticipationRate = (participants: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((participants / total) * 100);
};

// Helper function to calculate duration in minutes
export const calculateDuration = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return Math.max(0, endMinutes - startMinutes);
};

// Helper function to convert time to seconds
export const timeToSeconds = (minutes: number, seconds: number): number => {
  return minutes * 60 + seconds;
};

// Helper function to check if evacuation met target
export const checkEvacuationTarget = (
  actualMinutes: number,
  actualSeconds: number,
  targetMinutes: number,
  targetSeconds: number
): boolean => {
  const actualTotal = timeToSeconds(actualMinutes, actualSeconds);
  const targetTotal = timeToSeconds(targetMinutes, targetSeconds);
  return actualTotal <= targetTotal;
};

// Helper to get effectiveness level from score
export const getEffectivenessFromScore = (score: number): OverallEffectiveness => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'satisfactory';
  return 'needs_improvement';
};

// Performance standards
export const PERFORMANCE_STANDARDS = {
  evacuationTimeGoalMinutes: 5,
  headcountTimeGoalMinutes: 3,
  minimumParticipationRate: 80,
  accountabilityRequired: 100,
  poorPerformanceThreshold: 60,
};
