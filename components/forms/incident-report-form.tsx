'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  submitForm,
  saveDraft,
  loadDraft,
  deleteDraft,
  createAutoSave,
  type BaseFormData,
} from '@/lib/sync/form-submission';
import PhotoCapture, { type CapturedPhoto } from '@/components/ui/photo-capture';
import SignaturePad from '@/components/ui/signature-pad';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORM_TYPE = 'incident_report';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const DRAFT_EXPIRY_DAYS = 7;

const INCIDENT_TYPES = [
  { value: 'injury', label: 'Injury/Illness', description: 'WSIB reportable' },
  { value: 'near_miss', label: 'Near Miss', description: 'No injury, but could have been' },
  { value: 'property_damage', label: 'Property Damage', description: '' },
  { value: 'environmental', label: 'Environmental Incident', description: '' },
] as const;

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear ☀️' },
  { value: 'rain', label: 'Rain 🌧️' },
  { value: 'snow', label: 'Snow ❄️' },
  { value: 'ice', label: 'Ice 🧊' },
  { value: 'fog', label: 'Fog 🌫️' },
  { value: 'wind', label: 'Wind 💨' },
] as const;

const EQUIPMENT_OPTIONS = [
  { value: 'hand_tools', label: 'Hand tools' },
  { value: 'power_tools', label: 'Power tools' },
  { value: 'heavy_equipment', label: 'Heavy equipment' },
  { value: 'scaffolding', label: 'Scaffolding' },
  { value: 'ladder', label: 'Ladder' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
] as const;

const BODY_PARTS = [
  { value: 'head', label: 'Head' },
  { value: 'eyes', label: 'Eyes' },
  { value: 'back', label: 'Back' },
  { value: 'hands_fingers', label: 'Hands/Fingers' },
  { value: 'legs_feet', label: 'Legs/Feet' },
  { value: 'multiple', label: 'Multiple areas' },
] as const;

const INJURY_NATURES = [
  { value: 'cut_laceration', label: 'Cut/Laceration' },
  { value: 'bruise_contusion', label: 'Bruise/Contusion' },
  { value: 'sprain_strain', label: 'Sprain/Strain' },
  { value: 'fracture', label: 'Fracture' },
  { value: 'burn', label: 'Burn' },
  { value: 'other', label: 'Other' },
] as const;

const IMMEDIATE_CAUSES = [
  { value: 'unsafe_act', label: 'Unsafe act' },
  { value: 'unsafe_condition', label: 'Unsafe condition' },
  { value: 'both', label: 'Both' },
] as const;

const CONTRIBUTING_FACTORS = [
  { value: 'inadequate_training', label: 'Inadequate training' },
  { value: 'lack_proper_equipment', label: 'Lack of proper equipment' },
  { value: 'time_pressure', label: 'Time pressure' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'poor_lighting', label: 'Poor lighting' },
  { value: 'slippery_surface', label: 'Slippery surface' },
  { value: 'equipment_malfunction', label: 'Equipment malfunction' },
  { value: 'procedure_not_followed', label: 'Procedure not followed' },
  { value: 'no_procedure_exists', label: 'No procedure exists' },
  { value: 'other', label: 'Other' },
] as const;

const WIZARD_STEPS = [
  { id: 'details', label: 'Details', number: 1 },
  { id: 'person', label: 'Person', number: 2 },
  { id: 'description', label: 'Description', number: 3 },
  { id: 'actions', label: 'Actions', number: 4 },
  { id: 'root_cause', label: 'Root Cause', number: 5 },
  { id: 'corrective', label: 'Corrective', number: 6 },
  { id: 'photos', label: 'Photos', number: 7 },
  { id: 'review', label: 'Review', number: 8 },
] as const;

// =============================================================================
// TYPES
// =============================================================================

export type IncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental';
export type ImmediateCause = 'unsafe_act' | 'unsafe_condition' | 'both';
export type IncidentStatus = 'draft' | 'reported' | 'investigating' | 'completed';
export type Priority = 1 | 2 | 3 | 4;

export interface Witness {
  name: string;
  statement: string;
}

export interface IncidentReport extends BaseFormData {
  id?: string;
  incident_number: string;
  company_id: string;
  incident_type: IncidentType;
  incident_date: string;
  incident_time: string;
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
  immediate_cause?: ImmediateCause;
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
  photos: CapturedPhoto[];
  injury_photos: CapturedPhoto[];
  equipment_photos: CapturedPhoto[];
  documents: string[];

  // Signatures
  reported_by_signature?: string;
  reported_by_date?: string;
  investigated_by_signature?: string;
  investigated_by_date?: string;
  reviewed_by_signature?: string;
  reviewed_by_date?: string;

  // Status tracking
  form_status: IncidentStatus;
  investigation_completed_at?: string;
  priority: Priority;

  // COR audit
  audit_element: string;
}

interface IncidentReportFormProps {
  companyId: string;
  workerId: string | null;
  jobsites: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string; position?: string }>;
  supervisors: Array<{ id: string; name: string }>;
  onSubmitSuccess?: (formId: string, incidentNumber: string) => void;
  onDraftSaved?: (formId: string) => void;
}

interface FormErrors {
  [key: string]: string | undefined;
}

type ToastType = 'success' | 'info' | 'warning' | 'error';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function generateIncidentNumber(): string {
  const year = new Date().getFullYear();
  const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(3, '0');
  return `INC-${year}-${sequence}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function calculatePriority(data: Partial<IncidentReport>): Priority {
  if (data.critical_injury) return 1; // Critical injury = Priority 1
  if (data.lost_time) return 2; // Lost time injury = Priority 2
  if (data.incident_type === 'injury') return 3; // First aid only = Priority 3
  return 4; // Near miss = Priority 4
}

function isWSIBReportable(data: Partial<IncidentReport>): boolean {
  if (data.incident_type !== 'injury') return false;
  return data.critical_injury === true || data.lost_time === true || data.medical_treatment === true;
}

function getInitialFormData(companyId: string): IncidentReport {
  return {
    incident_number: generateIncidentNumber(),
    company_id: companyId,
    incident_type: 'injury',
    incident_date: getCurrentDate(),
    incident_time: getCurrentTime(),
    jobsite_id: '',
    specific_location: '',
    weather: 'clear',
    was_trained: true,
    description: '',
    activity: '',
    equipment_involved: [],
    first_aid_given: false,
    medical_treatment: false,
    work_stopped: false,
    area_secured: false,
    has_witnesses: false,
    witnesses: [],
    contributing_factors: [],
    immediate_actions: '',
    longterm_actions: '',
    wsib_reportable: false,
    critical_injury: false,
    lost_time: false,
    photos: [],
    injury_photos: [],
    equipment_photos: [],
    documents: [],
    form_status: 'draft',
    priority: 4,
    audit_element: 'Element 10',
    status: 'draft',
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function IncidentReportForm({
  companyId,
  workerId,
  jobsites,
  workers,
  supervisors,
  onSubmitSuccess,
  onDraftSaved,
}: IncidentReportFormProps) {
  const { isOnline } = useNetworkStatus();

  // Form state
  const [formData, setFormData] = useState<IncidentReport>(() => getInitialFormData(companyId));
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ formId: string; updatedAt: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);

  // Refs
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave<IncidentReport>> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Derived state
  const isInjury = formData.incident_type === 'injury';
  const isPropertyDamage = formData.incident_type === 'property_damage';
  const currentStepConfig = WIZARD_STEPS[currentStep];

  // Selected worker info
  const selectedWorker = useMemo(() => {
    return workers.find(w => w.id === formData.injured_worker_id);
  }, [workers, formData.injured_worker_id]);

  // ==========================================================================
  // TOAST MANAGEMENT
  // ==========================================================================

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ==========================================================================
  // DRAFT MANAGEMENT
  // ==========================================================================

  // Check for existing draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      const draft = await loadDraft<IncidentReport>(FORM_TYPE, companyId);
      if (draft) {
        // Check if draft is expired
        const draftDate = new Date(draft.updatedAt);
        const now = new Date();
        const daysDiff = (now.getTime() - draftDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < DRAFT_EXPIRY_DAYS) {
          setDraftInfo({ formId: draft.formId, updatedAt: draft.updatedAt });
          setShowDraftBanner(true);
        } else {
          // Delete expired draft
          await deleteDraft(FORM_TYPE, companyId, draft.formId);
        }
      }
    };
    checkDraft();
  }, [companyId]);

  // Initialize auto-save
  useEffect(() => {
    autoSaveRef.current = createAutoSave<IncidentReport>(
      FORM_TYPE,
      { companyId, workerId, formType: FORM_TYPE },
      AUTO_SAVE_INTERVAL
    );

    autoSaveRef.current.start(formData);

    return () => {
      autoSaveRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, workerId]);

  // Update auto-save data when form changes
  useEffect(() => {
    autoSaveRef.current?.update(formData);
  }, [formData]);

  // Auto-save callback
  useEffect(() => {
    const interval = setInterval(async () => {
      if (formData.status === 'draft') {
        const result = await autoSaveRef.current?.saveNow();
        if (result) {
          setLastAutoSave(new Date().toISOString());
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [formData.status]);

  const handleRestoreDraft = async () => {
    if (draftInfo) {
      const draft = await loadDraft<IncidentReport>(FORM_TYPE, companyId);
      if (draft) {
        setFormData(draft.data);
        showToast('Draft restored', 'info');
      }
    }
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = async () => {
    if (draftInfo) {
      await deleteDraft(FORM_TYPE, companyId, draftInfo.formId);
    }
    setShowDraftBanner(false);
    setDraftInfo(null);
  };

  // ==========================================================================
  // FORM HANDLERS
  // ==========================================================================

  const updateField = <K extends keyof IncidentReport>(
    field: K,
    value: IncidentReport[K]
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate WSIB reportable status
      if (['incident_type', 'critical_injury', 'lost_time', 'medical_treatment'].includes(field)) {
        updated.wsib_reportable = isWSIBReportable(updated);
        updated.priority = calculatePriority(updated);
      }
      
      // Auto-fill worker position
      if (field === 'injured_worker_id') {
        const worker = workers.find(w => w.id === value);
        updated.worker_position = worker?.position || '';
      }
      
      return updated;
    });
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleArrayField = (field: 'equipment_involved' | 'body_parts' | 'contributing_factors', value: string) => {
    setFormData((prev) => {
      const currentArray = prev[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((v) => v !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  const addWitness = () => {
    if (formData.witnesses.length < 5) {
      setFormData((prev) => ({
        ...prev,
        witnesses: [...prev.witnesses, { name: '', statement: '' }],
      }));
    }
  };

  const updateWitness = (index: number, field: keyof Witness, value: string) => {
    setFormData((prev) => {
      const witnesses = [...prev.witnesses];
      witnesses[index] = { ...witnesses[index], [field]: value };
      return { ...prev, witnesses };
    });
  };

  const removeWitness = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      witnesses: prev.witnesses.filter((_, i) => i !== index),
    }));
  };

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateStep = (step: number): FormErrors => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0: // Details
        if (!formData.incident_type) newErrors.incident_type = 'Please select an incident type';
        if (!formData.incident_date) newErrors.incident_date = 'Date is required';
        if (new Date(formData.incident_date) > new Date()) {
          newErrors.incident_date = 'Date cannot be in the future';
        }
        if (!formData.incident_time) newErrors.incident_time = 'Time is required';
        if (!formData.jobsite_id) newErrors.jobsite_id = 'Please select a jobsite';
        break;

      case 1: // Person (only for injuries)
        if (isInjury) {
          if (!formData.injured_worker_id) newErrors.injured_worker_id = 'Please select the injured worker';
        }
        break;

      case 2: // Description
        if (!formData.description || formData.description.length < 50) {
          newErrors.description = 'Please describe what happened (minimum 50 characters)';
        }
        if (!formData.activity) newErrors.activity = 'Please describe what the worker was doing';
        if (isInjury && (!formData.body_parts || formData.body_parts.length === 0)) {
          newErrors.body_parts = 'Please select affected body parts';
        }
        if (isInjury && !formData.injury_nature) {
          newErrors.injury_nature = 'Please select the nature of injury';
        }
        break;

      case 3: // Actions
        if (formData.work_stopped === undefined) newErrors.work_stopped = 'This field is required';
        if (formData.area_secured === undefined) newErrors.area_secured = 'This field is required';
        break;

      case 4: // Root Cause (required for injuries)
        if (isInjury) {
          if (!formData.immediate_cause) newErrors.immediate_cause = 'Please select the immediate cause';
        }
        break;

      case 5: // Corrective
        if (!formData.immediate_actions) {
          newErrors.immediate_actions = 'Please describe immediate corrective actions';
        }
        if (!formData.longterm_actions) {
          newErrors.longterm_actions = 'Please describe long-term corrective actions';
        }
        if (formData.target_completion_date && new Date(formData.target_completion_date) < new Date()) {
          newErrors.target_completion_date = 'Target date cannot be in the past';
        }
        break;

      case 6: // Photos
        if ((isInjury || isPropertyDamage) && formData.photos.length === 0) {
          newErrors.photos = 'At least one photo is required for injuries and property damage';
        }
        break;

      case 7: // Review (signatures)
        if (!formData.reported_by_signature) {
          newErrors.reported_by_signature = 'Reporter signature is required';
        }
        if (!formData.investigated_by_signature) {
          newErrors.investigated_by_signature = 'Investigator signature is required';
        }
        if (isInjury && !formData.reviewed_by_signature) {
          newErrors.reviewed_by_signature = 'Safety manager signature is required for injuries';
        }
        break;
    }

    return newErrors;
  };

  const validateAllSteps = (): boolean => {
    let allErrors: FormErrors = {};
    
    for (let i = 0; i <= 7; i++) {
      const stepErrors = validateStep(i);
      allErrors = { ...allErrors, ...stepErrors };
    }
    
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      showToast('Please complete all required fields', 'error');
      return;
    }
    
    // Skip "Person" step if not injury
    let nextStep = currentStep + 1;
    if (nextStep === 1 && !isInjury) {
      nextStep = 2;
    }
    // Skip "Root Cause" if near miss (but still allow it)
    
    if (nextStep <= 7) {
      setCurrentStep(nextStep);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    let prevStep = currentStep - 1;
    if (prevStep === 1 && !isInjury) {
      prevStep = 0;
    }
    
    if (prevStep >= 0) {
      setCurrentStep(prevStep);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step: number) => {
    // Can only go to completed or current steps
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  // ==========================================================================
  // SUBMIT / SAVE HANDLERS
  // ==========================================================================

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    const result = await saveDraft(FORM_TYPE, formData, {
      companyId,
      workerId,
      formType: FORM_TYPE,
    });

    setIsSavingDraft(false);

    if (result.success && result.formId) {
      setFormData((prev) => ({ ...prev, id: result.formId }));
      setLastAutoSave(new Date().toISOString());
      showToast('📝 Draft saved', 'info');
      onDraftSaved?.(result.formId);
    } else {
      showToast('Failed to save draft', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      showToast('Please complete all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    autoSaveRef.current?.stop();

    const finalData: IncidentReport = {
      ...formData,
      status: 'submitted',
      form_status: 'reported',
      reported_by_date: new Date().toISOString(),
    };

    // Calculate priority and WSIB status
    finalData.priority = calculatePriority(finalData);
    finalData.wsib_reportable = isWSIBReportable(finalData);

    const result = await submitForm(FORM_TYPE, finalData, {
      companyId,
      workerId,
      formType: FORM_TYPE,
      priority: finalData.priority,
    });

    setIsSubmitting(false);

    if (result.success && result.formId) {
      showToast('✅ Incident report submitted', 'success');
      onSubmitSuccess?.(result.formId, finalData.incident_number);
    } else {
      showToast(result.error || 'Submission failed', 'error');
      autoSaveRef.current?.start(formData);
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderProgressBar = () => (
    <div className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold">Incident Report</h1>
        <span className="text-sm text-[var(--muted)]">
          Step {currentStep + 1} of 8
        </span>
      </div>
      
      {/* Progress dots */}
      <div className="flex gap-1">
        {WIZARD_STEPS.map((step, index) => {
          // Skip Person step indicator if not injury
          if (index === 1 && !isInjury) return null;
          
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(index)}
              disabled={index > currentStep}
              className={`flex-1 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-[var(--primary)]'
                  : index < currentStep
                  ? 'bg-emerald-500'
                  : 'bg-[var(--border)]'
              }`}
              title={step.label}
            />
          );
        })}
      </div>
      
      {/* Current step label */}
      <p className="text-sm text-[var(--primary)] mt-2 font-medium">
        {currentStepConfig.label}
      </p>
      
      {/* Critical incident warning */}
      {!isOnline && isInjury && (
        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-xs font-medium">
            ⚠️ CRITICAL - Not synced (offline)
          </p>
        </div>
      )}
    </div>
  );

  const renderStep0Details = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section A: Incident Details
      </h2>

      {/* Incident Type */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Incident Type <span className="text-red-400">*</span>
        </legend>
        {errors.incident_type && (
          <p className="text-red-400 text-sm">{errors.incident_type}</p>
        )}
        <div className="space-y-2">
          {INCIDENT_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.incident_type === type.value
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="radio"
                name="incident_type"
                value={type.value}
                checked={formData.incident_type === type.value}
                onChange={(e) => updateField('incident_type', e.target.value as IncidentType)}
                className="w-5 h-5 accent-[var(--primary)]"
              />
              <div>
                <span className="font-medium">{type.label}</span>
                {type.description && (
                  <span className="text-sm text-[var(--muted)] ml-2">({type.description})</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="incident_date" className="block text-sm font-medium">
            Date of Incident <span className="text-red-400">*</span>
          </label>
          <input
            id="incident_date"
            type="date"
            value={formData.incident_date}
            max={getCurrentDate()}
            onChange={(e) => updateField('incident_date', e.target.value)}
            className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base ${
              errors.incident_date ? 'border-red-500' : 'border-[var(--border)]'
            }`}
          />
          {errors.incident_date && (
            <p className="text-red-400 text-sm">{errors.incident_date}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="incident_time" className="block text-sm font-medium">
            Time of Incident <span className="text-red-400">*</span>
          </label>
          <input
            id="incident_time"
            type="time"
            value={formData.incident_time}
            onChange={(e) => updateField('incident_time', e.target.value)}
            className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base ${
              errors.incident_time ? 'border-red-500' : 'border-[var(--border)]'
            }`}
          />
          {errors.incident_time && (
            <p className="text-red-400 text-sm">{errors.incident_time}</p>
          )}
        </div>
      </div>

      {/* Jobsite */}
      <div className="space-y-2">
        <label htmlFor="jobsite_id" className="block text-sm font-medium">
          Jobsite Location <span className="text-red-400">*</span>
        </label>
        <select
          id="jobsite_id"
          value={formData.jobsite_id}
          onChange={(e) => updateField('jobsite_id', e.target.value)}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base appearance-none ${
            errors.jobsite_id ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        >
          <option value="">Select a jobsite...</option>
          {jobsites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
        {errors.jobsite_id && (
          <p className="text-red-400 text-sm">{errors.jobsite_id}</p>
        )}
      </div>

      {/* Specific Location */}
      <div className="space-y-2">
        <label htmlFor="specific_location" className="block text-sm font-medium">
          Specific Location at Jobsite
        </label>
        <input
          id="specific_location"
          type="text"
          value={formData.specific_location}
          onChange={(e) => updateField('specific_location', e.target.value)}
          placeholder="e.g., East wall, 2nd floor"
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
        />
      </div>

      {/* Weather */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Weather Conditions</legend>
        <div className="grid grid-cols-3 gap-2">
          {WEATHER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                formData.weather === option.value
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="radio"
                name="weather"
                value={option.value}
                checked={formData.weather === option.value}
                onChange={(e) => updateField('weather', e.target.value)}
                className="sr-only"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  const renderStep1Person = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section B: Injured Person
      </h2>

      {/* Worker Name */}
      <div className="space-y-2">
        <label htmlFor="injured_worker_id" className="block text-sm font-medium">
          Worker Name <span className="text-red-400">*</span>
        </label>
        <select
          id="injured_worker_id"
          value={formData.injured_worker_id || ''}
          onChange={(e) => updateField('injured_worker_id', e.target.value)}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base appearance-none ${
            errors.injured_worker_id ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        >
          <option value="">Select worker...</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </select>
        {errors.injured_worker_id && (
          <p className="text-red-400 text-sm">{errors.injured_worker_id}</p>
        )}
      </div>

      {/* Position/Trade (auto-filled) */}
      <div className="space-y-2">
        <label htmlFor="worker_position" className="block text-sm font-medium">
          Position/Trade
        </label>
        <input
          id="worker_position"
          type="text"
          value={formData.worker_position || selectedWorker?.position || ''}
          readOnly
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
        />
      </div>

      {/* Years of Experience */}
      <div className="space-y-2">
        <label htmlFor="years_experience" className="block text-sm font-medium">
          Years of Experience
        </label>
        <input
          id="years_experience"
          type="number"
          min="0"
          max="50"
          value={formData.years_experience || ''}
          onChange={(e) => updateField('years_experience', parseInt(e.target.value) || undefined)}
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
        />
      </div>

      {/* Was Trained */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Was worker trained for this task?
        </legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.was_trained ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="was_trained"
              checked={formData.was_trained}
              onChange={() => updateField('was_trained', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.was_trained ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="was_trained"
              checked={!formData.was_trained}
              onChange={() => updateField('was_trained', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>

      {/* Last Training Date */}
      <div className="space-y-2">
        <label htmlFor="last_training_date" className="block text-sm font-medium">
          Last Training Date
        </label>
        <input
          id="last_training_date"
          type="date"
          value={formData.last_training_date || ''}
          max={getCurrentDate()}
          onChange={(e) => updateField('last_training_date', e.target.value)}
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
        />
      </div>
    </div>
  );

  const renderStep2Description = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section C: Incident Description
      </h2>

      {/* What Happened */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium">
          What happened? <span className="text-red-400">*</span>
          <span className="text-[var(--muted)] ml-1">(min 50 characters)</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe the incident in detail..."
          rows={5}
          className={`w-full p-4 rounded-xl bg-[var(--card)] border text-base resize-none ${
            errors.description ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        />
        <div className="flex justify-between text-sm">
          {errors.description && (
            <p className="text-red-400">{errors.description}</p>
          )}
          <span className={`ml-auto ${formData.description.length < 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {formData.description.length}/50 min
          </span>
        </div>
      </div>

      {/* What Was Worker Doing */}
      <div className="space-y-2">
        <label htmlFor="activity" className="block text-sm font-medium">
          What was the worker doing? <span className="text-red-400">*</span>
        </label>
        <textarea
          id="activity"
          value={formData.activity}
          onChange={(e) => updateField('activity', e.target.value)}
          placeholder="Describe the task being performed..."
          rows={3}
          className={`w-full p-4 rounded-xl bg-[var(--card)] border text-base resize-none ${
            errors.activity ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        />
        {errors.activity && (
          <p className="text-red-400 text-sm">{errors.activity}</p>
        )}
      </div>

      {/* Equipment Involved */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Equipment/Tools Involved</legend>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((equip) => (
            <label
              key={equip.value}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                formData.equipment_involved.includes(equip.value)
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.equipment_involved.includes(equip.value)}
                onChange={() => toggleArrayField('equipment_involved', equip.value)}
                className="w-5 h-5 rounded accent-[var(--primary)]"
              />
              <span className="text-sm">{equip.label}</span>
            </label>
          ))}
        </div>
        {formData.equipment_involved.includes('other') && (
          <input
            type="text"
            value={formData.other_equipment || ''}
            onChange={(e) => updateField('other_equipment', e.target.value)}
            placeholder="Specify other equipment..."
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
          />
        )}
      </fieldset>

      {/* Body Parts (if injury) */}
      {isInjury && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            Body Part(s) Affected <span className="text-red-400">*</span>
          </legend>
          {errors.body_parts && (
            <p className="text-red-400 text-sm">{errors.body_parts}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {BODY_PARTS.map((part) => (
              <label
                key={part.value}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  (formData.body_parts || []).includes(part.value)
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={(formData.body_parts || []).includes(part.value)}
                  onChange={() => toggleArrayField('body_parts', part.value)}
                  className="w-5 h-5 rounded accent-[var(--primary)]"
                />
                <span className="text-sm">{part.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Nature of Injury (if injury) */}
      {isInjury && (
        <div className="space-y-2">
          <label htmlFor="injury_nature" className="block text-sm font-medium">
            Nature of Injury <span className="text-red-400">*</span>
          </label>
          <select
            id="injury_nature"
            value={formData.injury_nature || ''}
            onChange={(e) => updateField('injury_nature', e.target.value)}
            className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base appearance-none ${
              errors.injury_nature ? 'border-red-500' : 'border-[var(--border)]'
            }`}
          >
            <option value="">Select nature of injury...</option>
            {INJURY_NATURES.map((nature) => (
              <option key={nature.value} value={nature.value}>
                {nature.label}
              </option>
            ))}
          </select>
          {errors.injury_nature && (
            <p className="text-red-400 text-sm">{errors.injury_nature}</p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep3Actions = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section D: Immediate Actions Taken
      </h2>

      {/* First Aid Given */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">First aid given?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.first_aid_given ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="first_aid_given"
              checked={formData.first_aid_given}
              onChange={() => updateField('first_aid_given', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.first_aid_given ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="first_aid_given"
              checked={!formData.first_aid_given}
              onChange={() => updateField('first_aid_given', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>

      {formData.first_aid_given && (
        <div className="space-y-2">
          <label htmlFor="first_aid_by" className="block text-sm font-medium">
            First aid given by
          </label>
          <input
            id="first_aid_by"
            type="text"
            value={formData.first_aid_by || ''}
            onChange={(e) => updateField('first_aid_by', e.target.value)}
            placeholder="Name of person who provided first aid"
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
          />
        </div>
      )}

      {/* Medical Treatment */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Medical treatment required?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.medical_treatment ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="medical_treatment"
              checked={formData.medical_treatment}
              onChange={() => updateField('medical_treatment', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.medical_treatment ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="medical_treatment"
              checked={!formData.medical_treatment}
              onChange={() => updateField('medical_treatment', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>

      {formData.medical_treatment && (
        <div className="space-y-2">
          <label htmlFor="treatment_location" className="block text-sm font-medium">
            Where was treatment received?
          </label>
          <input
            id="treatment_location"
            type="text"
            value={formData.treatment_location || ''}
            onChange={(e) => updateField('treatment_location', e.target.value)}
            placeholder="e.g., Ottawa General Hospital"
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
          />
        </div>
      )}

      {/* Work Stopped */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Work stopped immediately? <span className="text-red-400">*</span>
        </legend>
        {errors.work_stopped && (
          <p className="text-red-400 text-sm">{errors.work_stopped}</p>
        )}
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.work_stopped ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="work_stopped"
              checked={formData.work_stopped}
              onChange={() => updateField('work_stopped', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.work_stopped ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="work_stopped"
              checked={!formData.work_stopped}
              onChange={() => updateField('work_stopped', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>

      {/* Area Secured */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Area secured? <span className="text-red-400">*</span>
        </legend>
        {errors.area_secured && (
          <p className="text-red-400 text-sm">{errors.area_secured}</p>
        )}
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.area_secured ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="area_secured"
              checked={formData.area_secured}
              onChange={() => updateField('area_secured', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.area_secured ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="area_secured"
              checked={!formData.area_secured}
              onChange={() => updateField('area_secured', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>

      {/* Section E: Witnesses */}
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-6">
        Section E: Witnesses
      </h2>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Were there witnesses?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.has_witnesses ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="has_witnesses"
              checked={formData.has_witnesses}
              onChange={() => updateField('has_witnesses', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.has_witnesses ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="has_witnesses"
              checked={!formData.has_witnesses}
              onChange={() => updateField('has_witnesses', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>

      {formData.has_witnesses && (
        <div className="space-y-4">
          {formData.witnesses.map((witness, index) => (
            <div key={index} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Witness {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeWitness(index)}
                  className="text-red-400 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={witness.name}
                onChange={(e) => updateWitness(index, 'name', e.target.value)}
                placeholder="Witness name"
                className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              />
              <textarea
                value={witness.statement}
                onChange={(e) => updateWitness(index, 'statement', e.target.value)}
                placeholder="Witness statement..."
                rows={3}
                className="w-full p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm resize-none"
              />
            </div>
          ))}
          {formData.witnesses.length < 5 && (
            <button
              type="button"
              onClick={addWitness}
              className="w-full h-12 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
            >
              + Add Witness
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderStep4RootCause = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section F: Root Cause Analysis
      </h2>
      
      {isInjury && (
        <p className="text-amber-400 text-sm">
          ⚠️ Root cause analysis is required for all injuries
        </p>
      )}

      {/* Immediate Cause */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Immediate Cause {isInjury && <span className="text-red-400">*</span>}
        </legend>
        {errors.immediate_cause && (
          <p className="text-red-400 text-sm">{errors.immediate_cause}</p>
        )}
        <div className="space-y-2">
          {IMMEDIATE_CAUSES.map((cause) => (
            <label
              key={cause.value}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.immediate_cause === cause.value
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="radio"
                name="immediate_cause"
                value={cause.value}
                checked={formData.immediate_cause === cause.value}
                onChange={(e) => updateField('immediate_cause', e.target.value as ImmediateCause)}
                className="w-5 h-5 accent-[var(--primary)]"
              />
              <span className="font-medium">{cause.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Contributing Factors */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Contributing Factors (select all that apply)
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {CONTRIBUTING_FACTORS.map((factor) => (
            <label
              key={factor.value}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                formData.contributing_factors.includes(factor.value)
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.contributing_factors.includes(factor.value)}
                onChange={() => toggleArrayField('contributing_factors', factor.value)}
                className="w-5 h-5 rounded accent-[var(--primary)]"
              />
              <span className="text-sm">{factor.label}</span>
            </label>
          ))}
        </div>
        {formData.contributing_factors.includes('other') && (
          <input
            type="text"
            value={formData.other_contributing_factor || ''}
            onChange={(e) => updateField('other_contributing_factor', e.target.value)}
            placeholder="Specify other contributing factor..."
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
          />
        )}
      </fieldset>
    </div>
  );

  const renderStep5Corrective = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section G: Corrective Actions
      </h2>

      {/* Immediate Actions */}
      <div className="space-y-2">
        <label htmlFor="immediate_actions" className="block text-sm font-medium">
          Immediate corrective actions taken <span className="text-red-400">*</span>
        </label>
        <textarea
          id="immediate_actions"
          value={formData.immediate_actions}
          onChange={(e) => updateField('immediate_actions', e.target.value)}
          placeholder="Describe actions taken immediately after the incident..."
          rows={4}
          className={`w-full p-4 rounded-xl bg-[var(--card)] border text-base resize-none ${
            errors.immediate_actions ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        />
        {errors.immediate_actions && (
          <p className="text-red-400 text-sm">{errors.immediate_actions}</p>
        )}
      </div>

      {/* Long-term Actions */}
      <div className="space-y-2">
        <label htmlFor="longterm_actions" className="block text-sm font-medium">
          Long-term corrective actions planned <span className="text-red-400">*</span>
        </label>
        <textarea
          id="longterm_actions"
          value={formData.longterm_actions}
          onChange={(e) => updateField('longterm_actions', e.target.value)}
          placeholder="Describe planned long-term preventive measures..."
          rows={4}
          className={`w-full p-4 rounded-xl bg-[var(--card)] border text-base resize-none ${
            errors.longterm_actions ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        />
        {errors.longterm_actions && (
          <p className="text-red-400 text-sm">{errors.longterm_actions}</p>
        )}
      </div>

      {/* Responsible Person */}
      <div className="space-y-2">
        <label htmlFor="responsible_person_id" className="block text-sm font-medium">
          Person responsible for follow-up
        </label>
        <select
          id="responsible_person_id"
          value={formData.responsible_person_id || ''}
          onChange={(e) => updateField('responsible_person_id', e.target.value)}
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base appearance-none"
        >
          <option value="">Select supervisor...</option>
          {supervisors.map((sup) => (
            <option key={sup.id} value={sup.id}>
              {sup.name}
            </option>
          ))}
        </select>
      </div>

      {/* Target Completion Date */}
      <div className="space-y-2">
        <label htmlFor="target_completion_date" className="block text-sm font-medium">
          Target completion date
        </label>
        <input
          id="target_completion_date"
          type="date"
          value={formData.target_completion_date || ''}
          min={getCurrentDate()}
          onChange={(e) => updateField('target_completion_date', e.target.value)}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border text-base ${
            errors.target_completion_date ? 'border-red-500' : 'border-[var(--border)]'
          }`}
        />
        {errors.target_completion_date && (
          <p className="text-red-400 text-sm">{errors.target_completion_date}</p>
        )}
      </div>

      {/* Section H: WSIB Reporting */}
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-6">
        Section H: WSIB Reporting
      </h2>

      {/* WSIB Reportable Status */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="font-medium">WSIB Reportable?</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            formData.wsib_reportable 
              ? 'bg-red-500/20 text-red-400' 
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {formData.wsib_reportable ? 'Yes' : 'No'}
          </span>
        </div>
        <p className="text-sm text-[var(--muted)] mt-1">
          Auto-calculated based on injury severity
        </p>
      </div>

      {isInjury && (
        <>
          {/* Critical Injury */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              Critical injury?
              <span className="text-[var(--muted)] ml-1">(Lost consciousness, fracture, amputation, etc.)</span>
            </legend>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
                formData.critical_injury ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)] bg-[var(--card)]'
              }`}>
                <input
                  type="radio"
                  name="critical_injury"
                  checked={formData.critical_injury}
                  onChange={() => updateField('critical_injury', true)}
                  className="sr-only"
                />
                <span className="font-medium">Yes</span>
              </label>
              <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
                !formData.critical_injury ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'
              }`}>
                <input
                  type="radio"
                  name="critical_injury"
                  checked={!formData.critical_injury}
                  onChange={() => updateField('critical_injury', false)}
                  className="sr-only"
                />
                <span className="font-medium">No</span>
              </label>
            </div>
          </fieldset>

          {/* Lost Time */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              Lost time?
              <span className="text-[var(--muted)] ml-1">(Worker unable to return to work)</span>
            </legend>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
                formData.lost_time ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card)]'
              }`}>
                <input
                  type="radio"
                  name="lost_time"
                  checked={formData.lost_time}
                  onChange={() => updateField('lost_time', true)}
                  className="sr-only"
                />
                <span className="font-medium">Yes</span>
              </label>
              <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
                !formData.lost_time ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'
              }`}>
                <input
                  type="radio"
                  name="lost_time"
                  checked={!formData.lost_time}
                  onChange={() => updateField('lost_time', false)}
                  className="sr-only"
                />
                <span className="font-medium">No</span>
              </label>
            </div>
          </fieldset>

          {formData.lost_time && (
            <div className="space-y-2">
              <label htmlFor="expected_return_date" className="block text-sm font-medium">
                Expected return date
              </label>
              <input
                id="expected_return_date"
                type="date"
                value={formData.expected_return_date || ''}
                min={getCurrentDate()}
                onChange={(e) => updateField('expected_return_date', e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
              />
            </div>
          )}

          {/* WSIB Claim Number */}
          <div className="space-y-2">
            <label htmlFor="wsib_claim_number" className="block text-sm font-medium">
              WSIB Claim Number
              <span className="text-[var(--muted)] ml-1">(optional - filled later)</span>
            </label>
            <input
              id="wsib_claim_number"
              type="text"
              value={formData.wsib_claim_number || ''}
              onChange={(e) => updateField('wsib_claim_number', e.target.value)}
              placeholder="Enter claim number when received"
              className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
            />
          </div>
        </>
      )}

      {/* Priority Display */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="font-medium">Priority Level</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            formData.priority === 1 
              ? 'bg-red-500/20 text-red-400' 
              : formData.priority === 2
              ? 'bg-amber-500/20 text-amber-400'
              : formData.priority === 3
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-[var(--border)] text-[var(--muted)]'
          }`}>
            Priority {formData.priority}
          </span>
        </div>
        <p className="text-sm text-[var(--muted)] mt-1">
          {formData.priority === 1 && 'Critical injury - immediate notification required'}
          {formData.priority === 2 && 'Lost time injury - 24-hour WSIB notification'}
          {formData.priority === 3 && 'First aid only - log for records'}
          {formData.priority === 4 && 'Near miss - track for trends'}
        </p>
      </div>
    </div>
  );

  const renderStep6Photos = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section I: Photos & Evidence
      </h2>

      {/* Incident Scene Photos */}
      <PhotoCapture
        label="Photos of incident scene"
        photos={formData.photos}
        onPhotosChange={(photos) => updateField('photos', photos)}
        maxPhotos={10}
        required={isInjury || isPropertyDamage}
        error={errors.photos}
      />

      {/* Injury Photos (if injury) */}
      {isInjury && (
        <PhotoCapture
          label="Photos of injury"
          photos={formData.injury_photos}
          onPhotosChange={(photos) => updateField('injury_photos', photos)}
          maxPhotos={5}
        />
      )}

      {/* Equipment Photos */}
      <PhotoCapture
        label="Photos of equipment involved"
        photos={formData.equipment_photos}
        onPhotosChange={(photos) => updateField('equipment_photos', photos)}
        maxPhotos={5}
      />

      {/* Supporting Documents Note */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">
          📄 Supporting documents (PDF) can be uploaded after submission through the web portal.
        </p>
      </div>
    </div>
  );

  const renderStep7Review = () => {
    const jobsite = jobsites.find(j => j.id === formData.jobsite_id);
    const injuredWorker = workers.find(w => w.id === formData.injured_worker_id);
    const responsiblePerson = supervisors.find(s => s.id === formData.responsible_person_id);
    
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
          Review & Submit
        </h2>

        {/* Incident Summary */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Incident Number</span>
            <span className="font-mono font-medium">{formData.incident_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Type</span>
            <span className="font-medium capitalize">{formData.incident_type.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Date & Time</span>
            <span className="font-medium">{formData.incident_date} at {formData.incident_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Jobsite</span>
            <span className="font-medium">{jobsite?.name || '-'}</span>
          </div>
          {formData.specific_location && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Location</span>
              <span className="font-medium">{formData.specific_location}</span>
            </div>
          )}
          {isInjury && injuredWorker && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Injured Worker</span>
              <span className="font-medium">{injuredWorker.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Priority</span>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${
              formData.priority === 1 
                ? 'bg-red-500/20 text-red-400' 
                : formData.priority === 2
                ? 'bg-amber-500/20 text-amber-400'
                : formData.priority === 3
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-[var(--border)] text-[var(--muted)]'
            }`}>
              P{formData.priority}
            </span>
          </div>
          {formData.wsib_reportable && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">WSIB Reportable</span>
              <span className="text-red-400 font-medium">Yes</span>
            </div>
          )}
        </div>

        {/* Description Preview */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] mb-1">Description:</p>
          <p className="text-sm">{formData.description}</p>
        </div>

        {/* Corrective Actions Preview */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] mb-1">Immediate Actions:</p>
          <p className="text-sm mb-3">{formData.immediate_actions}</p>
          <p className="text-sm text-[var(--muted)] mb-1">Long-term Actions:</p>
          <p className="text-sm">{formData.longterm_actions}</p>
          {responsiblePerson && (
            <p className="text-sm mt-3">
              <span className="text-[var(--muted)]">Responsible: </span>
              {responsiblePerson.name}
            </p>
          )}
        </div>

        {/* Photos Count */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <p className="text-sm">
            📷 {formData.photos.length + formData.injury_photos.length + formData.equipment_photos.length} photos attached
          </p>
        </div>

        {/* Section J: Signatures */}
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-4">
          Section J: Signatures
        </h2>

        {/* Reporter Signature */}
        <SignaturePad
          label="Reported by (Worker)"
          value={formData.reported_by_signature}
          onSignatureChange={(sig) => {
            updateField('reported_by_signature', sig?.data);
            if (sig) {
              updateField('reported_by_date', sig.timestamp);
            }
          }}
          required
          error={errors.reported_by_signature}
        />

        {/* Investigator Signature */}
        <SignaturePad
          label="Investigated by (Supervisor)"
          value={formData.investigated_by_signature}
          onSignatureChange={(sig) => {
            updateField('investigated_by_signature', sig?.data);
            if (sig) {
              updateField('investigated_by_date', sig.timestamp);
            }
          }}
          required
          error={errors.investigated_by_signature}
        />

        {/* Safety Manager Signature (required for injuries) */}
        <SignaturePad
          label="Reviewed by (Safety Manager)"
          value={formData.reviewed_by_signature}
          onSignatureChange={(sig) => {
            updateField('reviewed_by_signature', sig?.data);
            if (sig) {
              updateField('reviewed_by_date', sig.timestamp);
            }
          }}
          required={isInjury}
          error={errors.reviewed_by_signature}
        />

        {/* COR Audit Info */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-blue-400">
            📋 This report will be tagged as COR audit evidence for <strong>{formData.audit_element}</strong>
          </p>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 left-4 right-4 z-50 p-4 rounded-xl shadow-lg animate-slide-down ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-500 text-black'
              : 'bg-blue-500 text-white'
          }`}
          role="alert"
        >
          <p className="font-medium text-center">{toast.message}</p>
        </div>
      )}

      {/* Draft Restoration Banner */}
      {showDraftBanner && draftInfo && (
        <div className="sticky top-0 z-40 bg-amber-500 text-black px-4 py-3">
          <p className="text-sm font-medium mb-2">
            📝 Resume your draft from {formatRelativeTime(draftInfo.updatedAt)}?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="flex-1 bg-black/20 hover:bg-black/30 text-black font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Yes, restore
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="flex-1 bg-white/20 hover:bg-white/30 text-black font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              No, start fresh
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Form Content */}
      <div ref={formRef} className="px-4 py-6 overflow-y-auto">
        {currentStep === 0 && renderStep0Details()}
        {currentStep === 1 && renderStep1Person()}
        {currentStep === 2 && renderStep2Description()}
        {currentStep === 3 && renderStep3Actions()}
        {currentStep === 4 && renderStep4RootCause()}
        {currentStep === 5 && renderStep5Corrective()}
        {currentStep === 6 && renderStep6Photos()}
        {currentStep === 7 && renderStep7Review()}
      </div>

      {/* Sticky Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold text-base transition-colors hover:bg-[var(--background)]"
            >
              ← Back
            </button>
          )}
          
          {currentStep === 0 && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold text-base transition-colors hover:bg-[var(--background)] disabled:opacity-50"
            >
              {isSavingDraft ? 'Saving...' : '💾 Save Draft'}
            </button>
          )}

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white font-semibold text-base transition-colors hover:bg-[var(--primary-hover)]"
            >
              Save & Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-xl bg-emerald-500 text-white font-semibold text-base transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Submitting...
                </span>
              ) : (
                '✅ Submit Report'
              )}
            </button>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex justify-between items-center mt-2 text-xs text-[var(--muted)]">
          <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
          {lastAutoSave && (
            <span>Auto-saved {formatRelativeTime(lastAutoSave)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { IncidentReportFormProps };
