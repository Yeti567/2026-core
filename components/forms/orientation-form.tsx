'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  submitForm,
  saveDraft,
  loadDraft,
  deleteDraft,
  createAutoSave,
} from '@/lib/sync/form-submission';
import PhotoCapture, { type CapturedPhoto } from '@/components/ui/photo-capture';
import SignaturePad from '@/components/ui/signature-pad';
import {
  type WorkerOrientation,
  type PPEItem,
  type SiteHazard,
  type KeyPersonnel,
  type MandatoryTraining,
  type SWPReviewed,
  type CompetencyDemo,
  type QuizQuestion,
  SITE_HAZARDS_OPTIONS,
  PPE_OPTIONS,
  POLICIES_OPTIONS,
  SAFETY_POLICIES_OPTIONS,
  SITE_RULES_OPTIONS,
  MANDATORY_TRAINING_OPTIONS,
  KEY_PERSONNEL_ROLES,
  QUIZ_QUESTIONS_BANK,
  WIZARD_STEPS,
} from './orientation-types';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORM_TYPE = 'worker_orientation';
const AUTO_SAVE_INTERVAL = 120000; // 2 minutes

// =============================================================================
// PROPS & TYPES
// =============================================================================

interface OrientationFormProps {
  companyId: string;
  workerId: string;
  workerName: string;
  workerPosition: string;
  hireDate: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  jobsites: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string }>;
  supervisors: Array<{ id: string; name: string }>;
  swpList: Array<{ id: string; name: string }>;
  onSubmitSuccess?: (formId: string, orientationNumber: string) => void;
  onDraftSaved?: (formId: string) => void;
}

interface FormErrors { [key: string]: string | undefined; }
type ToastType = 'success' | 'info' | 'warning' | 'error';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getCurrentDate = () => new Date().toISOString().split('T')[0];
const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const generateOrientationNumber = () => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `ORI-${year}-${seq}`;
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

const getInitialFormData = (props: OrientationFormProps): WorkerOrientation => ({
  orientation_number: generateOrientationNumber(),
  company_id: props.companyId,
  worker_id: props.workerId,
  worker_name: props.workerName,
  position: props.workerPosition,
  hire_date: props.hireDate,
  start_date: getCurrentDate(),
  previous_experience: false,
  previous_training: false,
  emergency_contact_name: props.emergencyContactName || '',
  emergency_contact_phone: props.emergencyContactPhone || '',
  paperwork: { tax_forms: false, wsib_confirmed: false, emergency_contact_form: false, banking: false },
  ppe_issued: [],
  policies_reviewed: [],
  worker_receipt_signature: '',
  admin_signature: '',
  admin_date: '',
  worker_rights: { right_to_know: false, right_to_participate: false, right_to_refuse: false, responsibilities: false },
  right_to_refuse_quiz_answer: '',
  worker_rights_signature: '',
  safety_policies_reviewed: [],
  site_tour_completed: false,
  site_tour_date: '',
  site_tour_time: '',
  site_hazards: [],
  site_rules_explained: [],
  site_photos: [],
  emergency_assembly_shown: false,
  emergency_phones_posted: false,
  fire_extinguisher_shown: false,
  first_aid_shown: false,
  nearest_hospital: '',
  evacuation_explained: false,
  severe_weather_explained: false,
  emergency_contacts_provided: false,
  emergency_quiz_answer: '',
  key_personnel: [],
  buddy_assigned: false,
  equipment_signout_explained: false,
  personal_tool_policy: false,
  tool_inspection_explained: false,
  lockout_tagout_explained: false,
  lockout_demo_passed: false,
  lockout_evaluator_signature: '',
  mobile_equipment_explained: false,
  mandatory_training: MANDATORY_TRAINING_OPTIONS.map(t => ({ course: t.label, completed: false })),
  training_required: [],
  swp_reviewed: [],
  competency_demos: [],
  worker_questions_answered: true,
  worker_understands_requirements: true,
  worker_comfortable: true,
  buddy_extension_needed: false,
  worker_declaration_signature: '',
  worker_declaration_date: '',
  supervisor_ready_independent: true,
  supervisor_signature: '',
  supervisor_date: '',
  safety_manager_signature: '',
  safety_manager_date: '',
  quiz_taken: false,
  quiz_questions: [],
  quiz_passed: false,
  buddy_check_ins: [],
  buddy_final_signoff: false,
  completion_percentage: 0,
  current_day: 1,
  days_to_complete: 0,
  form_status: 'in_progress',
  audit_element: 'Element 4',
  status: 'draft',
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function OrientationForm(props: OrientationFormProps) {
  const { companyId, workerId, workerName, supervisors, workers, swpList, onSubmitSuccess, onDraftSaved } = props;
  const { isOnline } = useNetworkStatus();

  // Form state
  const [formData, setFormData] = useState<WorkerOrientation>(() => getInitialFormData(props));
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ formId: string; updatedAt: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);

  // Refs
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave<WorkerOrientation>> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Computed values
  const currentStepConfig = WIZARD_STEPS[currentStep];
  const completionPercent = useMemo(() => calculateCompletion(formData), [formData]);

  // ==========================================================================
  // TOAST
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
      const draft = await loadDraft<WorkerOrientation>(FORM_TYPE, companyId);
      if (draft) {
        setDraftInfo({ formId: draft.formId, updatedAt: draft.updatedAt });
        setShowDraftBanner(true);
      }
    };
    checkDraft();
  }, [companyId]);

  useEffect(() => {
    autoSaveRef.current = createAutoSave<WorkerOrientation>(
      FORM_TYPE,
      { companyId, workerId, formType: FORM_TYPE },
      AUTO_SAVE_INTERVAL
    );
    autoSaveRef.current.start(formData);
    return () => autoSaveRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, workerId]);

  useEffect(() => {
    autoSaveRef.current?.update(formData);
  }, [formData]);

  const handleRestoreDraft = async () => {
    if (draftInfo) {
      const draft = await loadDraft<WorkerOrientation>(FORM_TYPE, companyId);
      if (draft) {
        setFormData(draft.data);
        showToast('Draft restored', 'info');
      }
    }
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = async () => {
    if (draftInfo) await deleteDraft(FORM_TYPE, companyId, draftInfo.formId);
    setShowDraftBanner(false);
    setDraftInfo(null);
  };

  // ==========================================================================
  // FORM HANDLERS
  // ==========================================================================

  const updateField = <K extends keyof WorkerOrientation>(field: K, value: WorkerOrientation[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const updatePaperwork = (key: keyof WorkerOrientation['paperwork'], value: boolean) => {
    setFormData(prev => ({ ...prev, paperwork: { ...prev.paperwork, [key]: value } }));
  };

  const updateRights = (key: keyof WorkerOrientation['worker_rights'], value: boolean) => {
    setFormData(prev => ({ ...prev, worker_rights: { ...prev.worker_rights, [key]: value } }));
  };

  const togglePolicy = (policy: string, type: 'policies_reviewed' | 'safety_policies_reviewed' | 'site_rules_explained') => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].includes(policy) ? prev[type].filter(p => p !== policy) : [...prev[type], policy],
    }));
  };

  const addPPE = (item: string) => {
    const newPPE: PPEItem = { item, issued_date: getCurrentDate() };
    setFormData(prev => ({ ...prev, ppe_issued: [...prev.ppe_issued, newPPE] }));
  };

  const updatePPE = (index: number, updates: Partial<PPEItem>) => {
    setFormData(prev => ({
      ...prev,
      ppe_issued: prev.ppe_issued.map((p, i) => i === index ? { ...p, ...updates } : p),
    }));
  };

  const removePPE = (index: number) => {
    setFormData(prev => ({ ...prev, ppe_issued: prev.ppe_issued.filter((_, i) => i !== index) }));
  };

  const toggleHazard = (hazard: string) => {
    setFormData(prev => {
      const exists = prev.site_hazards.find(h => h.hazard === hazard);
      if (exists) {
        return { ...prev, site_hazards: prev.site_hazards.filter(h => h.hazard !== hazard) };
      }
      const newHazard: SiteHazard = { hazard, controls: '', ppe_required: [] };
      return { ...prev, site_hazards: [...prev.site_hazards, newHazard] };
    });
  };

  const updateHazard = (hazard: string, updates: Partial<SiteHazard>) => {
    setFormData(prev => ({
      ...prev,
      site_hazards: prev.site_hazards.map(h => h.hazard === hazard ? { ...h, ...updates } : h),
    }));
  };

  const addKeyPersonnel = (role: string) => {
    const newPerson: KeyPersonnel = { role, name: '', signature: '', date: '' };
    setFormData(prev => ({ ...prev, key_personnel: [...prev.key_personnel, newPerson] }));
  };

  const updateKeyPersonnel = (index: number, updates: Partial<KeyPersonnel>) => {
    setFormData(prev => ({
      ...prev,
      key_personnel: prev.key_personnel.map((p, i) => i === index ? { ...p, ...updates } : p),
    }));
  };

  const updateMandatoryTraining = (course: string, updates: Partial<MandatoryTraining>) => {
    setFormData(prev => ({
      ...prev,
      mandatory_training: prev.mandatory_training.map(t => t.course === course ? { ...t, ...updates } : t),
    }));
  };

  const addSWP = (swpName: string) => {
    const newSWP: SWPReviewed = { swp_name: swpName, reviewed: false, worker_initials: '', date: '' };
    setFormData(prev => ({ ...prev, swp_reviewed: [...prev.swp_reviewed, newSWP] }));
  };

  const updateSWP = (index: number, updates: Partial<SWPReviewed>) => {
    setFormData(prev => ({
      ...prev,
      swp_reviewed: prev.swp_reviewed.map((s, i) => i === index ? { ...s, ...updates } : s),
    }));
  };

  const addCompetencyDemo = () => {
    const newDemo: CompetencyDemo = {
      task: '', result: '', evaluator_id: '', evaluator_signature: '', date: getCurrentDate(),
    };
    setFormData(prev => ({ ...prev, competency_demos: [...prev.competency_demos, newDemo] }));
  };

  const updateCompetencyDemo = (index: number, updates: Partial<CompetencyDemo>) => {
    setFormData(prev => ({
      ...prev,
      competency_demos: prev.competency_demos.map((d, i) => i === index ? { ...d, ...updates } : d),
    }));
  };

  const initializeQuiz = () => {
    const shuffled = [...QUIZ_QUESTIONS_BANK].sort(() => Math.random() - 0.5).slice(0, 10);
    const questions: QuizQuestion[] = shuffled.map(q => ({
      id: q.id, question: q.question, answer: '', correct: false,
    }));
    setFormData(prev => ({ ...prev, quiz_questions: questions, quiz_taken: true }));
  };

  const updateQuizAnswer = (id: string, answer: string) => {
    const qBank = QUIZ_QUESTIONS_BANK.find(q => q.id === id);
    const isCorrect = qBank ? answer.toLowerCase().includes(qBank.correctAnswer.toLowerCase().slice(0, 20)) : false;
    setFormData(prev => ({
      ...prev,
      quiz_questions: prev.quiz_questions.map(q => q.id === id ? { ...q, answer, correct: isCorrect } : q),
    }));
  };

  const submitQuiz = () => {
    const correctCount = formData.quiz_questions.filter(q => q.correct).length;
    const score = Math.round((correctCount / formData.quiz_questions.length) * 100);
    const passed = score >= 80;
    setFormData(prev => ({ ...prev, quiz_score: score, quiz_passed: passed }));
    showToast(passed ? `✅ Quiz passed! Score: ${score}%` : `❌ Quiz failed. Score: ${score}%. Additional training required.`, passed ? 'success' : 'error');
  };

  // ==========================================================================
  // COMPLETION CALCULATION
  // ==========================================================================

  function calculateCompletion(data: WorkerOrientation): number {
    let completed = 0;
    let total = 0;

    // Section A
    total += 4;
    if (data.worker_name) completed++;
    if (data.position) completed++;
    if (data.emergency_contact_name) completed++;
    if (data.emergency_contact_phone) completed++;

    // Section B
    total += 7;
    if (data.paperwork.tax_forms) completed++;
    if (data.paperwork.wsib_confirmed) completed++;
    if (data.paperwork.emergency_contact_form) completed++;
    if (data.paperwork.banking) completed++;
    if (data.ppe_issued.length > 0) completed++;
    if (data.policies_reviewed.length >= 3) completed++;
    if (data.admin_signature) completed++;

    // Section C1-C2
    total += 6;
    if (data.worker_rights.right_to_know) completed++;
    if (data.worker_rights.right_to_participate) completed++;
    if (data.worker_rights.right_to_refuse) completed++;
    if (data.worker_rights.responsibilities) completed++;
    if (data.worker_rights_signature) completed++;
    if (data.safety_policies_reviewed.length >= 5) completed++;

    // Section C3-C4
    total += 8;
    if (data.site_tour_completed) completed++;
    if (data.site_hazards.length > 0) completed++;
    if (data.site_rules_explained.length >= 5) completed++;
    if (data.emergency_assembly_shown) completed++;
    if (data.fire_extinguisher_shown) completed++;
    if (data.first_aid_shown) completed++;
    if (data.evacuation_explained) completed++;
    if (data.emergency_contacts_provided) completed++;

    // Section C5
    total += 2;
    if (data.key_personnel.length >= 2) completed++;
    if (data.buddy_assigned) completed++;

    // Section C6
    total += 4;
    if (data.equipment_signout_explained) completed++;
    if (data.lockout_tagout_explained) completed++;
    if (data.lockout_demo_passed) completed++;
    if (data.lockout_evaluator_signature) completed++;

    // Section D
    total += 3;
    if (data.mandatory_training.some(t => t.completed)) completed++;
    if (data.swp_reviewed.length > 0 && data.swp_reviewed.some(s => s.reviewed)) completed++;
    if (data.competency_demos.length > 0 && data.competency_demos.some(d => d.result === 'pass')) completed++;

    // Section E
    total += 3;
    if (data.worker_declaration_signature) completed++;
    if (data.supervisor_signature) completed++;
    if (data.safety_manager_signature) completed++;

    return Math.round((completed / total) * 100);
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateStep = (step: number): FormErrors => {
    const newErrors: FormErrors = {};
    switch (step) {
      case 0: // Worker Info
        if (!formData.emergency_contact_name) newErrors.emergency_contact_name = 'Required';
        if (!formData.emergency_contact_phone) newErrors.emergency_contact_phone = 'Required';
        break;
      case 1: // Admin
        if (!formData.paperwork.tax_forms) newErrors.tax_forms = 'Must be completed';
        if (!formData.paperwork.wsib_confirmed) newErrors.wsib_confirmed = 'Must be confirmed';
        if (formData.ppe_issued.length === 0) newErrors.ppe = 'At least one PPE item required';
        break;
      case 2: // Rights
        if (!formData.worker_rights.right_to_refuse) newErrors.right_to_refuse = 'CRITICAL: Must be explained';
        if (!formData.right_to_refuse_quiz_answer) newErrors.right_to_refuse_quiz = 'Worker must answer';
        break;
      case 3: // Site Tour
        if (!formData.site_tour_completed) newErrors.site_tour = 'Site tour required';
        if (formData.site_hazards.length === 0) newErrors.hazards = 'At least one hazard must be identified';
        break;
      case 4: // Introductions
        if (formData.key_personnel.length < 2) newErrors.key_personnel = 'Must meet at least 2 key personnel';
        break;
      case 5: // Equipment
        if (!formData.lockout_tagout_explained) newErrors.lockout = 'Lock-out/tag-out must be explained';
        break;
      case 10: // Sign-off
        if (!formData.worker_declaration_signature) newErrors.worker_signature = 'Worker signature required';
        if (!formData.supervisor_signature) newErrors.supervisor_signature = 'Supervisor signature required';
        if (!formData.safety_manager_signature) newErrors.safety_manager_signature = 'Safety manager signature required';
        break;
    }
    return newErrors;
  };

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      showToast('Please complete required fields', 'error');
      return;
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ==========================================================================
  // SUBMIT / SAVE
  // ==========================================================================

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    const result = await saveDraft(FORM_TYPE, { ...formData, completion_percentage: completionPercent }, {
      companyId, workerId, formType: FORM_TYPE,
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
    // Validate final step
    const finalErrors = validateStep(10);
    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      showToast('Please complete all required signatures', 'error');
      return;
    }

    if (completionPercent < 100) {
      showToast('⚠️ Orientation must be 100% complete', 'warning');
      return;
    }

    setIsSubmitting(true);
    autoSaveRef.current?.stop();

    const finalData: WorkerOrientation = {
      ...formData,
      status: 'submitted',
      form_status: 'completed',
      completion_percentage: 100,
      days_to_complete: Math.ceil((Date.now() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)),
    };

    const result = await submitForm(FORM_TYPE, finalData, {
      companyId, workerId, formType: FORM_TYPE, priority: 3,
    });

    setIsSubmitting(false);

    if (result.success && result.formId) {
      showToast('✅ Orientation completed!', 'success');
      onSubmitSuccess?.(result.formId, finalData.orientation_number);
    } else {
      showToast(result.error || 'Submission failed', 'error');
      autoSaveRef.current?.start(formData);
    }
  };

  // ==========================================================================
  // RENDER SECTIONS
  // ==========================================================================

  const renderProgressHeader = () => (
    <div className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-bold">New Worker Orientation</h1>
          <p className="text-xs text-[var(--muted)]">{formData.orientation_number} • COR Element 4</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-[var(--primary)]">{completionPercent}%</span>
          <p className="text-xs text-[var(--muted)]">Day {currentStepConfig.day} of 3</p>
        </div>
      </div>
      <div className="flex gap-0.5">
        {WIZARD_STEPS.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => i <= currentStep && setCurrentStep(i)}
            disabled={i > currentStep}
            className={`flex-1 h-2 rounded-full transition-all ${
              i === currentStep ? 'bg-[var(--primary)]' : i < currentStep ? 'bg-emerald-500' : 'bg-[var(--border)]'
            }`}
            title={`${step.label} (${step.section})`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <span className={currentStepConfig.day === 1 ? 'text-[var(--primary)] font-medium' : 'text-[var(--muted)]'}>
          Day 1: {WIZARD_STEPS.filter(s => s.day === 1).map(s => s.label).join(', ')}
        </span>
      </div>
      <p className="text-sm font-medium text-[var(--primary)] mt-2">
        Section {currentStepConfig.section}: {currentStepConfig.label}
      </p>
    </div>
  );

  // Step 0: Worker Information (Section A)
  const renderStep0WorkerInfo = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">📋 Section A: Worker Information</h3>
        <p className="text-sm text-[var(--muted)]">Pre-filled from profile. Verify and update as needed.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Worker Name</label>
          <input type="text" value={formData.worker_name} readOnly className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] opacity-70" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Position/Trade</label>
          <input type="text" value={formData.position} readOnly className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] opacity-70" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Hire Date</label>
        <input type="date" value={formData.hire_date} readOnly className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] opacity-70" />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Previous construction experience?</legend>
        <div className="flex gap-4">
          {[true, false].map(val => (
            <label key={String(val)} className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${formData.previous_experience === val ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'}`}>
              <input type="radio" checked={formData.previous_experience === val} onChange={() => updateField('previous_experience', val)} className="sr-only" />
              <span>{val ? 'Yes' : 'No'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {formData.previous_experience && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Years of Experience</label>
          <input
            type="number"
            value={formData.years_experience || ''}
            onChange={e => updateField('years_experience', parseInt(e.target.value) || 0)}
            min={0}
            max={50}
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
          />
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Previous safety training?</legend>
        <div className="flex gap-4">
          {[true, false].map(val => (
            <label key={String(val)} className={`flex-1 flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer ${formData.previous_training === val ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'}`}>
              <input type="radio" checked={formData.previous_training === val} onChange={() => updateField('previous_training', val)} className="sr-only" />
              <span>{val ? 'Yes' : 'No'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Emergency Contact Name <span className="text-red-400">*</span></label>
        <input
          type="text"
          value={formData.emergency_contact_name}
          onChange={e => updateField('emergency_contact_name', e.target.value)}
          placeholder="Full name"
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border ${errors.emergency_contact_name ? 'border-red-500' : 'border-[var(--border)]'}`}
        />
        {errors.emergency_contact_name && <p className="text-red-400 text-sm">{errors.emergency_contact_name}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Emergency Contact Phone <span className="text-red-400">*</span></label>
        <input
          type="tel"
          value={formData.emergency_contact_phone}
          onChange={e => updateField('emergency_contact_phone', e.target.value)}
          placeholder="(555) 555-5555"
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border ${errors.emergency_contact_phone ? 'border-red-500' : 'border-[var(--border)]'}`}
        />
        {errors.emergency_contact_phone && <p className="text-red-400 text-sm">{errors.emergency_contact_phone}</p>}
      </div>
    </div>
  );

  // Step 1: Admin (Section B)
  const renderStep1Admin = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <h3 className="font-semibold text-amber-400 mb-2">📋 Section B: Administrative (HR/Admin completes)</h3>
      </div>

      {/* Employment Paperwork */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Employment Paperwork Completed</legend>
        {[
          { key: 'tax_forms' as const, label: 'Tax forms (T4)' },
          { key: 'wsib_confirmed' as const, label: 'WSIB coverage confirmed' },
          { key: 'emergency_contact_form' as const, label: 'Emergency contact form' },
          { key: 'banking' as const, label: 'Banking information (direct deposit)' },
          { key: 'criminal_check' as const, label: 'Criminal record check (if required)' },
        ].map(item => (
          <label key={item.key} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.paperwork[item.key] ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'}`}>
            <input type="checkbox" checked={formData.paperwork[item.key] || false} onChange={e => updatePaperwork(item.key, e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>

      {/* PPE Issued */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Personal Protective Equipment Issued <span className="text-red-400">*</span></legend>
        {errors.ppe && <p className="text-red-400 text-sm">{errors.ppe}</p>}
        
        {formData.ppe_issued.map((ppe, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">{ppe.item}</span>
              <button type="button" onClick={() => removePPE(i)} className="text-red-400 text-sm hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Size (if applicable)" value={ppe.size || ''} onChange={e => updatePPE(i, { size: e.target.value })} className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
              <input type="text" placeholder="Serial # (if applicable)" value={ppe.serial_number || ''} onChange={e => updatePPE(i, { serial_number: e.target.value })} className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
            </div>
          </div>
        ))}
        
        <div className="grid grid-cols-2 gap-2">
          {PPE_OPTIONS.filter(p => !formData.ppe_issued.find(issued => issued.item === p.label)).map(ppe => (
            <button key={ppe.value} type="button" onClick={() => addPPE(ppe.label)} className="p-3 rounded-xl border-2 border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
              + {ppe.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Policies Reviewed */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Company Policies Reviewed</legend>
        {POLICIES_OPTIONS.map(policy => (
          <label key={policy} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.policies_reviewed.includes(policy) ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card)]'}`}>
            <input type="checkbox" checked={formData.policies_reviewed.includes(policy)} onChange={() => togglePolicy(policy, 'policies_reviewed')} className="w-5 h-5 rounded accent-emerald-500" />
            <span className="text-sm">{policy}</span>
          </label>
        ))}
      </fieldset>

      {/* Signatures */}
      <SignaturePad
        label="Worker Signature (acknowledging receipt)"
        value={formData.worker_receipt_signature}
        onSignatureChange={sig => updateField('worker_receipt_signature', sig?.data || '')}
        required
      />

      <SignaturePad
        label="HR/Admin Signature"
        value={formData.admin_signature}
        onSignatureChange={sig => {
          updateField('admin_signature', sig?.data || '');
          if (sig) updateField('admin_date', getCurrentDate());
        }}
        required
      />
    </div>
  );

  // Step 2: Rights & Safety Policies (Section C1-C2)
  const renderStep2Rights = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <h3 className="font-semibold text-red-400 mb-2">⚠️ Section C1: Worker Rights & Responsibilities (Ontario OHSA)</h3>
        <p className="text-sm text-[var(--muted)]">CRITICAL: All items must be explained and acknowledged</p>
      </div>

      {/* Worker Rights */}
      <div className="space-y-4">
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.worker_rights.right_to_know ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.worker_rights.right_to_know} onChange={e => updateRights('right_to_know', e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-emerald-500" />
          <div>
            <span className="font-medium">Right to Know</span>
            <p className="text-sm text-[var(--muted)] mt-1">Worker entitled to know about hazards in the workplace</p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.worker_rights.right_to_participate ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.worker_rights.right_to_participate} onChange={e => updateRights('right_to_participate', e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-emerald-500" />
          <div>
            <span className="font-medium">Right to Participate</span>
            <p className="text-sm text-[var(--muted)] mt-1">Worker can join H&S committee, raise concerns</p>
          </div>
        </label>

        <div className={`p-4 rounded-xl border-2 ${formData.worker_rights.right_to_refuse ? 'border-red-500 bg-red-500/10' : 'border-red-500/50 bg-red-500/5'}`}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={formData.worker_rights.right_to_refuse} onChange={e => updateRights('right_to_refuse', e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-red-500" />
            <div className="flex-1">
              <span className="font-medium text-red-400">🚨 Right to Refuse Unsafe Work - CRITICAL</span>
              <p className="text-sm text-[var(--muted)] mt-1">OHSA Section 43 - How to refuse, protection from reprisal</p>
            </div>
          </label>
          {errors.right_to_refuse && <p className="text-red-400 text-sm mt-2">{errors.right_to_refuse}</p>}
          
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium">Quiz: "If you feel work is unsafe, what do you do?" <span className="text-red-400">*</span></label>
            <textarea
              value={formData.right_to_refuse_quiz_answer}
              onChange={e => updateField('right_to_refuse_quiz_answer', e.target.value)}
              placeholder="Worker's answer..."
              rows={3}
              className={`w-full p-3 rounded-xl bg-[var(--card)] border ${errors.right_to_refuse_quiz ? 'border-red-500' : 'border-[var(--border)]'} text-sm resize-none`}
            />
            {errors.right_to_refuse_quiz && <p className="text-red-400 text-sm">{errors.right_to_refuse_quiz}</p>}
          </div>
        </div>

        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.worker_rights.responsibilities ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.worker_rights.responsibilities} onChange={e => updateRights('responsibilities', e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-emerald-500" />
          <div>
            <span className="font-medium">Worker Responsibilities</span>
            <p className="text-sm text-[var(--muted)] mt-1">Use safety equipment, report hazards, follow procedures</p>
          </div>
        </label>
      </div>

      <SignaturePad
        label="Worker Signature (acknowledging understanding)"
        value={formData.worker_rights_signature}
        onSignatureChange={sig => updateField('worker_rights_signature', sig?.data || '')}
        required
      />

      {/* Section C2: Company Safety Policies */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mt-8">
        <h3 className="font-semibold text-blue-400 mb-2">📋 Section C2: Company Safety Policies</h3>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Policies Reviewed</legend>
        {SAFETY_POLICIES_OPTIONS.map(policy => (
          <label key={policy} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.safety_policies_reviewed.includes(policy) ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData.safety_policies_reviewed.includes(policy)} onChange={() => togglePolicy(policy, 'safety_policies_reviewed')} className="w-5 h-5 rounded accent-emerald-500" />
            <span className="text-sm">{policy}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );

  // Step 3: Site Tour (Section C3-C4)
  const renderStep3SiteTour = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <h3 className="font-semibold text-emerald-400 mb-2">🏗️ Section C3: Site-Specific Hazards (Supervisor completes at jobsite)</h3>
      </div>

      {/* Site Tour */}
      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.site_tour_completed ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
        <input type="checkbox" checked={formData.site_tour_completed} onChange={e => {
          updateField('site_tour_completed', e.target.checked);
          if (e.target.checked) {
            updateField('site_tour_date', getCurrentDate());
            updateField('site_tour_time', getCurrentTime());
          }
        }} className="w-5 h-5 rounded accent-emerald-500" />
        <div>
          <span className="font-medium">Site Tour Completed <span className="text-red-400">*</span></span>
          {formData.site_tour_completed && <p className="text-xs text-[var(--muted)]">Completed: {formData.site_tour_date} at {formData.site_tour_time}</p>}
        </div>
      </label>
      {errors.site_tour && <p className="text-red-400 text-sm">{errors.site_tour}</p>}

      {/* Hazards */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Hazards Identified on Site <span className="text-red-400">*</span></legend>
        {errors.hazards && <p className="text-red-400 text-sm">{errors.hazards}</p>}
        
        <div className="grid grid-cols-2 gap-2">
          {SITE_HAZARDS_OPTIONS.map(hazard => {
            const isSelected = formData.site_hazards.some(h => h.hazard === hazard.value);
            return (
              <label key={hazard.value} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)]'}`}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleHazard(hazard.value)} className="w-4 h-4 rounded accent-amber-500" />
                <span>{hazard.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Hazard Controls */}
      {formData.site_hazards.map(hazard => {
        const label = SITE_HAZARDS_OPTIONS.find(h => h.value === hazard.hazard)?.label || hazard.hazard;
        return (
          <div key={hazard.hazard} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <p className="font-medium text-amber-400">⚠️ {label}</p>
            <div className="space-y-2">
              <label className="block text-sm">Control Measures:</label>
              <textarea value={hazard.controls} onChange={e => updateHazard(hazard.hazard, { controls: e.target.value })} placeholder="Describe controls..." rows={2} className="w-full p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm resize-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm">PPE Required:</label>
              <div className="flex flex-wrap gap-2">
                {PPE_OPTIONS.map(ppe => (
                  <label key={ppe.value} className={`px-3 py-1 rounded-full text-xs cursor-pointer ${hazard.ppe_required.includes(ppe.label) ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] border border-[var(--border)]'}`}>
                    <input type="checkbox" checked={hazard.ppe_required.includes(ppe.label)} onChange={e => {
                      const newPPE = e.target.checked ? [...hazard.ppe_required, ppe.label] : hazard.ppe_required.filter(p => p !== ppe.label);
                      updateHazard(hazard.hazard, { ppe_required: newPPE });
                    }} className="sr-only" />
                    {ppe.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Site Rules */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Site Rules Explained</legend>
        {SITE_RULES_OPTIONS.map(rule => (
          <label key={rule} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.site_rules_explained.includes(rule) ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData.site_rules_explained.includes(rule)} onChange={() => togglePolicy(rule, 'site_rules_explained')} className="w-5 h-5 rounded accent-emerald-500" />
            <span className="text-sm">{rule}</span>
          </label>
        ))}
      </fieldset>

      {/* Site Photos */}
      <PhotoCapture
        label="Site Photos (showing key areas)"
        photos={formData.site_photos}
        onPhotosChange={photos => updateField('site_photos', photos)}
        maxPhotos={10}
      />

      {/* Section C4: Emergency Procedures */}
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mt-6">
        <h3 className="font-semibold text-red-400 mb-2">🚨 Section C4: Emergency Procedures</h3>
      </div>

      <div className="space-y-3">
        {[
          { key: 'emergency_assembly_shown' as const, label: 'Emergency assembly point shown' },
          { key: 'emergency_phones_posted' as const, label: 'Emergency phone numbers posted' },
          { key: 'fire_extinguisher_shown' as const, label: 'Fire extinguisher locations' },
          { key: 'first_aid_shown' as const, label: 'First aid kit location' },
          { key: 'evacuation_explained' as const, label: 'Emergency evacuation procedure explained' },
          { key: 'severe_weather_explained' as const, label: 'Severe weather procedures' },
          { key: 'emergency_contacts_provided' as const, label: 'Emergency contact list provided' },
        ].map(item => (
          <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData[item.key] ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData[item.key]} onChange={e => updateField(item.key, e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Nearest Hospital/Medical Facility</label>
        <input type="text" value={formData.nearest_hospital} onChange={e => updateField('nearest_hospital', e.target.value)} placeholder="Name and address" className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]" />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Quiz: "Where do you go if alarm sounds?"</label>
        <input type="text" value={formData.emergency_quiz_answer} onChange={e => updateField('emergency_quiz_answer', e.target.value)} placeholder="Worker's answer" className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]" />
      </div>
    </div>
  );

  // Step 4: Introductions (Section C5)
  const renderStep4Introductions = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">👥 Section C5: Key Personnel Introductions</h3>
      </div>

      {errors.key_personnel && <p className="text-red-400 text-sm">{errors.key_personnel}</p>}

      {formData.key_personnel.map((person, i) => (
        <div key={i} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">{person.role}</span>
          </div>
          <input type="text" value={person.name} onChange={e => updateKeyPersonnel(i, { name: e.target.value })} placeholder="Name" className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
          <SignaturePad
            label={`${person.role} Signature`}
            value={person.signature}
            onSignatureChange={sig => updateKeyPersonnel(i, { signature: sig?.data || '', date: sig ? getCurrentDate() : '' })}
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-2">
        {KEY_PERSONNEL_ROLES.filter(role => !formData.key_personnel.find(p => p.role === role)).map(role => (
          <button key={role} type="button" onClick={() => addKeyPersonnel(role)} className="p-3 rounded-xl border-2 border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
            + {role}
          </button>
        ))}
      </div>

      {/* Buddy Assignment */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
        <h4 className="font-medium text-emerald-400">👷 Buddy Assignment (First Week)</h4>
        
        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.buddy_assigned ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.buddy_assigned} onChange={e => updateField('buddy_assigned', e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
          <span>Buddy assigned for first week?</span>
        </label>

        {formData.buddy_assigned && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Buddy Name</label>
            <select value={formData.buddy_id || ''} onChange={e => {
              const worker = workers.find(w => w.id === e.target.value);
              updateField('buddy_id', e.target.value);
              updateField('buddy_name', worker?.name || '');
            }} className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] appearance-none">
              <option value="">Select experienced worker...</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.key_personnel.length >= 4 ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
        <input type="checkbox" checked disabled className="w-5 h-5 rounded" />
        <span className="text-sm">Introduced to co-workers (general)</span>
      </label>
    </div>
  );

  // Step 5: Equipment Training (Section C6)
  const renderStep5Equipment = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <h3 className="font-semibold text-amber-400 mb-2">🔧 Section C6: Equipment & Tools (Day 2)</h3>
      </div>

      <div className="space-y-3">
        {[
          { key: 'equipment_signout_explained' as const, label: 'Company equipment sign-out procedures' },
          { key: 'personal_tool_policy' as const, label: 'Personal tool policy' },
          { key: 'tool_inspection_explained' as const, label: 'Tool inspection requirements' },
          { key: 'mobile_equipment_explained' as const, label: 'Mobile equipment procedures' },
        ].map(item => (
          <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData[item.key] ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData[item.key]} onChange={e => updateField(item.key, e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>

      {/* Lock-out/Tag-out */}
      <div className={`p-4 rounded-xl border-2 ${formData.lockout_tagout_explained ? 'border-red-500 bg-red-500/10' : 'border-red-500/50'}`}>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input type="checkbox" checked={formData.lockout_tagout_explained} onChange={e => updateField('lockout_tagout_explained', e.target.checked)} className="w-5 h-5 rounded accent-red-500" />
          <div>
            <span className="font-medium text-red-400">🔒 Lock-out/Tag-out Procedures <span className="text-red-400">*</span></span>
            <p className="text-xs text-[var(--muted)]">When required, how to do it</p>
          </div>
        </label>
        {errors.lockout && <p className="text-red-400 text-sm">{errors.lockout}</p>}

        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.lockout_demo_passed ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.lockout_demo_passed} onChange={e => updateField('lockout_demo_passed', e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
          <span className="text-sm">Practice demonstration completed - Worker can perform lock-out</span>
        </label>

        {formData.lockout_demo_passed && (
          <div className="mt-4">
            <SignaturePad
              label="Evaluator Signature (confirming demonstration)"
              value={formData.lockout_evaluator_signature}
              onSignatureChange={sig => updateField('lockout_evaluator_signature', sig?.data || '')}
              required
            />
          </div>
        )}
      </div>
    </div>
  );

  // Step 6: Training (Section D1-D2)
  const renderStep6Training = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">📚 Section D1: Mandatory Training (Day 2-3)</h3>
      </div>

      {formData.mandatory_training.map(training => (
        <div key={training.course} className={`p-4 rounded-xl border-2 space-y-3 ${training.completed ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={training.completed} onChange={e => updateMandatoryTraining(training.course, { completed: e.target.checked })} className="w-5 h-5 rounded accent-emerald-500" />
            <span className="font-medium">{training.course}</span>
          </label>
          {training.completed && (
            <div className="grid grid-cols-2 gap-3 pl-8">
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted)]">Certificate URL</label>
                <input type="url" value={training.certificate_url || ''} onChange={e => updateMandatoryTraining(training.course, { certificate_url: e.target.value })} placeholder="Link or upload" className="w-full h-9 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted)]">Expiry Date</label>
                <input type="date" value={training.expiry_date || ''} onChange={e => updateMandatoryTraining(training.course, { expiry_date: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs" />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Training Required */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <h3 className="font-semibold text-amber-400 mb-2">⚠️ Section D2: Training Still Required</h3>
        <p className="text-sm text-[var(--muted)]">List any outstanding training needed with target dates</p>
      </div>

      {formData.training_required.map((tr, i) => (
        <div key={i} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={tr.course} onChange={e => {
              const newList = [...formData.training_required];
              newList[i] = { ...tr, course: e.target.value };
              updateField('training_required', newList);
            }} placeholder="Course name" className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
            <input type="date" value={tr.target_date} onChange={e => {
              const newList = [...formData.training_required];
              newList[i] = { ...tr, target_date: e.target.value };
              updateField('training_required', newList);
            }} className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
            <input type="text" value={tr.provider} onChange={e => {
              const newList = [...formData.training_required];
              newList[i] = { ...tr, provider: e.target.value };
              updateField('training_required', newList);
            }} placeholder="Provider" className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
          </div>
        </div>
      ))}

      <button type="button" onClick={() => updateField('training_required', [...formData.training_required, { course: '', target_date: '', provider: '' }])} className="w-full p-3 rounded-xl border-2 border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:border-[var(--primary)]">
        + Add Training Requirement
      </button>
    </div>
  );

  // Step 7: SWP Review (Section D3)
  const renderStep7SWP = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <h3 className="font-semibold text-emerald-400 mb-2">📋 Section D3: Safe Work Procedures Reviewed</h3>
        <p className="text-sm text-[var(--muted)]">Each SWP must be reviewed and initialed by the worker</p>
      </div>

      {formData.swp_reviewed.map((swp, i) => (
        <div key={i} className={`p-4 rounded-xl border-2 ${swp.reviewed ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">{swp.swp_name}</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={swp.reviewed} onChange={e => updateSWP(i, { reviewed: e.target.checked, date: e.target.checked ? getCurrentDate() : '' })} className="w-5 h-5 rounded accent-emerald-500" />
              <span className="text-sm">Reviewed</span>
            </label>
          </div>
          {swp.reviewed && (
            <div className="flex gap-3">
              <input type="text" value={swp.worker_initials} onChange={e => updateSWP(i, { worker_initials: e.target.value })} placeholder="Worker Initials" maxLength={3} className="w-24 h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-center" />
              <input type="date" value={swp.date} readOnly className="flex-1 h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm opacity-70" />
            </div>
          )}
        </div>
      ))}

      <div className="space-y-2">
        <label className="block text-sm font-medium">Add SWP</label>
        <select onChange={e => { if (e.target.value) { addSWP(e.target.value); e.target.value = ''; } }} className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] appearance-none">
          <option value="">Select SWP to add...</option>
          {swpList.filter(s => !formData.swp_reviewed.find(r => r.swp_name === s.name)).map(swp => (
            <option key={swp.id} value={swp.name}>{swp.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // Step 8: Competency Demonstrations (Section D3 continued)
  const renderStep8Competency = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <h3 className="font-semibold text-amber-400 mb-2">✅ Section D3: Competency Demonstrations (Day 3)</h3>
        <p className="text-sm text-[var(--muted)]">Worker must demonstrate competency in each task they will perform</p>
      </div>

      {formData.competency_demos.map((demo, i) => (
        <div key={i} className={`p-4 rounded-xl border-2 space-y-3 ${demo.result === 'pass' ? 'border-emerald-500 bg-emerald-500/10' : demo.result === 'fail' ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)]'}`}>
          <input type="text" value={demo.task} onChange={e => updateCompetencyDemo(i, { task: e.target.value })} placeholder="Task (e.g., Set up extension ladder)" className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
          
          <div className="flex gap-2">
            {['pass', 'fail', 'needs_practice'].map(result => (
              <button key={result} type="button" onClick={() => updateCompetencyDemo(i, { result: result as 'pass' | 'fail' | 'needs_practice' })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${demo.result === result ? result === 'pass' ? 'bg-emerald-500 text-white' : result === 'fail' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black' : 'bg-[var(--background)] border border-[var(--border)]'}`}>
                {result === 'pass' ? '✅ Pass' : result === 'fail' ? '❌ Fail' : '⏳ Needs Practice'}
              </button>
            ))}
          </div>

          <select value={demo.evaluator_id} onChange={e => updateCompetencyDemo(i, { evaluator_id: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm appearance-none">
            <option value="">Select evaluator...</option>
            {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <SignaturePad
            label="Evaluator Signature"
            value={demo.evaluator_signature}
            onSignatureChange={sig => updateCompetencyDemo(i, { evaluator_signature: sig?.data || '' })}
          />

          <textarea value={demo.notes || ''} onChange={e => updateCompetencyDemo(i, { notes: e.target.value })} placeholder="Notes (optional)" rows={2} className="w-full p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm resize-none" />
        </div>
      ))}

      <button type="button" onClick={addCompetencyDemo} className="w-full p-4 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]">
        + Add Competency Demonstration
      </button>
    </div>
  );

  // Step 9: Quiz (optional)
  const renderStep9Quiz = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">📝 Assessment Quiz (Recommended for audit)</h3>
        <p className="text-sm text-[var(--muted)]">10 questions, pass mark: 80% (8/10)</p>
      </div>

      {!formData.quiz_taken ? (
        <button type="button" onClick={initializeQuiz} className="w-full p-4 rounded-xl bg-[var(--primary)] text-white font-semibold">
          Start Quiz
        </button>
      ) : formData.quiz_score !== undefined ? (
        <div className={`p-6 rounded-xl text-center ${formData.quiz_passed ? 'bg-emerald-500/10 border-2 border-emerald-500' : 'bg-red-500/10 border-2 border-red-500'}`}>
          <p className="text-4xl font-bold mb-2">{formData.quiz_score}%</p>
          <p className={`text-lg font-medium ${formData.quiz_passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {formData.quiz_passed ? '✅ PASSED' : '❌ FAILED - Additional training required'}
          </p>
          <p className="text-sm text-[var(--muted)] mt-2">
            {formData.quiz_questions.filter(q => q.correct).length}/{formData.quiz_questions.length} correct answers
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.quiz_questions.map((q, i) => (
            <div key={q.id} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <p className="font-medium mb-2">Q{i + 1}: {q.question}</p>
              <textarea value={q.answer} onChange={e => updateQuizAnswer(q.id, e.target.value)} placeholder="Your answer..." rows={2} className="w-full p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm resize-none" />
            </div>
          ))}
          <button type="button" onClick={submitQuiz} className="w-full p-4 rounded-xl bg-[var(--primary)] text-white font-semibold">
            Submit Quiz
          </button>
        </div>
      )}
    </div>
  );

  // Step 10: Final Sign-off (Section E)
  const renderStep10Signoff = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <h3 className="font-semibold text-emerald-400 mb-2">✅ Section E: Final Sign-off (End of orientation)</h3>
      </div>

      {/* Completion Check */}
      <div className={`p-4 rounded-xl ${completionPercent >= 100 ? 'bg-emerald-500/10 border-2 border-emerald-500' : 'bg-amber-500/10 border-2 border-amber-500'}`}>
        <div className="flex justify-between items-center">
          <span className="font-medium">Overall Completion</span>
          <span className={`text-2xl font-bold ${completionPercent >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{completionPercent}%</span>
        </div>
        {completionPercent < 100 && <p className="text-sm text-amber-400 mt-2">⚠️ Must be 100% complete before final sign-off</p>}
      </div>

      {/* Questions */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Pre-Sign-off Check</legend>
        
        <div className={`p-3 rounded-xl border-2 ${formData.worker_questions_answered ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formData.worker_questions_answered} onChange={e => updateField('worker_questions_answered', e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
            <span>Worker questions answered?</span>
          </label>
          {!formData.worker_questions_answered && (
            <textarea value={formData.outstanding_questions || ''} onChange={e => updateField('outstanding_questions', e.target.value)} placeholder="List outstanding questions..." rows={2} className="w-full p-3 mt-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm resize-none" />
          )}
        </div>

        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.worker_understands_requirements ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.worker_understands_requirements} onChange={e => updateField('worker_understands_requirements', e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
          <span>Worker understands safety requirements?</span>
        </label>

        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.worker_comfortable ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.worker_comfortable} onChange={e => updateField('worker_comfortable', e.target.checked)} className="w-5 h-5 rounded accent-emerald-500" />
          <span>Worker comfortable working safely?</span>
        </label>

        <div className={`p-3 rounded-xl border-2 ${formData.buddy_extension_needed ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)]'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formData.buddy_extension_needed} onChange={e => updateField('buddy_extension_needed', e.target.checked)} className="w-5 h-5 rounded accent-amber-500" />
            <span>Buddy period extension needed?</span>
          </label>
          {formData.buddy_extension_needed && (
            <div className="mt-3">
              <label className="text-xs text-[var(--muted)]">How many additional days?</label>
              <input type="number" value={formData.buddy_extension_days || ''} onChange={e => updateField('buddy_extension_days', parseInt(e.target.value) || 0)} min={1} max={14} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
            </div>
          )}
        </div>
      </fieldset>

      {/* Worker Declaration */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <h4 className="font-medium mb-3">Worker Declaration</h4>
        <ul className="text-sm text-[var(--muted)] space-y-1 mb-4">
          <li>• I have completed orientation</li>
          <li>• I understand my rights and responsibilities</li>
          <li>• I know how to report hazards and refuse unsafe work</li>
          <li>• I have received and understand required training</li>
          <li>• I will follow company safety procedures</li>
        </ul>
        <SignaturePad
          label="Worker Signature"
          value={formData.worker_declaration_signature}
          onSignatureChange={sig => {
            updateField('worker_declaration_signature', sig?.data || '');
            if (sig) updateField('worker_declaration_date', getCurrentDate());
          }}
          required
          error={errors.worker_signature}
        />
      </div>

      {/* Supervisor Declaration */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <h4 className="font-medium mb-3">Supervisor Declaration</h4>
        <ul className="text-sm text-[var(--muted)] space-y-1 mb-4">
          <li>• Worker has completed all orientation requirements</li>
          <li>• Worker demonstrated competency in required tasks</li>
        </ul>
        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer mb-4 ${formData.supervisor_ready_independent ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/10'}`}>
          <input type="checkbox" checked={formData.supervisor_ready_independent} onChange={e => updateField('supervisor_ready_independent', e.target.checked)} className="w-5 h-5 rounded" />
          <span className="text-sm">{formData.supervisor_ready_independent ? '✅ Worker is ready to work independently' : '⚠️ Requires additional supervision'}</span>
        </label>
        <textarea value={formData.supervisor_notes || ''} onChange={e => updateField('supervisor_notes', e.target.value)} placeholder="Supervisor notes (optional)" rows={2} className="w-full p-3 mb-4 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm resize-none" />
        <SignaturePad
          label="Supervisor Signature"
          value={formData.supervisor_signature}
          onSignatureChange={sig => {
            updateField('supervisor_signature', sig?.data || '');
            if (sig) updateField('supervisor_date', getCurrentDate());
          }}
          required
          error={errors.supervisor_signature}
        />
      </div>

      {/* Safety Manager Review */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h4 className="font-medium text-blue-400 mb-3">Safety Manager Review</h4>
        <ul className="text-sm text-[var(--muted)] space-y-1 mb-4">
          <li>• Orientation meets COR requirements</li>
          <li>• Training records verified</li>
        </ul>
        <SignaturePad
          label="Safety Manager Signature"
          value={formData.safety_manager_signature}
          onSignatureChange={sig => {
            updateField('safety_manager_signature', sig?.data || '');
            if (sig) updateField('safety_manager_date', getCurrentDate());
          }}
          required
          error={errors.safety_manager_signature}
        />
      </div>

      {/* COR Audit Info */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">
          📋 This orientation will be tagged as COR audit evidence for <strong className="text-[var(--foreground)]">{formData.audit_element}</strong>
        </p>
        <p className="text-xs text-[var(--muted)] mt-1">
          COR Requirement: Orientation for EVERY worker (100% compliance) with all 3 signatures required
        </p>
      </div>
    </div>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0WorkerInfo();
      case 1: return renderStep1Admin();
      case 2: return renderStep2Rights();
      case 3: return renderStep3SiteTour();
      case 4: return renderStep4Introductions();
      case 5: return renderStep5Equipment();
      case 6: return renderStep6Training();
      case 7: return renderStep7SWP();
      case 8: return renderStep8Competency();
      case 9: return renderStep9Quiz();
      case 10: return renderStep10Signoff();
      default: return null;
    }
  };

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 left-4 right-4 z-50 p-4 rounded-xl shadow-lg animate-slide-down ${
          toast.type === 'success' ? 'bg-emerald-500 text-white'
          : toast.type === 'error' ? 'bg-red-500 text-white'
          : toast.type === 'warning' ? 'bg-amber-500 text-black'
          : 'bg-blue-500 text-white'
        }`}>
          <p className="font-medium text-center">{toast.message}</p>
        </div>
      )}

      {/* Draft Banner */}
      {showDraftBanner && draftInfo && (
        <div className="sticky top-0 z-40 bg-amber-500 text-black px-4 py-3">
          <p className="text-sm font-medium mb-2">📝 Resume draft from {formatRelativeTime(draftInfo.updatedAt)}?</p>
          <div className="flex gap-3">
            <button type="button" onClick={handleRestoreDraft} className="flex-1 bg-black/20 py-2 px-4 rounded-lg font-semibold">Yes, restore</button>
            <button type="button" onClick={handleDiscardDraft} className="flex-1 bg-white/20 py-2 px-4 rounded-lg font-semibold">No, start fresh</button>
          </div>
        </div>
      )}

      {/* Progress Header */}
      {renderProgressHeader()}

      {/* Form Content */}
      <div ref={formRef} className="px-4 py-6 overflow-y-auto">
        {renderCurrentStep()}
      </div>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStep > 0 && (
            <button type="button" onClick={handleBack} className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold">
              ← Back
            </button>
          )}
          
          {currentStep === 0 && (
            <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft} className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold disabled:opacity-50">
              {isSavingDraft ? 'Saving...' : '💾 Save Draft'}
            </button>
          )}

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button type="button" onClick={handleNext} className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white font-semibold">
              Continue →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isSubmitting || completionPercent < 100} className="flex-1 h-14 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50">
              {isSubmitting ? '⟳ Submitting...' : '✅ Complete Orientation'}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-[var(--muted)]">
          <span>{isOnline ? '🟢 Online' : '🔴 Offline - Auto-saves locally'}</span>
          {lastAutoSave && <span>Last saved {formatRelativeTime(lastAutoSave)}</span>}
        </div>
      </div>
    </div>
  );
}

export type { OrientationFormProps };
