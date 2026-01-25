/**
 * Form Submission Utilities
 * 
 * Handles saving forms to IndexedDB and queuing them for sync.
 * Provides both draft saving and full submission functionality.
 */

import { localDB, type LocalForm, type GPSCoordinates, type SyncPriority } from '@/lib/db/local-db';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Base form data structure that all forms extend
 */
export interface BaseFormData {
  id?: string;
  status: 'draft' | 'submitted';
}

/**
 * Hazard Assessment Form data structure
 */
export interface HazardAssessmentFormData extends BaseFormData {
  jobsite_id: string;
  date: string; // ISO date
  time: string; // HH:MM
  weather: 'clear' | 'rain' | 'snow' | 'fog';
  temperature: number;
  hazards: string[];
  controls: Record<string, string>; // { hazard: control description }
  notes: string;
  worker_signature: string; // base64
  supervisor_signature?: string; // base64
  photos: string[]; // base64 array
  gps_coordinates: { lat: number; lng: number } | null;
}

/**
 * Photo attachment structure for forms
 */
export interface PhotoAttachment {
  id: string;
  data: string; // base64
  mimeType: string;
  filename: string;
  capturedAt: string;
  size: number;
}

/**
 * Witness structure for incident reports
 */
export interface Witness {
  name: string;
  statement: string;
}

/**
 * Incident Report Form data structure (WSIB Form 7 / COR Element 10)
 */
export interface IncidentReportFormData extends BaseFormData {
  id?: string;
  incident_number: string; // INC-2025-001
  company_id: string;
  incident_type: 'injury' | 'near_miss' | 'property_damage' | 'environmental';
  incident_date: string; // ISO date
  incident_time: string; // HH:MM
  jobsite_id: string;
  specific_location: string;
  weather: string;

  // Injured person (if applicable)
  injured_worker_id?: string;
  worker_position?: string;
  years_experience?: number;
  was_trained: boolean;
  last_training_date?: string;

  // Description
  description: string;
  activity: string;
  equipment_involved: string[];
  other_equipment?: string;
  body_parts?: string[];
  injury_nature?: string;

  // Actions
  first_aid_given: boolean;
  first_aid_by?: string;
  medical_treatment: boolean;
  treatment_location?: string;
  work_stopped: boolean;
  area_secured: boolean;

  // Witnesses
  has_witnesses: boolean;
  witnesses: Witness[];

  // Root cause
  immediate_cause?: 'unsafe_act' | 'unsafe_condition' | 'both';
  contributing_factors: string[];
  other_contributing_factor?: string;

  // Corrective actions
  immediate_actions: string;
  longterm_actions: string;
  responsible_person_id?: string;
  target_completion_date?: string;

  // WSIB
  wsib_reportable: boolean;
  critical_injury: boolean;
  lost_time: boolean;
  expected_return_date?: string;
  wsib_claim_number?: string;

  // Evidence
  photos: PhotoAttachment[];
  injury_photos: PhotoAttachment[];
  equipment_photos: PhotoAttachment[];
  documents: string[];

  // Signatures
  reported_by_signature?: string;
  reported_by_date?: string;
  investigated_by_signature?: string;
  investigated_by_date?: string;
  reviewed_by_signature?: string;
  reviewed_by_date?: string;

  // Status tracking
  form_status: 'draft' | 'reported' | 'investigating' | 'completed';
  investigation_completed_at?: string;
  priority: 1 | 2 | 3 | 4;

  // COR audit
  audit_element: string;
}

/**
 * Attendee for toolbox talks
 */
export interface ToolboxTalkAttendee {
  worker_id: string;
  worker_name?: string;
  status: 'present' | 'absent' | 'excused';
  excuse_reason?: string;
  signature?: string;
  signed_at?: string;
}

/**
 * Action item from toolbox talks
 */
export interface ToolboxTalkActionItem {
  id: string;
  description: string;
  assigned_to_id: string;
  assigned_to_name?: string;
  due_date: string;
  status: 'open' | 'completed';
}

/**
 * Toolbox Talk Form data structure (COR Element 8)
 */
export interface ToolboxTalkFormData extends BaseFormData {
  id?: string;
  talk_number: string; // TBT-2025-001
  company_id: string;
  date: string;
  time_started: string;
  time_ended?: string;
  duration_minutes?: number;
  jobsite_id: string;
  presenter_id: string;
  presenter_name?: string;
  topic: string;
  custom_topic?: string;

  // Content
  key_messages: string;
  regulations_cited: string[];
  procedures_referenced: string[];

  // Discussion
  questions_asked: string[];
  answers_provided: string[];
  concerns_raised: string;
  action_items: ToolboxTalkActionItem[];

  // Attendance
  attendees: ToolboxTalkAttendee[];
  paper_signin_used: boolean;
  paper_signin_photo?: PhotoAttachment;

  // Photos & materials
  photos: PhotoAttachment[];
  handouts: string[];
  reference_links: string[];

  // Effectiveness
  questions_asked_flag: boolean;
  workers_engaged: boolean;
  followup_training_needed: boolean;
  followup_training_type?: string;

  // Notes
  went_well: string;
  could_improve: string;
  suggested_topics: string[];

  // Signatures
  presenter_signature?: string;
  presenter_date?: string;
  supervisor_signature?: string;
  supervisor_date?: string;

  form_status: 'draft' | 'completed' | 'reviewed';
  audit_element: string;
}

/**
 * Checklist item for site inspections
 */
export interface ChecklistItem {
  item: string;
  category: string;
  result: 'pass' | 'fail' | 'na';
  notes?: string;
}

/**
 * Hazard identified during inspection
 */
export interface HazardIdentified {
  id: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  likelihood: 1 | 2 | 3 | 4;
  risk_level: number;
  photo?: PhotoAttachment;
  immediate_action: string;
  assigned_to_id: string;
  target_date: string;
  status: 'open' | 'in_progress' | 'resolved';
}

/**
 * Site Inspection Form data structure (COR Element 7)
 */
export interface SiteInspectionFormData extends BaseFormData {
  id?: string;
  inspection_number: string; // INS-2025-001
  company_id: string;
  inspection_type: 'daily' | 'weekly' | 'monthly' | 'pre_start';
  date: string;
  time_started: string;
  time_completed?: string;
  jobsite_id: string;
  weather: string;
  inspector_id: string;
  inspector_name?: string;

  // Checklist
  checklist_items: ChecklistItem[];

  // Hazards
  hazards_identified: HazardIdentified[];

  // Observations
  positive_observations: string;
  workers_following_procedures: boolean;
  good_practices: string;
  workers_commended: string[];

  // Recommendations
  improvements: string;
  training_needs: string[];
  equipment_needed: string;
  budget_implications: boolean;

  // Photos
  photos: PhotoAttachment[];

  // Scoring
  score: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  previous_score?: number;
  trend: 'up' | 'down' | 'flat';
  next_inspection_due: string;

  // Signatures
  inspector_signature?: string;
  inspector_date?: string;
  supervisor_signature?: string;
  supervisor_date?: string;

  // Status
  form_status: 'draft' | 'completed' | 'reviewed';

  // COR audit
  audit_element: string;
}

/**
 * Result of a form submission operation
 */
export interface FormSubmissionResult {
  success: boolean;
  formId?: string;
  error?: string;
}

/**
 * Options for saving a form
 */
export interface SaveFormOptions {
  /** Company ID for tenant isolation */
  companyId: string;
  /** Worker ID who is submitting */
  workerId: string | null;
  /** Form type identifier */
  formType: string;
  /** Priority for sync queue (1 = highest) */
  priority?: SyncPriority;
}

// =============================================================================
// DRAFT STORAGE KEY
// =============================================================================

const DRAFT_KEY_PREFIX = 'form_draft_';

/**
 * Gets the IndexedDB key for a form draft
 */
function getDraftKey(formType: string, companyId: string): string {
  return `${DRAFT_KEY_PREFIX}${formType}_${companyId}`;
}

// =============================================================================
// DRAFT MANAGEMENT
// =============================================================================

/**
 * Saves a form as a draft to IndexedDB.
 * Does NOT add to sync queue - just stores locally.
 * 
 * @param formType - Type of form (e.g., 'hazard_assessment')
 * @param formData - The form data to save
 * @param options - Save options
 * @returns Result with formId
 */
export async function saveDraft<T extends BaseFormData>(
  formType: string,
  formData: T,
  options: SaveFormOptions
): Promise<FormSubmissionResult> {
  try {
    const now = new Date().toISOString();
    const formId = formData.id || crypto.randomUUID();

    // Check if we're updating an existing draft
    const existingForm: LocalForm | undefined = formData.id
      ? ((await localDB.forms.get(formData.id)) as LocalForm | undefined)
      : undefined;

    if (existingForm) {
      // Update existing draft
      await localDB.forms.update(formId, {
        form_data: ({ ...formData, status: 'draft' } as unknown) as Record<string, unknown>,
        updated_at: now,
      });
    } else {
      // Create new draft
      const newForm: LocalForm = {
        id: formId,
        company_id: options.companyId,
        worker_id: options.workerId,
        form_type: formType,
        form_data: ({ ...formData, id: formId, status: 'draft' } as unknown) as Record<string, unknown>,
        photos: [],
        signature_base64: null,
        gps_coordinates: null,
        synced: 'pending', // Drafts are 'pending' but not in sync queue
        server_id: null,
        created_at: now,
        updated_at: now,
        sync_attempts: 0,
        last_sync_error: null,
      };

      await localDB.forms.put(newForm);
    }

    // Store draft reference for quick lookup
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        getDraftKey(formType, options.companyId),
        JSON.stringify({ formId, updatedAt: now })
      );
    }

    return { success: true, formId };
  } catch (error) {
    console.error('[saveDraft] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save draft',
    };
  }
}

/**
 * Loads a draft from IndexedDB if one exists.
 * 
 * @param formType - Type of form to load
 * @param companyId - Company ID for tenant isolation
 * @returns The draft data or null if none exists
 */
export async function loadDraft<T extends BaseFormData>(
  formType: string,
  companyId: string
): Promise<{ formId: string; data: T; updatedAt: string } | null> {
  try {
    // Check localStorage for draft reference
    if (typeof localStorage === 'undefined') return null;

    const draftRef = localStorage.getItem(getDraftKey(formType, companyId));
    if (!draftRef) return null;

    const { formId, updatedAt } = JSON.parse(draftRef);

    // Load from IndexedDB
    const form = await localDB.forms.get(formId);
    if (!form) {
      // Clean up stale reference
      localStorage.removeItem(getDraftKey(formType, companyId));
      return null;
    }

    // Only return if it's still a draft
    const formData = form.form_data as T;
    if (formData.status !== 'draft') {
      localStorage.removeItem(getDraftKey(formType, companyId));
      return null;
    }

    return {
      formId,
      data: formData,
      updatedAt,
    };
  } catch (error) {
    console.error('[loadDraft] Error:', error);
    return null;
  }
}

/**
 * Deletes a draft from IndexedDB.
 * 
 * @param formType - Type of form
 * @param companyId - Company ID
 * @param formId - Optional specific form ID to delete
 */
export async function deleteDraft(
  formType: string,
  companyId: string,
  formId?: string
): Promise<void> {
  try {
    if (formId) {
      const form = await localDB.forms.get(formId);
      const data = form?.form_data as unknown as BaseFormData | undefined;
      if (form && data?.status === 'draft') {
        await localDB.forms.delete(formId);
      }
    }

    // Clean up localStorage reference
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(getDraftKey(formType, companyId));
    }
  } catch (error) {
    console.error('[deleteDraft] Error:', error);
  }
}

// =============================================================================
// FORM SUBMISSION
// =============================================================================

/**
 * Submits a form to IndexedDB and adds it to the sync queue.
 * This is the final submission - not a draft save.
 * 
 * @param formType - Type of form (e.g., 'hazard_assessment')
 * @param formData - The complete form data
 * @param options - Submission options
 * @returns Result with formId
 * 
 * @example
 * ```typescript
 * const result = await submitForm('hazard_assessment', formData, {
 *   companyId: user.companyId,
 *   workerId: user.workerId,
 *   formType: 'hazard_assessment',
 * });
 * 
 * if (result.success) {
 *   toast('Form submitted - will sync when online');
 * }
 * ```
 */
export async function submitForm<T extends BaseFormData>(
  formType: string,
  formData: T,
  options: SaveFormOptions
): Promise<FormSubmissionResult> {
  try {
    const now = new Date().toISOString();
    const formId = formData.id || crypto.randomUUID();

    // Extract photos and signatures from form data for separate storage
    const hazardData = formData as unknown as HazardAssessmentFormData;
    const photos = hazardData.photos || [];
    const workerSignature = hazardData.worker_signature || null;
    const gpsCoordinates = hazardData.gps_coordinates
      ? {
          latitude: hazardData.gps_coordinates.lat,
          longitude: hazardData.gps_coordinates.lng,
          accuracy: undefined,
          altitude: undefined,
          timestamp: Date.now(),
        } as GPSCoordinates
      : null;

    // Create the form record
    const newForm: LocalForm = {
      id: formId,
      company_id: options.companyId,
      worker_id: options.workerId,
      form_type: formType,
      form_data: ({ ...formData, id: formId, status: 'submitted' } as unknown) as Record<string, unknown>,
      photos: photos.map((data, index) => ({
        id: `${formId}_photo_${index}`,
        data,
        mimeType: 'image/jpeg',
        filename: `photo_${index}.jpg`,
        size: Math.ceil((data.length * 3) / 4), // Approximate base64 to bytes
        capturedAt: now,
        gps: gpsCoordinates || undefined,
      })),
      signature_base64: workerSignature,
      gps_coordinates: gpsCoordinates,
      synced: 'pending',
      server_id: null,
      created_at: now,
      updated_at: now,
      sync_attempts: 0,
      last_sync_error: null,
    };

    // Use transaction to ensure atomicity
    await localDB.transaction('rw', [localDB.forms, localDB.sync_queue], async () => {
      // Check for existing draft and remove it
      const existingForm = await localDB.forms.get(formId);
      if (existingForm) {
        await localDB.forms.update(formId, {
          ...newForm,
          created_at: existingForm.created_at, // Preserve original creation time
        });
      } else {
        await localDB.forms.add(newForm);
      }

      // Add to sync queue
      await localDB.queueForSync(
        'form_submission',
        formId,
        'forms',
        newForm as unknown as Record<string, unknown>,
        options.priority || 2
      );
    });

    // Clean up draft reference
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(getDraftKey(formType, options.companyId));
    }

    return { success: true, formId };
  } catch (error) {
    console.error('[submitForm] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit form',
    };
  }
}

// =============================================================================
// GPS UTILITIES
// =============================================================================

/**
 * Gets the current GPS coordinates.
 * 
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns GPS coordinates or null if unavailable
 */
export async function getCurrentGPS(
  timeout: number = 10000
): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('[getCurrentGPS] Error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 60000, // Accept cached position up to 1 minute old
      }
    );
  });
}

// =============================================================================
// AUTO-SAVE UTILITY
// =============================================================================

/**
 * Creates an auto-save function that saves drafts at specified intervals.
 * 
 * @param formType - Type of form
 * @param options - Save options
 * @param intervalMs - Auto-save interval in milliseconds (default: 30000)
 * @returns Object with start/stop methods and current draft getter
 */
export function createAutoSave<T extends BaseFormData>(
  formType: string,
  options: SaveFormOptions,
  intervalMs: number = 30000
) {
  let intervalId: NodeJS.Timeout | null = null;
  let currentData: T | null = null;
  let lastSavedData: string | null = null;

  const save = async (): Promise<boolean> => {
    if (!currentData) return false;

    // Only save if data has changed
    const dataString = JSON.stringify(currentData);
    if (dataString === lastSavedData) return false;

    const result = await saveDraft(formType, currentData, options);
    if (result.success) {
      lastSavedData = dataString;
      // Update the data with the formId
      if (result.formId && currentData) {
        currentData.id = result.formId;
      }
    }
    return result.success;
  };

  return {
    /**
     * Starts auto-saving with the given initial data.
     */
    start: (initialData: T) => {
      currentData = initialData;
      lastSavedData = null;

      // Clear any existing interval
      if (intervalId) clearInterval(intervalId);

      // Start new interval
      intervalId = setInterval(save, intervalMs);
    },

    /**
     * Stops auto-saving.
     */
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    /**
     * Updates the current data to be auto-saved.
     */
    update: (data: T) => {
      currentData = data;
    },

    /**
     * Forces an immediate save.
     */
    saveNow: save,

    /**
     * Gets the current data.
     */
    getData: () => currentData,
  };
}

// =============================================================================
// WORKER ORIENTATION FORM DATA (COR Element 4)
// =============================================================================

/**
 * PPE Item issued during orientation
 */
export interface OrientationPPEItem {
  item: string;
  size?: string;
  serial_number?: string;
  issued_date: string;
}

/**
 * Site hazard identified during orientation
 */
export interface OrientationSiteHazard {
  hazard: string;
  controls: string;
  ppe_required: string[];
  swp_reference?: string;
}

/**
 * Key personnel met during orientation
 */
export interface OrientationKeyPersonnel {
  role: string;
  name: string;
  signature: string;
  date: string;
}

/**
 * Mandatory training record
 */
export interface OrientationMandatoryTraining {
  course: string;
  completed: boolean;
  certificate_url?: string;
  expiry_date?: string;
}

/**
 * Training still required
 */
export interface OrientationTrainingRequired {
  course: string;
  target_date: string;
  provider: string;
}

/**
 * SWP reviewed during orientation
 */
export interface OrientationSWPReviewed {
  swp_name: string;
  reviewed: boolean;
  worker_initials: string;
  date: string;
}

/**
 * Competency demonstration record
 */
export interface OrientationCompetencyDemo {
  task: string;
  result: 'pass' | 'fail' | 'needs_practice' | '';
  evaluator_id: string;
  evaluator_signature: string;
  date: string;
  notes?: string;
}

/**
 * Quiz question for orientation assessment
 */
export interface OrientationQuizQuestion {
  id: string;
  question: string;
  answer: string;
  correct: boolean;
}

/**
 * Buddy check-in record
 */
export interface OrientationBuddyCheckIn {
  day: number;
  date: string;
  notes: string;
  concerns: string;
  buddy_signature: string;
}

/**
 * Worker Orientation Form data structure (COR Element 4)
 */
export interface WorkerOrientationFormData extends BaseFormData {
  id?: string;
  orientation_number: string; // ORI-2025-001
  company_id: string;
  worker_id: string;
  hire_date: string;
  start_date: string;

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
  ppe_issued: OrientationPPEItem[];
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
  site_hazards: OrientationSiteHazard[];
  site_rules_explained: string[];
  site_photos: PhotoAttachment[];
  emergency_assembly_shown: boolean;
  emergency_phones_posted: boolean;
  fire_extinguisher_shown: boolean;
  first_aid_shown: boolean;
  nearest_hospital: string;
  evacuation_explained: boolean;
  severe_weather_explained: boolean;
  emergency_contacts_provided: boolean;
  emergency_quiz_answer: string;
  key_personnel: OrientationKeyPersonnel[];
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
  mandatory_training: OrientationMandatoryTraining[];
  training_required: OrientationTrainingRequired[];
  swp_reviewed: OrientationSWPReviewed[];
  competency_demos: OrientationCompetencyDemo[];

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
  quiz_questions: OrientationQuizQuestion[];
  quiz_score?: number;
  quiz_passed: boolean;

  // Buddy tracking
  buddy_check_ins: OrientationBuddyCheckIn[];
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
// EXPORTS
// =============================================================================

// =============================================================================
// EQUIPMENT INSPECTION FORM DATA (COR Element 13)
// =============================================================================

/**
 * Checklist item for equipment inspection
 */
export interface EquipmentChecklistItem {
  id: string;
  item: string;
  category: string;
  result: 'pass' | 'fail' | 'na' | '';
  notes?: string;
}

/**
 * Deficiency found during equipment inspection
 */
export interface EquipmentDeficiency {
  id: string;
  description: string;
  checklist_item_id?: string;
  severity: 'minor' | 'major' | 'critical';
  photo?: string;
  repair_required: boolean;
  repair_time_estimate?: string;
  parts_needed?: string;
  technician_required: boolean;
  cost_estimate?: number;
}

/**
 * Equipment Inspection Form data structure (COR Element 13)
 */
export interface EquipmentInspectionFormData extends BaseFormData {
  id?: string;
  inspection_number: string; // EQP-LIFT-001-2025-042
  company_id: string;
  
  // Equipment identification
  equipment_id: string;
  equipment_type: string;
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
  checklist_items: EquipmentChecklistItem[];
  
  // Deficiencies
  deficiencies: EquipmentDeficiency[];
  
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

// =============================================================================
// PRE-TASK HAZARD ASSESSMENT FORM DATA (COR Element 3 - High Risk)
// =============================================================================

export type PTHARiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface PTHACrewMember {
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

export interface PTHARiskAssessment {
  id: string;
  hazard: string;
  hazard_category: string;
  likelihood_before: 1 | 2 | 3 | 4 | 5;
  consequence_before: 1 | 2 | 3 | 4 | 5;
  risk_rating_before: number;
  risk_level_before: PTHARiskLevel;
  controls: {
    elimination?: string;
    elimination_possible: boolean;
    substitution?: string;
    substitution_possible: boolean;
    engineering: string[];
    administrative: string[];
    permits_required: string[];
    ppe: string[];
  };
  likelihood_after: 1 | 2 | 3 | 4 | 5;
  consequence_after: 1 | 2 | 3 | 4 | 5;
  risk_rating_after: number;
  risk_level_after: PTHARiskLevel;
  acceptable: boolean;
}

export interface PTHAPermit {
  type: string;
  number: string;
  attached: boolean;
}

/**
 * Pre-Task Hazard Assessment Form data structure (COR Element 3 - High Risk Work)
 */
export interface PreTaskHazardAssessmentFormData extends BaseFormData {
  id?: string;
  ptha_number: string; // PTHA-2025-001
  company_id: string;
  
  // Task Information
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
  
  // Crew
  crew_count: number;
  crew_members: PTHACrewMember[];
  all_crew_briefed: boolean;
  
  // Hazards (simplified for type export)
  physical_hazards: string[];
  chemical_hazards: Array<{
    id: string;
    product_name: string;
    sds_reviewed: boolean;
  }>;
  biological_hazards: string[];
  ergonomic_hazards: string[];
  equipment_hazards: string[];
  
  // Risk Assessments
  risk_assessments: PTHARiskAssessment[];
  
  // Emergency & Permits
  stop_work_understood: boolean;
  permits: PTHAPermit[];
  
  // Pre-Task Meeting
  meeting_held: boolean;
  meeting_datetime: string;
  crew_comfortable: boolean;
  
  // Monitoring
  monitoring_frequency: 'hourly' | '2_hours' | 'continuous';
  designated_monitor: string;
  
  // Approvals
  supervisor_signature: string;
  supervisor_date: string;
  safety_manager_signature?: string;
  safety_manager_date?: string;
  
  // Status
  highest_risk_level: PTHARiskLevel;
  can_proceed: boolean;
  form_status: 'draft' | 'approved' | 'work_in_progress' | 'completed' | 'rejected';
  audit_element: string;
}

// =============================================================================
// EMERGENCY DRILL FORM DATA (COR Element 11)
// =============================================================================

export type DrillType = 'fire' | 'medical' | 'spill' | 'weather' | 'violence' | 'bomb' | 'other';
export type OverallEffectiveness = 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
export type NonParticipantReason = 'off_site' | 'on_break' | 'refused' | 'other';
export type ActionPriority = 'low' | 'medium' | 'high';
export type ActionStatus = 'open' | 'in_progress' | 'completed';
export type RollCallMethod = 'buddy_system' | 'supervisor_count' | 'signin_sheet';

export interface DrillNonParticipant {
  worker_id: string;
  worker_name: string;
  reason: NonParticipantReason;
  other_reason?: string;
}

export interface DrillCorrectiveAction {
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

export interface DrillObservations {
  evacuation: {
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
  };
  assembly: {
    all_accounted: boolean | null;
    headcount_time_minutes: number;
    headcount_time_seconds: number;
    roll_call_method: RollCallMethod | '';
    missing_workers_identified: boolean | null;
    search_initiated: boolean | null;
  };
  communication: {
    contact_list_available: boolean | null;
    emergency_call_made: boolean | null;
    client_notified: boolean | null;
    emergency_services_arrival_minutes?: number;
  };
  first_aid: {
    applicable: boolean;
    attendant_responded: boolean | null;
    response_time_minutes: number;
    kit_accessible: boolean | null;
    aed_available: boolean | null;
    treatment_correct: boolean | null;
  };
  spill: {
    applicable: boolean;
    spill_kit_available: boolean | null;
    containment_followed: boolean | null;
    sds_consulted: boolean | null;
    proper_ppe: boolean | null;
  };
  equipment: {
    extinguishers_accessible: boolean | null;
    exits_clear: boolean | null;
    lighting_adequate: boolean | null;
    communication_working: boolean | null;
    emergency_supplies_available: boolean | null;
  };
}

/**
 * Emergency Drill Form data structure (COR Element 11)
 */
export interface EmergencyDrillFormData extends BaseFormData {
  id?: string;
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
  non_participants: DrillNonParticipant[];
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
  corrective_actions: DrillCorrectiveAction[];

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
  photos: string[];
  photo_descriptions: string[];
  video_recorded: boolean | null;
  video_url?: string;
  signin_sheet_photo?: string;

  // Signatures
  coordinator_signature: string;
  coordinator_signature_date: string;
  safety_manager_signature: string;
  safety_manager_signature_date: string;

  // Status
  form_status: 'draft' | 'completed' | 'reviewed';
  audit_element: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}


