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

const FORM_TYPE = 'site_inspection';
const AUTO_SAVE_INTERVAL = 30000;

const INSPECTION_TYPES = [
  { value: 'daily', label: 'Daily Safety Inspection', frequency: 1 },
  { value: 'weekly', label: 'Weekly Detailed Inspection', frequency: 7 },
  { value: 'monthly', label: 'Monthly Comprehensive Audit', frequency: 30 },
  { value: 'pre_start', label: 'Pre-Start Inspection', frequency: 0 },
] as const;

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear ☀️' },
  { value: 'cloudy', label: 'Cloudy ☁️' },
  { value: 'rain', label: 'Rain 🌧️' },
  { value: 'snow', label: 'Snow ❄️' },
  { value: 'ice', label: 'Ice 🧊' },
  { value: 'fog', label: 'Fog 🌫️' },
  { value: 'wind', label: 'Wind 💨' },
] as const;

const SEVERITY_LEVELS = [
  { value: 1, label: 'Minor', color: 'bg-green-500' },
  { value: 2, label: 'Low', color: 'bg-lime-500' },
  { value: 3, label: 'Medium', color: 'bg-amber-500' },
  { value: 4, label: 'High', color: 'bg-orange-500' },
  { value: 5, label: 'Critical', color: 'bg-red-500' },
] as const;

const LIKELIHOOD_LEVELS = [
  { value: 1, label: 'Unlikely' },
  { value: 2, label: 'Possible' },
  { value: 3, label: 'Likely' },
  { value: 4, label: 'Certain' },
] as const;

const TRAINING_NEEDS = [
  { value: 'fall_protection', label: 'Fall Protection' },
  { value: 'confined_space', label: 'Confined Space Entry' },
  { value: 'lockout_tagout', label: 'Lock-out/Tag-out' },
  { value: 'whmis', label: 'WHMIS' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'equipment_operation', label: 'Equipment Operation' },
  { value: 'hazard_recognition', label: 'Hazard Recognition' },
] as const;

// Checklist items by category and inspection type
const CHECKLIST_ITEMS = {
  daily: [
    { category: 'General', item: 'Housekeeping' },
    { category: 'General', item: 'Scaffolding condition' },
    { category: 'General', item: 'Ladders secure' },
    { category: 'PPE', item: 'PPE being worn' },
    { category: 'Emergency', item: 'Emergency exits clear' },
    { category: 'Emergency', item: 'Fire extinguishers accessible' },
    { category: 'Electrical', item: 'Electrical cords safe' },
    { category: 'Emergency', item: 'First aid kit stocked' },
  ],
  weekly: [
    // Daily items
    { category: 'General', item: 'Housekeeping' },
    { category: 'General', item: 'Scaffolding condition' },
    { category: 'General', item: 'Ladders secure' },
    { category: 'PPE', item: 'PPE being worn' },
    { category: 'Emergency', item: 'Emergency exits clear' },
    { category: 'Emergency', item: 'Fire extinguishers accessible' },
    { category: 'Electrical', item: 'Electrical cords safe' },
    { category: 'Emergency', item: 'First aid kit stocked' },
    // Weekly additions
    { category: 'Fall Protection', item: 'Fall protection systems' },
    { category: 'Fall Protection', item: 'Guardrails installed' },
    { category: 'Excavation', item: 'Excavation shoring' },
    { category: 'Excavation', item: 'Trenches properly sloped' },
    { category: 'Confined Space', item: 'Confined space entry permits' },
    { category: 'Procedures', item: 'Lock-out/tag-out procedures followed' },
    { category: 'Materials', item: 'Material storage safe' },
    { category: 'Equipment', item: 'Vehicle/equipment inspection logs' },
    { category: 'WHMIS', item: 'WHMIS labels visible' },
    { category: 'WHMIS', item: 'SDS sheets accessible' },
  ],
  monthly: [
    // Weekly items
    { category: 'General', item: 'Housekeeping' },
    { category: 'General', item: 'Scaffolding condition' },
    { category: 'General', item: 'Ladders secure' },
    { category: 'PPE', item: 'PPE being worn' },
    { category: 'Emergency', item: 'Emergency exits clear' },
    { category: 'Emergency', item: 'Fire extinguishers accessible' },
    { category: 'Electrical', item: 'Electrical cords safe' },
    { category: 'Emergency', item: 'First aid kit stocked' },
    { category: 'Fall Protection', item: 'Fall protection systems' },
    { category: 'Fall Protection', item: 'Guardrails installed' },
    { category: 'Excavation', item: 'Excavation shoring' },
    { category: 'Excavation', item: 'Trenches properly sloped' },
    { category: 'Confined Space', item: 'Confined space entry permits' },
    { category: 'Procedures', item: 'Lock-out/tag-out procedures followed' },
    { category: 'Materials', item: 'Material storage safe' },
    { category: 'Equipment', item: 'Vehicle/equipment inspection logs' },
    { category: 'WHMIS', item: 'WHMIS labels visible' },
    { category: 'WHMIS', item: 'SDS sheets accessible' },
    // Monthly additions
    { category: 'Documentation', item: 'Training records up to date' },
    { category: 'Documentation', item: 'Emergency response plan posted' },
    { category: 'Documentation', item: 'Health & safety committee meeting held' },
    { category: 'Incidents', item: 'Incident reports investigated' },
    { category: 'Incidents', item: 'Corrective actions completed' },
    { category: 'Training', item: 'Safety talks conducted' },
  ],
  pre_start: [
    { category: 'Equipment', item: 'Equipment pre-start checks completed' },
    { category: 'PPE', item: 'Required PPE available' },
    { category: 'General', item: 'Work area clear of hazards' },
    { category: 'Documentation', item: 'Permits obtained (if required)' },
    { category: 'Communication', item: 'Toolbox talk completed' },
    { category: 'Emergency', item: 'Emergency procedures reviewed' },
  ],
};

const WIZARD_STEPS = [
  { id: 'details', label: 'Details', number: 1 },
  { id: 'checklist', label: 'Checklist', number: 2 },
  { id: 'hazards', label: 'Hazards', number: 3 },
  { id: 'observations', label: 'Observations', number: 4 },
  { id: 'photos', label: 'Photos', number: 5 },
  { id: 'review', label: 'Review', number: 6 },
] as const;

// =============================================================================
// TYPES
// =============================================================================

export type InspectionType = 'daily' | 'weekly' | 'monthly' | 'pre_start';
export type ChecklistResult = 'pass' | 'fail' | 'na';
export type HazardStatus = 'open' | 'in_progress' | 'resolved';
export type Rating = 'excellent' | 'good' | 'fair' | 'poor';
export type Trend = 'up' | 'down' | 'flat';

export interface ChecklistItem {
  item: string;
  category: string;
  result: ChecklistResult;
  notes?: string;
}

export interface HazardIdentified {
  id: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  likelihood: 1 | 2 | 3 | 4;
  risk_level: number;
  photo?: CapturedPhoto;
  immediate_action: string;
  assigned_to_id: string;
  target_date: string;
  status: HazardStatus;
}

export interface SiteInspection extends BaseFormData {
  id?: string;
  inspection_number: string;
  company_id: string;
  inspection_type: InspectionType;
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
  photos: CapturedPhoto[];

  // Scoring
  score: number;
  rating: Rating;
  previous_score?: number;
  trend: Trend;
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

interface SiteInspectionFormProps {
  companyId: string;
  userId: string;
  userName: string;
  jobsites: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string }>;
  supervisors: Array<{ id: string; name: string }>;
  previousScore?: number;
  onSubmitSuccess?: (formId: string, inspectionNumber: string) => void;
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

function generateInspectionNumber(): string {
  const year = new Date().getFullYear();
  const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(3, '0');
  return `INS-${year}-${sequence}`;
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

function calculateRiskLevel(severity: number, likelihood: number): number {
  return severity * likelihood;
}

function getRiskCategory(riskLevel: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskLevel <= 4) return 'low';
  if (riskLevel <= 8) return 'medium';
  if (riskLevel <= 15) return 'high';
  return 'critical';
}

function getRiskColor(riskLevel: number): string {
  const category = getRiskCategory(riskLevel);
  switch (category) {
    case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
    case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
  }
}

function calculateScore(items: ChecklistItem[]): number {
  const applicableItems = items.filter(i => i.result !== 'na');
  if (applicableItems.length === 0) return 100;
  
  const passedItems = applicableItems.filter(i => i.result === 'pass');
  return Math.round((passedItems.length / applicableItems.length) * 100);
}

function getRating(score: number): Rating {
  if (score >= 95) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 65) return 'fair';
  return 'poor';
}

function getRatingColor(rating: Rating): string {
  switch (rating) {
    case 'excellent': return 'bg-emerald-500/20 text-emerald-400';
    case 'good': return 'bg-blue-500/20 text-blue-400';
    case 'fair': return 'bg-amber-500/20 text-amber-400';
    case 'poor': return 'bg-red-500/20 text-red-400';
  }
}

function getTrend(currentScore: number, previousScore?: number): Trend {
  if (!previousScore) return 'flat';
  if (currentScore > previousScore + 2) return 'up';
  if (currentScore < previousScore - 2) return 'down';
  return 'flat';
}

function getNextInspectionDate(type: InspectionType): string {
  const today = new Date();
  const typeConfig = INSPECTION_TYPES.find(t => t.value === type);
  const daysToAdd = typeConfig?.frequency || 7;
  
  if (type === 'pre_start') {
    // Pre-start is one-time, set to tomorrow
    today.setDate(today.getDate() + 1);
  } else {
    today.setDate(today.getDate() + daysToAdd);
  }
  
  return today.toISOString().split('T')[0];
}

function getInitialFormData(companyId: string, userId: string, userName: string, previousScore?: number): SiteInspection {
  const defaultType: InspectionType = 'daily';
  const items = CHECKLIST_ITEMS[defaultType];
  
  return {
    inspection_number: generateInspectionNumber(),
    company_id: companyId,
    inspection_type: defaultType,
    date: getCurrentDate(),
    time_started: getCurrentTime(),
    jobsite_id: '',
    weather: 'clear',
    inspector_id: userId,
    inspector_name: userName,
    checklist_items: items.map(i => ({
      item: i.item,
      category: i.category,
      result: 'na' as ChecklistResult,
    })),
    hazards_identified: [],
    positive_observations: '',
    workers_following_procedures: true,
    good_practices: '',
    workers_commended: [],
    improvements: '',
    training_needs: [],
    equipment_needed: '',
    budget_implications: false,
    photos: [],
    score: 0,
    rating: 'good',
    previous_score: previousScore,
    trend: 'flat',
    next_inspection_due: getNextInspectionDate(defaultType),
    form_status: 'draft',
    audit_element: 'Element 7',
    status: 'draft',
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SiteInspectionForm({
  companyId,
  userId,
  userName,
  jobsites,
  workers,
  supervisors,
  previousScore,
  onSubmitSuccess,
  onDraftSaved,
}: SiteInspectionFormProps) {
  const { isOnline } = useNetworkStatus();

  // Form state
  const [formData, setFormData] = useState<SiteInspection>(() => 
    getInitialFormData(companyId, userId, userName, previousScore)
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ formId: string; updatedAt: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);

  // Refs
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave<SiteInspection>> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentStepConfig = WIZARD_STEPS[currentStep];
  const failedItems = formData.checklist_items.filter(i => i.result === 'fail');
  const requiresSupervisorSignature = formData.score < 80 || 
    formData.hazards_identified.some(h => getRiskCategory(h.risk_level) === 'critical');

  // Calculate score whenever checklist changes
  useEffect(() => {
    const score = calculateScore(formData.checklist_items);
    const rating = getRating(score);
    const trend = getTrend(score, previousScore);
    
    setFormData(prev => ({
      ...prev,
      score,
      rating,
      trend,
    }));
  }, [formData.checklist_items, previousScore]);

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

  useEffect(() => {
    const checkDraft = async () => {
      const draft = await loadDraft<SiteInspection>(FORM_TYPE, companyId);
      if (draft) {
        setDraftInfo({ formId: draft.formId, updatedAt: draft.updatedAt });
        setShowDraftBanner(true);
      }
    };
    checkDraft();
  }, [companyId]);

  useEffect(() => {
    autoSaveRef.current = createAutoSave<SiteInspection>(
      FORM_TYPE,
      { companyId, workerId: userId, formType: FORM_TYPE },
      AUTO_SAVE_INTERVAL
    );
    autoSaveRef.current.start(formData);
    return () => autoSaveRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, userId]);

  useEffect(() => {
    autoSaveRef.current?.update(formData);
  }, [formData]);

  const handleRestoreDraft = async () => {
    if (draftInfo) {
      const draft = await loadDraft<SiteInspection>(FORM_TYPE, companyId);
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

  const updateField = <K extends keyof SiteInspection>(
    field: K,
    value: SiteInspection[K]
  ) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Update checklist when inspection type changes
      if (field === 'inspection_type') {
        const type = value as InspectionType;
        const items = CHECKLIST_ITEMS[type];
        updated.checklist_items = items.map(i => ({
          item: i.item,
          category: i.category,
          result: 'na' as ChecklistResult,
        }));
        updated.next_inspection_due = getNextInspectionDate(type);
      }
      
      return updated;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const updateChecklistItem = (index: number, result: ChecklistResult, notes?: string) => {
    setFormData(prev => {
      const items = [...prev.checklist_items];
      items[index] = { ...items[index], result, notes: notes ?? items[index].notes };
      return { ...prev, checklist_items: items };
    });
  };

  const addHazardFromFailedItem = (item: ChecklistItem) => {
    const newHazard: HazardIdentified = {
      id: `hazard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: `${item.category}: ${item.item}${item.notes ? ` - ${item.notes}` : ''}`,
      severity: 3,
      likelihood: 2,
      risk_level: 6,
      immediate_action: '',
      assigned_to_id: '',
      target_date: '',
      status: 'open',
    };
    
    setFormData(prev => ({
      ...prev,
      hazards_identified: [...prev.hazards_identified, newHazard],
    }));
  };

  const updateHazard = (id: string, updates: Partial<HazardIdentified>) => {
    setFormData(prev => ({
      ...prev,
      hazards_identified: prev.hazards_identified.map(h => {
        if (h.id !== id) return h;
        const updated = { ...h, ...updates };
        // Recalculate risk level if severity or likelihood changed
        if (updates.severity !== undefined || updates.likelihood !== undefined) {
          updated.risk_level = calculateRiskLevel(
            updates.severity ?? h.severity,
            updates.likelihood ?? h.likelihood
          );
        }
        return updated;
      }),
    }));
  };

  const removeHazard = (id: string) => {
    setFormData(prev => ({
      ...prev,
      hazards_identified: prev.hazards_identified.filter(h => h.id !== id),
    }));
  };

  const toggleWorkerCommended = (workerId: string) => {
    setFormData(prev => ({
      ...prev,
      workers_commended: prev.workers_commended.includes(workerId)
        ? prev.workers_commended.filter(id => id !== workerId)
        : [...prev.workers_commended, workerId],
    }));
  };

  const toggleTrainingNeed = (need: string) => {
    setFormData(prev => ({
      ...prev,
      training_needs: prev.training_needs.includes(need)
        ? prev.training_needs.filter(n => n !== need)
        : [...prev.training_needs, need],
    }));
  };

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateStep = (step: number): FormErrors => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0: // Details
        if (!formData.inspection_type) newErrors.inspection_type = 'Please select inspection type';
        if (!formData.jobsite_id) newErrors.jobsite_id = 'Please select a jobsite';
        break;

      case 1: // Checklist
        const unanswered = formData.checklist_items.filter(i => i.result === 'na').length;
        if (unanswered === formData.checklist_items.length) {
          newErrors.checklist = 'Please complete at least one checklist item';
        }
        break;

      case 2: // Hazards
        for (const hazard of formData.hazards_identified) {
          if (!hazard.immediate_action) {
            newErrors[`hazard_${hazard.id}_action`] = 'Immediate action required';
          }
          if (!hazard.assigned_to_id) {
            newErrors[`hazard_${hazard.id}_assigned`] = 'Please assign someone';
          }
          if (!hazard.target_date) {
            newErrors[`hazard_${hazard.id}_date`] = 'Target date required';
          }
        }
        break;

      case 5: // Review
        if (!formData.inspector_signature) {
          newErrors.inspector_signature = 'Inspector signature required';
        }
        if (requiresSupervisorSignature && !formData.supervisor_signature) {
          newErrors.supervisor_signature = 'Supervisor signature required (score <80% or critical hazards)';
        }
        break;
    }

    return newErrors;
  };

  const validateAllSteps = (): boolean => {
    let allErrors: FormErrors = {};
    for (let i = 0; i <= 5; i++) {
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
    
    // Auto-create hazards from failed items when moving from checklist to hazards
    if (currentStep === 1) {
      const existingHazardDescriptions = formData.hazards_identified.map(h => h.description);
      failedItems.forEach(item => {
        const desc = `${item.category}: ${item.item}`;
        if (!existingHazardDescriptions.some(d => d.startsWith(desc))) {
          addHazardFromFailedItem(item);
        }
      });
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step: number) => {
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
      workerId: userId,
      formType: FORM_TYPE,
    });

    setIsSavingDraft(false);

    if (result.success && result.formId) {
      setFormData(prev => ({ ...prev, id: result.formId }));
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

    const finalData: SiteInspection = {
      ...formData,
      status: 'submitted',
      form_status: requiresSupervisorSignature ? 'completed' : 'reviewed',
      time_completed: getCurrentTime(),
      inspector_date: new Date().toISOString(),
    };

    const result = await submitForm(FORM_TYPE, finalData, {
      companyId,
      workerId: userId,
      formType: FORM_TYPE,
      priority: 2,
    });

    setIsSubmitting(false);

    if (result.success && result.formId) {
      showToast('✅ Inspection submitted', 'success');
      onSubmitSuccess?.(result.formId, finalData.inspection_number);
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
        <h1 className="text-lg font-bold">Site Inspection</h1>
        <span className="text-sm text-[var(--muted)]">
          Step {currentStep + 1} of 6
        </span>
      </div>
      
      <div className="flex gap-1">
        {WIZARD_STEPS.map((step, index) => (
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
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <p className="text-sm text-[var(--primary)] font-medium">
          {currentStepConfig.label}
        </p>
        
        {/* Live score display */}
        <div className={`px-2 py-0.5 rounded text-xs font-medium ${getRatingColor(formData.rating)}`}>
          Score: {formData.score}% ({formData.rating})
        </div>
      </div>
    </div>
  );

  const renderStep0Details = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section A: Inspection Details
      </h2>

      {/* Inspection Type */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Inspection Type <span className="text-red-400">*</span>
        </legend>
        {errors.inspection_type && (
          <p className="text-red-400 text-sm">{errors.inspection_type}</p>
        )}
        <div className="space-y-2">
          {INSPECTION_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.inspection_type === type.value
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="radio"
                name="inspection_type"
                value={type.value}
                checked={formData.inspection_type === type.value}
                onChange={(e) => updateField('inspection_type', e.target.value as InspectionType)}
                className="w-5 h-5 accent-[var(--primary)]"
              />
              <span className="font-medium">{type.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium">
            Date <span className="text-red-400">*</span>
          </label>
          <input
            id="date"
            type="date"
            value={formData.date}
            readOnly
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="time_started" className="block text-sm font-medium">
            Time Started <span className="text-red-400">*</span>
          </label>
          <input
            id="time_started"
            type="time"
            value={formData.time_started}
            readOnly
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
          />
        </div>
      </div>

      {/* Jobsite */}
      <div className="space-y-2">
        <label htmlFor="jobsite_id" className="block text-sm font-medium">
          Jobsite <span className="text-red-400">*</span>
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

      {/* Weather */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Weather Conditions</legend>
        <div className="grid grid-cols-4 gap-2">
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

      {/* Inspector (read-only) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Inspector</label>
        <input
          type="text"
          value={formData.inspector_name || userName}
          readOnly
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
        />
      </div>
    </div>
  );

  const renderStep1Checklist = () => {
    // Group items by category
    const groupedItems = formData.checklist_items.reduce((acc, item, index) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push({ ...item, index });
      return acc;
    }, {} as Record<string, (ChecklistItem & { index: number })[]>);

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
          Section B: Inspection Checklist
        </h2>
        
        {errors.checklist && (
          <p className="text-red-400 text-sm">{errors.checklist}</p>
        )}

        <p className="text-sm text-[var(--muted)]">
          Rate each item: ✅ Pass | ❌ Fail | ➖ N/A
        </p>

        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
              {category}
            </h3>
            
            {items.map((item) => (
              <div
                key={item.index}
                className={`p-4 rounded-xl border-2 transition-all ${
                  item.result === 'fail' 
                    ? 'border-red-500/50 bg-red-500/5'
                    : item.result === 'pass'
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium flex-1">{item.item}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateChecklistItem(item.index, 'pass')}
                      className={`w-12 h-10 rounded-lg flex items-center justify-center transition-all ${
                        item.result === 'pass'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--background)] border border-[var(--border)] hover:bg-emerald-500/20'
                      }`}
                    >
                      ✅
                    </button>
                    <button
                      type="button"
                      onClick={() => updateChecklistItem(item.index, 'fail')}
                      className={`w-12 h-10 rounded-lg flex items-center justify-center transition-all ${
                        item.result === 'fail'
                          ? 'bg-red-500 text-white'
                          : 'bg-[var(--background)] border border-[var(--border)] hover:bg-red-500/20'
                      }`}
                    >
                      ❌
                    </button>
                    <button
                      type="button"
                      onClick={() => updateChecklistItem(item.index, 'na')}
                      className={`w-12 h-10 rounded-lg flex items-center justify-center transition-all ${
                        item.result === 'na'
                          ? 'bg-gray-500 text-white'
                          : 'bg-[var(--background)] border border-[var(--border)] hover:bg-gray-500/20'
                      }`}
                    >
                      ➖
                    </button>
                  </div>
                </div>
                
                {item.result === 'fail' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateChecklistItem(item.index, item.result, e.target.value)}
                      placeholder="Add notes about this failure..."
                      className="w-full h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Summary */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <div className="flex justify-between items-center">
            <span className="font-medium">Current Score</span>
            <div className="flex items-center gap-3">
              {previousScore !== undefined && (
                <span className="text-sm text-[var(--muted)]">
                  Previous: {previousScore}%
                  {formData.trend === 'up' && ' 📈'}
                  {formData.trend === 'down' && ' 📉'}
                  {formData.trend === 'flat' && ' ➡️'}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full font-semibold ${getRatingColor(formData.rating)}`}>
                {formData.score}%
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">
            {failedItems.length} item{failedItems.length !== 1 ? 's' : ''} failed • 
            {formData.checklist_items.filter(i => i.result === 'pass').length} passed • 
            {formData.checklist_items.filter(i => i.result === 'na').length} N/A
          </p>
        </div>
      </div>
    );
  };

  const renderStep2Hazards = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section C: Hazards Identified
      </h2>

      {failedItems.length > 0 && formData.hazards_identified.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/50">
          <p className="text-amber-400 text-sm">
            ⚠️ {failedItems.length} failed item{failedItems.length !== 1 ? 's' : ''} detected. 
            Hazard entries will be auto-created.
          </p>
        </div>
      )}

      {formData.hazards_identified.length === 0 && failedItems.length === 0 && (
        <div className="p-8 rounded-xl bg-emerald-500/10 border border-emerald-500/50 text-center">
          <p className="text-emerald-400 text-lg mb-2">✅ No Hazards Found</p>
          <p className="text-sm text-[var(--muted)]">
            All checklist items passed or were marked N/A
          </p>
        </div>
      )}

      {formData.hazards_identified.map((hazard) => (
        <div
          key={hazard.id}
          className={`p-4 rounded-xl border-2 space-y-4 ${getRiskColor(hazard.risk_level)}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{hazard.description}</p>
              <p className="text-sm mt-1">
                Risk Level: <span className="font-bold">{hazard.risk_level}</span>
                <span className="ml-2 px-2 py-0.5 rounded text-xs uppercase">
                  {getRiskCategory(hazard.risk_level)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeHazard(hazard.id)}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>

          {/* Severity & Likelihood */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Severity</label>
              <select
                value={hazard.severity}
                onChange={(e) => updateHazard(hazard.id, { severity: parseInt(e.target.value) as 1|2|3|4|5 })}
                className="w-full h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm appearance-none"
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.value} - {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Likelihood</label>
              <select
                value={hazard.likelihood}
                onChange={(e) => updateHazard(hazard.id, { likelihood: parseInt(e.target.value) as 1|2|3|4 })}
                className="w-full h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm appearance-none"
              >
                {LIKELIHOOD_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.value} - {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hazard Photo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Photo of Hazard</label>
            <PhotoCapture
              photos={hazard.photo ? [hazard.photo] : []}
              onPhotosChange={(photos) => updateHazard(hazard.id, { photo: photos[0] })}
              maxPhotos={1}
            />
          </div>

          {/* Immediate Action */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Immediate Action Taken <span className="text-red-400">*</span>
            </label>
            <textarea
              value={hazard.immediate_action}
              onChange={(e) => updateHazard(hazard.id, { immediate_action: e.target.value })}
              placeholder="Describe action taken to address hazard..."
              rows={3}
              className={`w-full p-3 rounded-lg bg-[var(--background)] border text-sm resize-none ${
                errors[`hazard_${hazard.id}_action`] ? 'border-red-500' : 'border-[var(--border)]'
              }`}
            />
            {errors[`hazard_${hazard.id}_action`] && (
              <p className="text-red-400 text-xs">{errors[`hazard_${hazard.id}_action`]}</p>
            )}
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Assigned To <span className="text-red-400">*</span>
              </label>
              <select
                value={hazard.assigned_to_id}
                onChange={(e) => updateHazard(hazard.id, { assigned_to_id: e.target.value })}
                className={`w-full h-10 px-3 rounded-lg bg-[var(--background)] border text-sm appearance-none ${
                  errors[`hazard_${hazard.id}_assigned`] ? 'border-red-500' : 'border-[var(--border)]'
                }`}
              >
                <option value="">Select person...</option>
                {supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Target Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={hazard.target_date}
                min={getCurrentDate()}
                onChange={(e) => updateHazard(hazard.id, { target_date: e.target.value })}
                className={`w-full h-10 px-3 rounded-lg bg-[var(--background)] border text-sm ${
                  errors[`hazard_${hazard.id}_date`] ? 'border-red-500' : 'border-[var(--border)]'
                }`}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add manual hazard button */}
      <button
        type="button"
        onClick={() => {
          const newHazard: HazardIdentified = {
            id: `hazard_${Date.now()}`,
            description: '',
            severity: 3,
            likelihood: 2,
            risk_level: 6,
            immediate_action: '',
            assigned_to_id: '',
            target_date: '',
            status: 'open',
          };
          setFormData(prev => ({
            ...prev,
            hazards_identified: [...prev.hazards_identified, newHazard],
          }));
        }}
        className="w-full h-12 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
      >
        + Add Additional Hazard
      </button>

      {/* Risk Matrix Legend */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <p className="text-sm font-medium mb-3">Risk Matrix (Severity × Likelihood)</p>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded bg-green-500/20 text-green-400 text-center">
            Low (1-4)
          </div>
          <div className="p-2 rounded bg-amber-500/20 text-amber-400 text-center">
            Medium (5-8)
          </div>
          <div className="p-2 rounded bg-orange-500/20 text-orange-400 text-center">
            High (9-15)
          </div>
          <div className="p-2 rounded bg-red-500/20 text-red-400 text-center">
            Critical (16-20)
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3Observations = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section D: Positive Observations
      </h2>

      {/* What's Working Well */}
      <div className="space-y-2">
        <label htmlFor="positive_observations" className="block text-sm font-medium">
          What's working well?
        </label>
        <textarea
          id="positive_observations"
          value={formData.positive_observations}
          onChange={(e) => updateField('positive_observations', e.target.value)}
          placeholder="Describe positive safety practices observed..."
          rows={4}
          className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
        />
      </div>

      {/* Workers Following Procedures */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Workers following procedures?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.workers_following_procedures ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="workers_following_procedures"
              checked={formData.workers_following_procedures}
              onChange={() => updateField('workers_following_procedures', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.workers_following_procedures ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="workers_following_procedures"
              checked={!formData.workers_following_procedures}
              onChange={() => updateField('workers_following_procedures', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>

      {/* Good Practices */}
      <div className="space-y-2">
        <label htmlFor="good_practices" className="block text-sm font-medium">
          Good safety practices observed
        </label>
        <textarea
          id="good_practices"
          value={formData.good_practices}
          onChange={(e) => updateField('good_practices', e.target.value)}
          placeholder="Examples of excellent safety behaviors..."
          rows={3}
          className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
        />
      </div>

      {/* Workers to Commend */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Workers to commend</legend>
        <div className="grid grid-cols-2 gap-2">
          {workers.slice(0, 10).map((worker) => (
            <label
              key={worker.id}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                formData.workers_commended.includes(worker.id)
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.workers_commended.includes(worker.id)}
                onChange={() => toggleWorkerCommended(worker.id)}
                className="w-5 h-5 rounded accent-emerald-500"
              />
              <span className="text-sm truncate">{worker.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Section E: Recommendations */}
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-6">
        Section E: Recommendations
      </h2>

      {/* Improvements */}
      <div className="space-y-2">
        <label htmlFor="improvements" className="block text-sm font-medium">
          Recommended improvements
        </label>
        <textarea
          id="improvements"
          value={formData.improvements}
          onChange={(e) => updateField('improvements', e.target.value)}
          placeholder="Suggestions for improving safety on site..."
          rows={4}
          className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
        />
      </div>

      {/* Training Needs */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Training needs identified</legend>
        <div className="grid grid-cols-2 gap-2">
          {TRAINING_NEEDS.map((need) => (
            <label
              key={need.value}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                formData.training_needs.includes(need.value)
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.training_needs.includes(need.value)}
                onChange={() => toggleTrainingNeed(need.value)}
                className="w-5 h-5 rounded accent-[var(--primary)]"
              />
              <span className="text-sm">{need.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Equipment Needed */}
      <div className="space-y-2">
        <label htmlFor="equipment_needed" className="block text-sm font-medium">
          Equipment needed
        </label>
        <textarea
          id="equipment_needed"
          value={formData.equipment_needed}
          onChange={(e) => updateField('equipment_needed', e.target.value)}
          placeholder="List any equipment that needs to be purchased or replaced..."
          rows={3}
          className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
        />
      </div>

      {/* Budget Implications */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Budget implications?</legend>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            formData.budget_implications ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="budget_implications"
              checked={formData.budget_implications}
              onChange={() => updateField('budget_implications', true)}
              className="sr-only"
            />
            <span className="font-medium">Yes</span>
          </label>
          <label className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-all ${
            !formData.budget_implications ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <input
              type="radio"
              name="budget_implications"
              checked={!formData.budget_implications}
              onChange={() => updateField('budget_implications', false)}
              className="sr-only"
            />
            <span className="font-medium">No</span>
          </label>
        </div>
      </fieldset>
    </div>
  );

  const renderStep4Photos = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
        Section F: Photos
      </h2>

      <PhotoCapture
        label="General site conditions"
        photos={formData.photos}
        onPhotosChange={(photos) => updateField('photos', photos)}
        maxPhotos={20}
      />

      {/* Summary of hazard photos */}
      {formData.hazards_identified.filter(h => h.photo).length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">
            📷 {formData.hazards_identified.filter(h => h.photo).length} hazard photo{formData.hazards_identified.filter(h => h.photo).length !== 1 ? 's' : ''} captured in Hazards section
          </p>
        </div>
      )}
    </div>
  );

  const renderStep5Review = () => {
    const jobsite = jobsites.find(j => j.id === formData.jobsite_id);
    const criticalHazards = formData.hazards_identified.filter(h => getRiskCategory(h.risk_level) === 'critical');
    const highHazards = formData.hazards_identified.filter(h => getRiskCategory(h.risk_level) === 'high');
    
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2">
          Section G: Review & Submit
        </h2>

        {/* Score Summary */}
        <div className={`p-6 rounded-xl border-2 text-center ${getRatingColor(formData.rating).replace('text-', 'border-').replace('/20', '/50')}`}>
          <p className="text-4xl font-bold">{formData.score}%</p>
          <p className="text-lg font-medium capitalize mt-1">{formData.rating}</p>
          {previousScore !== undefined && (
            <p className="text-sm text-[var(--muted)] mt-2">
              Previous: {previousScore}%
              {formData.trend === 'up' && ' 📈 Improving'}
              {formData.trend === 'down' && ' 📉 Declining'}
              {formData.trend === 'flat' && ' ➡️ Stable'}
            </p>
          )}
        </div>

        {/* Inspection Summary */}
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Inspection Number</span>
            <span className="font-mono font-medium">{formData.inspection_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Type</span>
            <span className="font-medium capitalize">{formData.inspection_type.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Jobsite</span>
            <span className="font-medium">{jobsite?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Date</span>
            <span className="font-medium">{formData.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Inspector</span>
            <span className="font-medium">{formData.inspector_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Next Inspection Due</span>
            <span className="font-medium">{formData.next_inspection_due}</span>
          </div>
        </div>

        {/* Hazard Summary */}
        {formData.hazards_identified.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <p className="font-medium mb-2">Hazards Identified: {formData.hazards_identified.length}</p>
            <div className="flex gap-2 text-sm">
              {criticalHazards.length > 0 && (
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
                  {criticalHazards.length} Critical
                </span>
              )}
              {highHazards.length > 0 && (
                <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400">
                  {highHazards.length} High
                </span>
              )}
            </div>
          </div>
        )}

        {/* Alerts */}
        {criticalHazards.length > 0 && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50">
            <p className="text-red-400 font-medium">
              🚨 Critical hazards identified - Safety manager will be notified immediately
            </p>
          </div>
        )}

        {formData.rating === 'poor' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/50">
            <p className="text-amber-400 font-medium">
              ⚠️ Poor inspection score - Director and safety manager will be notified
            </p>
          </div>
        )}

        {/* Section H: Signatures */}
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 pt-4">
          Section H: Signatures
        </h2>

        <SignaturePad
          label="Inspector Signature"
          value={formData.inspector_signature}
          onSignatureChange={(sig) => {
            updateField('inspector_signature', sig?.data);
            if (sig) {
              updateField('inspector_date', sig.timestamp);
            }
          }}
          required
          error={errors.inspector_signature}
        />

        {requiresSupervisorSignature && (
          <>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/50 text-sm">
              <p className="text-amber-400">
                ⚠️ Supervisor signature required due to score &lt;80% or critical hazards
              </p>
            </div>
            <SignaturePad
              label="Supervisor Review Signature"
              value={formData.supervisor_signature}
              onSignatureChange={(sig) => {
                updateField('supervisor_signature', sig?.data);
                if (sig) {
                  updateField('supervisor_date', sig.timestamp);
                }
              }}
              required
              error={errors.supervisor_signature}
            />
          </>
        )}

        {/* COR Audit Info */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-blue-400">
            📋 This inspection will be tagged as COR audit evidence for <strong>{formData.audit_element}</strong>
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
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 left-4 right-4 z-50 p-4 rounded-xl shadow-lg animate-slide-down ${
            toast.type === 'success' ? 'bg-emerald-500 text-white'
            : toast.type === 'error' ? 'bg-red-500 text-white'
            : toast.type === 'warning' ? 'bg-amber-500 text-black'
            : 'bg-blue-500 text-white'
          }`}
        >
          <p className="font-medium text-center">{toast.message}</p>
        </div>
      )}

      {/* Draft Banner */}
      {showDraftBanner && draftInfo && (
        <div className="sticky top-0 z-40 bg-amber-500 text-black px-4 py-3">
          <p className="text-sm font-medium mb-2">
            📝 Resume your draft from {formatRelativeTime(draftInfo.updatedAt)}?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="flex-1 bg-black/20 hover:bg-black/30 text-black font-semibold py-2 px-4 rounded-lg"
            >
              Yes, restore
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="flex-1 bg-white/20 hover:bg-white/30 text-black font-semibold py-2 px-4 rounded-lg"
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
        {currentStep === 1 && renderStep1Checklist()}
        {currentStep === 2 && renderStep2Hazards()}
        {currentStep === 3 && renderStep3Observations()}
        {currentStep === 4 && renderStep4Photos()}
        {currentStep === 5 && renderStep5Review()}
      </div>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold"
            >
              ← Back
            </button>
          )}
          
          {currentStep === 0 && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold disabled:opacity-50"
            >
              {isSavingDraft ? 'Saving...' : '💾 Save Draft'}
            </button>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white font-semibold"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {isSubmitting ? '⟳ Submitting...' : '✅ Submit Inspection'}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-[var(--muted)]">
          <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
          {lastAutoSave && <span>Auto-saved {formatRelativeTime(lastAutoSave)}</span>}
        </div>
      </div>
    </div>
  );
}

export type { SiteInspectionFormProps };
