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
import SignaturePad from '@/components/ui/signature-pad';
import {
  type PreTaskHazardAssessment,
  type CrewMember,
  type ChemicalItem,
  type RiskAssessmentItem,
  type ControlMeasures,
  type Likelihood,
  type Consequence,
  type RiskLevel,
  HIGH_RISK_TASKS,
  PHYSICAL_HAZARDS,
  BIOLOGICAL_HAZARDS,
  ERGONOMIC_HAZARDS,
  EQUIPMENT_HAZARDS,
  PPE_OPTIONS,
  ENGINEERING_CONTROLS,
  ADMINISTRATIVE_CONTROLS,
  PERMIT_TYPES,
  WEATHER_OPTIONS,
  REQUIRED_CERTS,
  WIZARD_STEPS,
  LIKELIHOOD_LABELS,
  CONSEQUENCE_LABELS,
  calculateRiskRating,
  getRiskLevel,
  RISK_COLORS,
} from './pre-task-hazard-assessment-types';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORM_TYPE = 'pre_task_hazard_assessment';
const AUTO_SAVE_INTERVAL = 60000; // 1 minute

// =============================================================================
// PROPS & TYPES
// =============================================================================

interface PTHAFormProps {
  companyId: string;
  userId: string;
  userName: string;
  jobsites: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string; position?: string; certifications?: string[] }>;
  supervisors: Array<{ id: string; name: string }>;
  onSubmitSuccess?: (formId: string, pthaNumber: string) => void;
  onDraftSaved?: (formId: string) => void;
}

interface FormErrors { [key: string]: string | undefined; }
type ToastType = 'success' | 'info' | 'warning' | 'error';

// =============================================================================
// HELPERS
// =============================================================================

const getCurrentDate = () => new Date().toISOString().split('T')[0];
const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const generatePTHANumber = () => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `PTHA-${year}-${seq}`;
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

const getInitialFormData = (props: PTHAFormProps): PreTaskHazardAssessment => ({
  ptha_number: generatePTHANumber(),
  company_id: props.companyId,
  task_type: '',
  task_description: '',
  jobsite_id: '',
  specific_location: '',
  date: getCurrentDate(),
  start_time: getCurrentTime(),
  end_time: '',
  task_lead_id: props.userId,
  task_lead_name: props.userName,
  task_lead_signature: '',
  crew_count: 1,
  crew_members: [],
  all_crew_briefed: false,
  physical_hazards: [],
  chemical_hazards: [],
  dust_silica_exposure: false,
  fumes_gases: false,
  asbestos_potential: false,
  biological_hazards: [],
  ergonomic_hazards: [],
  electrical_hazards: {
    overhead_lines: false,
    underground_utilities: false,
    equipment_lockout: false,
  },
  weather_conditions: {
    current: 'Clear/Sunny',
    forecast: 'Clear/Sunny',
    wind_speed_kmh: 0,
    temperature_c: 20,
    precipitation_expected: false,
    lightning_risk: false,
    ground_conditions: 'dry',
    visibility: 'excellent',
  },
  equipment_hazards: [],
  spotter_required: false,
  traffic_control_plan: false,
  risk_assessments: [],
  emergency_response: {
    emergency_numbers_displayed: false,
    first_aid_location: '',
    first_aid_attendant: '',
    nearest_hospital: '',
    hospital_distance_km: 0,
    evacuation_reviewed: false,
    communication_method: 'phone',
    fire_extinguisher: false,
    rescue_equipment: false,
    spill_kit: false,
    eyewash_station: false,
  },
  stop_work_understood: false,
  permits: [],
  meeting_held: false,
  meeting_datetime: '',
  all_attended: false,
  hazards_explained: false,
  questions_answered: false,
  crew_comfortable: false,
  monitoring_frequency: 'hourly',
  designated_monitor: '',
  supervisor_signature: '',
  supervisor_date: '',
  highest_risk_level: 'low',
  can_proceed: false,
  approval_required_from: 'supervisor',
  form_status: 'draft',
  audit_element: 'Element 3',
  status: 'draft',
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PreTaskHazardAssessmentForm(props: PTHAFormProps) {
  const { companyId, userId, jobsites, workers, supervisors, onSubmitSuccess, onDraftSaved } = props;
  const { isOnline } = useNetworkStatus();

  const [formData, setFormData] = useState<PreTaskHazardAssessment>(() => getInitialFormData(props));
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ formId: string; updatedAt: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [activeCrewSignature, setActiveCrewSignature] = useState<string | null>(null);

  const autoSaveRef = useRef<ReturnType<typeof createAutoSave<PreTaskHazardAssessment>> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const currentStepConfig = WIZARD_STEPS[currentStep];

  // Calculate highest risk level
  const highestRiskLevel = useMemo((): RiskLevel => {
    if (formData.risk_assessments.length === 0) return 'low';
    const levels: RiskLevel[] = formData.risk_assessments.map(r => r.risk_level_after);
    if (levels.includes('extreme')) return 'extreme';
    if (levels.includes('high')) return 'high';
    if (levels.includes('medium')) return 'medium';
    return 'low';
  }, [formData.risk_assessments]);

  // Check if can proceed
  const canProceed = useMemo(() => {
    const hasExtreme = formData.risk_assessments.some(r => r.risk_level_after === 'extreme' && !r.acceptable);
    const allCrewCertsValid = formData.crew_members.every(c => c.certs_valid);
    const requiredPermitsAttached = formData.permits.every(p => p.attached);
    const crewComfortable = formData.crew_comfortable;
    
    return !hasExtreme && allCrewCertsValid && requiredPermitsAttached && crewComfortable !== false;
  }, [formData]);

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
      const draft = await loadDraft<PreTaskHazardAssessment>(FORM_TYPE, companyId);
      if (draft) {
        setDraftInfo({ formId: draft.formId, updatedAt: draft.updatedAt });
        setShowDraftBanner(true);
      }
    };
    checkDraft();
  }, [companyId]);

  useEffect(() => {
    autoSaveRef.current = createAutoSave<PreTaskHazardAssessment>(
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
      const draft = await loadDraft<PreTaskHazardAssessment>(FORM_TYPE, companyId);
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

  const updateField = <K extends keyof PreTaskHazardAssessment>(field: K, value: PreTaskHazardAssessment[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const toggleArrayItem = <K extends keyof PreTaskHazardAssessment>(field: K, item: string) => {
    setFormData(prev => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  const addCrewMember = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const requiredCerts = REQUIRED_CERTS[formData.task_type] || [];
    const workerCerts = worker.certifications || [];
    const missingCerts = requiredCerts.filter(c => !workerCerts.includes(c));

    const newMember: CrewMember = {
      worker_id: workerId,
      name: worker.name,
      position: worker.position || '',
      years_experience: 0,
      required_certs: requiredCerts,
      certs_valid: missingCerts.length === 0,
      missing_certs: missingCerts,
      signature: '',
    };

    setFormData(prev => ({
      ...prev,
      crew_members: [...prev.crew_members, newMember],
      crew_count: prev.crew_members.length + 1,
    }));
  };

  const updateCrewMember = (workerId: string, updates: Partial<CrewMember>) => {
    setFormData(prev => ({
      ...prev,
      crew_members: prev.crew_members.map(m =>
        m.worker_id === workerId ? { ...m, ...updates } : m
      ),
    }));
  };

  const removeCrewMember = (workerId: string) => {
    setFormData(prev => ({
      ...prev,
      crew_members: prev.crew_members.filter(m => m.worker_id !== workerId),
      crew_count: Math.max(1, prev.crew_members.length - 1),
    }));
  };

  const addChemical = () => {
    const newChem: ChemicalItem = {
      id: `chem_${Date.now()}`,
      product_name: '',
      sds_reviewed: false,
      hazard_classification: '',
      ppe_required: [],
    };
    setFormData(prev => ({
      ...prev,
      chemical_hazards: [...prev.chemical_hazards, newChem],
    }));
  };

  const updateChemical = (id: string, updates: Partial<ChemicalItem>) => {
    setFormData(prev => ({
      ...prev,
      chemical_hazards: prev.chemical_hazards.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  };

  const removeChemical = (id: string) => {
    setFormData(prev => ({
      ...prev,
      chemical_hazards: prev.chemical_hazards.filter(c => c.id !== id),
    }));
  };

  // Generate risk assessments from identified hazards
  const generateRiskAssessments = () => {
    const hazards: Array<{ id: string; hazard: string; category: string }> = [];

    // Physical hazards
    formData.physical_hazards.forEach(h => {
      const label = PHYSICAL_HAZARDS.find(ph => ph.id === h)?.label || h;
      hazards.push({ id: `phys_${h}`, hazard: label, category: 'Physical' });
    });

    // Chemical hazards
    formData.chemical_hazards.forEach(c => {
      if (c.product_name) {
        hazards.push({ id: `chem_${c.id}`, hazard: `Chemical: ${c.product_name}`, category: 'Chemical' });
      }
    });

    // Other hazards
    formData.biological_hazards.forEach(h => {
      hazards.push({ id: `bio_${h}`, hazard: h, category: 'Biological' });
    });

    formData.ergonomic_hazards.forEach(h => {
      hazards.push({ id: `ergo_${h}`, hazard: h, category: 'Ergonomic' });
    });

    if (formData.electrical_hazards.overhead_lines) {
      hazards.push({ id: 'elec_overhead', hazard: 'Overhead Power Lines', category: 'Electrical' });
    }
    if (formData.electrical_hazards.underground_utilities) {
      hazards.push({ id: 'elec_underground', hazard: 'Underground Utilities', category: 'Electrical' });
    }

    formData.equipment_hazards.forEach(h => {
      hazards.push({ id: `equip_${h}`, hazard: h, category: 'Equipment' });
    });

    // Create risk assessment items
    const newAssessments: RiskAssessmentItem[] = hazards.map(h => ({
      id: h.id,
      hazard: h.hazard,
      hazard_category: h.category,
      likelihood_before: 3 as Likelihood,
      consequence_before: 3 as Consequence,
      risk_rating_before: 9,
      risk_level_before: 'medium' as RiskLevel,
      controls: {
        elimination_possible: false,
        substitution_possible: false,
        engineering: [],
        administrative: [],
        permits_required: [],
        ppe: [],
      },
      likelihood_after: 2 as Likelihood,
      consequence_after: 2 as Consequence,
      risk_rating_after: 4,
      risk_level_after: 'low' as RiskLevel,
      acceptable: true,
    }));

    setFormData(prev => ({ ...prev, risk_assessments: newAssessments }));
  };

  const updateRiskAssessment = (id: string, updates: Partial<RiskAssessmentItem>) => {
    setFormData(prev => ({
      ...prev,
      risk_assessments: prev.risk_assessments.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        
        // Recalculate ratings
        if (updates.likelihood_before !== undefined || updates.consequence_before !== undefined) {
          const lb = updates.likelihood_before ?? r.likelihood_before;
          const cb = updates.consequence_before ?? r.consequence_before;
          updated.risk_rating_before = calculateRiskRating(lb, cb);
          updated.risk_level_before = getRiskLevel(updated.risk_rating_before);
        }
        
        if (updates.likelihood_after !== undefined || updates.consequence_after !== undefined) {
          const la = updates.likelihood_after ?? r.likelihood_after;
          const ca = updates.consequence_after ?? r.consequence_after;
          updated.risk_rating_after = calculateRiskRating(la, ca);
          updated.risk_level_after = getRiskLevel(updated.risk_rating_after);
        }
        
        return updated;
      }),
    }));
  };

  const updateRiskControls = (id: string, controls: Partial<ControlMeasures>) => {
    setFormData(prev => ({
      ...prev,
      risk_assessments: prev.risk_assessments.map(r =>
        r.id === id ? { ...r, controls: { ...r.controls, ...controls } } : r
      ),
    }));
  };

  const togglePermit = (permitType: string) => {
    setFormData(prev => {
      const exists = prev.permits.find(p => p.type === permitType);
      if (exists) {
        return { ...prev, permits: prev.permits.filter(p => p.type !== permitType) };
      }
      return {
        ...prev,
        permits: [...prev.permits, { type: permitType, number: '', attached: false }],
      };
    });
  };

  const updatePermit = (type: string, updates: Partial<{ number: string; attached: boolean }>) => {
    setFormData(prev => ({
      ...prev,
      permits: prev.permits.map(p => p.type === type ? { ...p, ...updates } : p),
    }));
  };

  // ==========================================================================
  // NAVIGATION & VALIDATION
  // ==========================================================================

  const validateStep = (step: number): FormErrors => {
    const newErrors: FormErrors = {};
    switch (step) {
      case 0: // Task Info
        if (!formData.task_type) newErrors.task_type = 'Select task type';
        if (!formData.task_description || formData.task_description.length < 20) {
          newErrors.task_description = 'Provide detailed description (min 20 chars)';
        }
        if (!formData.jobsite_id) newErrors.jobsite = 'Select jobsite';
        break;
      case 1: // Crew
        if (formData.crew_members.length === 0) newErrors.crew = 'Add at least one crew member';
        const invalidCerts = formData.crew_members.filter(c => !c.certs_valid);
        if (invalidCerts.length > 0) {
          newErrors.certs = `${invalidCerts.length} crew member(s) missing required certifications`;
        }
        break;
      case 5: // Risk Assessment
        if (formData.risk_assessments.length === 0) {
          newErrors.risks = 'Generate risk assessments from identified hazards';
        }
        break;
      case 9: // Crew Meeting
        if (!formData.meeting_held) newErrors.meeting = 'Pre-task meeting is required';
        if (!formData.crew_comfortable) newErrors.comfort = 'All crew must confirm comfort to proceed';
        break;
      case 10: // Sign-off
        if (!formData.supervisor_signature) newErrors.supervisor = 'Supervisor signature required';
        if (highestRiskLevel === 'extreme' && !formData.safety_manager_signature) {
          newErrors.safety_manager = 'Safety manager signature required for extreme risk';
        }
        break;
    }
    return newErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      showToast('Please complete required fields', 'error');
      return;
    }

    // Auto-generate risk assessments when moving from hazard ID to risk assessment
    if (currentStep === 4 && formData.risk_assessments.length === 0) {
      generateRiskAssessments();
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
    const result = await saveDraft(FORM_TYPE, formData, { companyId, workerId: userId, formType: FORM_TYPE });
    setIsSavingDraft(false);
    if (result.success && result.formId) {
      setFormData(prev => ({ ...prev, id: result.formId }));
      showToast('📝 Draft saved', 'info');
      onDraftSaved?.(result.formId);
    } else {
      showToast('Failed to save draft', 'error');
    }
  };

  const handleSubmit = async () => {
    const finalErrors = validateStep(10);
    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      showToast('Please complete required fields', 'error');
      return;
    }

    if (!canProceed) {
      showToast('⚠️ Cannot proceed - resolve blocking issues first', 'error');
      return;
    }

    setIsSubmitting(true);
    autoSaveRef.current?.stop();

    const finalData: PreTaskHazardAssessment = {
      ...formData,
      status: 'submitted',
      form_status: 'approved',
      highest_risk_level: highestRiskLevel,
      can_proceed: canProceed,
      supervisor_date: getCurrentDate(),
    };

    const result = await submitForm(FORM_TYPE, finalData, {
      companyId, workerId: userId, formType: FORM_TYPE, priority: highestRiskLevel === 'high' || highestRiskLevel === 'extreme' ? 1 : 2,
    });

    setIsSubmitting(false);

    if (result.success && result.formId) {
      showToast('✅ Pre-Task HA Approved - Work may proceed', 'success');
      onSubmitSuccess?.(result.formId, finalData.ptha_number);
    } else {
      showToast(result.error || 'Submission failed', 'error');
      autoSaveRef.current?.start(formData);
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderProgressHeader = () => (
    <div className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-bold">Pre-Task Hazard Assessment</h1>
          <p className="text-xs text-[var(--muted)]">{formData.ptha_number} • COR Element 3</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${RISK_COLORS[highestRiskLevel]}`}>
          {highestRiskLevel.toUpperCase()}
        </span>
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
            title={step.label}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-[var(--primary)] mt-2">
        Section {currentStepConfig.section}: {currentStepConfig.label}
      </p>
    </div>
  );

  // Step 0: Task Information
  const renderStep0Task = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">📋 Section A: Task Information</h3>
        <p className="text-sm text-[var(--muted)]">Detailed pre-task HA for high-risk activities</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">High-Risk Task Type <span className="text-red-400">*</span></label>
        <select
          value={formData.task_type}
          onChange={e => updateField('task_type', e.target.value)}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border ${errors.task_type ? 'border-red-500' : 'border-[var(--border)]'} appearance-none`}
        >
          <option value="">Select task type...</option>
          {HIGH_RISK_TASKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {errors.task_type && <p className="text-red-400 text-sm">{errors.task_type}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Task Description <span className="text-red-400">*</span></label>
        <textarea
          value={formData.task_description}
          onChange={e => updateField('task_description', e.target.value)}
          placeholder="Describe: What will be done, where, why, and how..."
          rows={4}
          className={`w-full p-4 rounded-xl bg-[var(--card)] border ${errors.task_description ? 'border-red-500' : 'border-[var(--border)]'} resize-none`}
        />
        {errors.task_description && <p className="text-red-400 text-sm">{errors.task_description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Jobsite <span className="text-red-400">*</span></label>
          <select
            value={formData.jobsite_id}
            onChange={e => updateField('jobsite_id', e.target.value)}
            className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border ${errors.jobsite ? 'border-red-500' : 'border-[var(--border)]'} appearance-none`}
          >
            <option value="">Select...</option>
            {jobsites.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Specific Location</label>
          <input
            type="text"
            value={formData.specific_location}
            onChange={e => updateField('specific_location', e.target.value)}
            placeholder="e.g., Level 3, Grid B-4"
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Date</label>
          <input type="date" value={formData.date} onChange={e => updateField('date', e.target.value)} className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Start Time</label>
          <input type="time" value={formData.start_time} onChange={e => updateField('start_time', e.target.value)} className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">End Time</label>
          <input type="time" value={formData.end_time} onChange={e => updateField('end_time', e.target.value)} className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]" />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">Task Lead</p>
        <p className="font-medium">{formData.task_lead_name}</p>
      </div>
    </div>
  );

  // Step 1: Crew
  const renderStep1Crew = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">👷 Section B: Work Crew</h3>
      </div>

      {errors.crew && <p className="text-red-400 text-sm">{errors.crew}</p>}
      {errors.certs && <p className="text-red-400 text-sm">⚠️ {errors.certs}</p>}

      <div className="space-y-2">
        <label className="block text-sm font-medium">Add Crew Members</label>
        <select
          onChange={e => { if (e.target.value) { addCrewMember(e.target.value); e.target.value = ''; } }}
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] appearance-none"
        >
          <option value="">Select worker to add...</option>
          {workers.filter(w => !formData.crew_members.find(c => c.worker_id === w.id)).map(w => (
            <option key={w.id} value={w.id}>{w.name} {w.position && `(${w.position})`}</option>
          ))}
        </select>
      </div>

      {formData.crew_members.map(member => (
        <div key={member.worker_id} className={`p-4 rounded-xl border-2 ${member.certs_valid ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500 bg-red-500/10'}`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-sm text-[var(--muted)]">{member.position}</p>
            </div>
            <button type="button" onClick={() => removeCrewMember(member.worker_id)} className="text-red-400 text-sm">Remove</button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-[var(--muted)]">Years on this task</label>
              <input
                type="number"
                value={member.years_experience}
                onChange={e => updateCrewMember(member.worker_id, { years_experience: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              />
            </div>
            <div className={`p-2 rounded-lg ${member.certs_valid ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <p className="text-xs font-medium">{member.certs_valid ? '✅ Certs Valid' : '❌ Missing Certs'}</p>
              {member.missing_certs.length > 0 && (
                <p className="text-xs text-red-400">{member.missing_certs.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.all_crew_briefed ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
        <input
          type="checkbox"
          checked={formData.all_crew_briefed}
          onChange={e => updateField('all_crew_briefed', e.target.checked)}
          className="w-5 h-5 rounded accent-emerald-500"
        />
        <span>All crew members briefed on hazards</span>
      </label>
    </div>
  );

  // Step 2: Physical Hazards
  const renderStep2PhysicalHazards = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <h3 className="font-semibold text-amber-400 mb-2">⚠️ Section C1: Physical Hazards</h3>
      </div>

      {PHYSICAL_HAZARDS.map(hazard => {
        const isSelected = formData.physical_hazards.includes(hazard.id);
        return (
          <div key={hazard.id}>
            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)]'}`}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleArrayItem('physical_hazards', hazard.id)}
                className="w-5 h-5 rounded accent-amber-500"
              />
              <span className="font-medium">{hazard.label}</span>
            </label>

            {/* Height details */}
            {hazard.id === 'heights' && isSelected && (
              <div className="mt-2 ml-8 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--muted)]">Height (meters)</label>
                    <input type="number" value={formData.height_hazard?.height_meters || 0} onChange={e => updateField('height_hazard', { ...formData.height_hazard, enabled: true, height_meters: parseFloat(e.target.value) || 0, type: formData.height_hazard?.type || 'ladder', fall_protection_required: true })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">Type</label>
                    <select value={formData.height_hazard?.type || 'ladder'} onChange={e => updateField('height_hazard', { ...formData.height_hazard!, type: e.target.value as 'ladder' | 'scaffold' | 'mewp' | 'roof' | 'open_edge' | 'other' })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm appearance-none">
                      <option value="ladder">Ladder</option>
                      <option value="scaffold">Scaffold</option>
                      <option value="mewp">MEWP</option>
                      <option value="roof">Roof</option>
                      <option value="open_edge">Open Edge</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.height_hazard?.fall_protection_required ?? true} onChange={e => updateField('height_hazard', { ...formData.height_hazard!, fall_protection_required: e.target.checked })} className="w-4 h-4 rounded" />
                  Fall protection required
                </label>
              </div>
            )}

            {/* Confined space details */}
            {hazard.id === 'confined_space' && isSelected && (
              <div className="mt-2 ml-8 p-4 rounded-xl bg-red-500/10 border border-red-500 space-y-3">
                <p className="text-sm text-red-400 font-medium">⚠️ CONFINED SPACE - Critical Requirements</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--muted)]">O₂ Level (%)</label>
                    <input type="number" step="0.1" value={formData.confined_space_hazard?.oxygen_level || 0} onChange={e => updateField('confined_space_hazard', { ...formData.confined_space_hazard, enabled: true, space_tested: formData.confined_space_hazard?.space_tested ?? false, oxygen_level: parseFloat(e.target.value) || 0, lel_reading: formData.confined_space_hazard?.lel_reading || 0, toxic_gases_ppm: formData.confined_space_hazard?.toxic_gases_ppm || 0, attendant_assigned: formData.confined_space_hazard?.attendant_assigned ?? false })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
                    <p className="text-xs text-[var(--muted)]">Safe: 19.5-23%</p>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">LEL (%)</label>
                    <input type="number" step="0.1" value={formData.confined_space_hazard?.lel_reading || 0} onChange={e => updateField('confined_space_hazard', { ...formData.confined_space_hazard!, lel_reading: parseFloat(e.target.value) || 0 })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
                    <p className="text-xs text-[var(--muted)]">Safe: &lt;10%</p>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">Toxic (ppm)</label>
                    <input type="number" value={formData.confined_space_hazard?.toxic_gases_ppm || 0} onChange={e => updateField('confined_space_hazard', { ...formData.confined_space_hazard!, toxic_gases_ppm: parseInt(e.target.value) || 0 })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
                    <p className="text-xs text-[var(--muted)]">Safe: 0</p>
                  </div>
                </div>
                <label className={`flex items-center gap-2 p-3 rounded-lg ${formData.confined_space_hazard?.space_tested ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  <input type="checkbox" checked={formData.confined_space_hazard?.space_tested ?? false} onChange={e => updateField('confined_space_hazard', { ...formData.confined_space_hazard!, space_tested: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm">Space atmospheric testing completed</span>
                </label>
                <label className={`flex items-center gap-2 p-3 rounded-lg ${formData.confined_space_hazard?.attendant_assigned ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  <input type="checkbox" checked={formData.confined_space_hazard?.attendant_assigned ?? false} onChange={e => updateField('confined_space_hazard', { ...formData.confined_space_hazard!, attendant_assigned: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm">Attendant assigned</span>
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Step 3: Chemical Hazards
  const renderStep3ChemicalHazards = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
        <h3 className="font-semibold text-purple-400 mb-2">🧪 Section C2: Chemical Hazards</h3>
      </div>

      {formData.chemical_hazards.map((chem, i) => (
        <div key={chem.id} className="p-4 rounded-xl border border-[var(--border)] space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Chemical #{i + 1}</span>
            <button type="button" onClick={() => removeChemical(chem.id)} className="text-red-400 text-sm">Remove</button>
          </div>
          <input type="text" value={chem.product_name} onChange={e => updateChemical(chem.id, { product_name: e.target.value })} placeholder="Product name" className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
          <label className={`flex items-center gap-2 p-3 rounded-lg ${chem.sds_reviewed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            <input type="checkbox" checked={chem.sds_reviewed} onChange={e => updateChemical(chem.id, { sds_reviewed: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm">SDS Reviewed {!chem.sds_reviewed && '(REQUIRED)'}</span>
          </label>
          <input type="text" value={chem.hazard_classification} onChange={e => updateChemical(chem.id, { hazard_classification: e.target.value })} placeholder="Hazard classification (from SDS)" className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
        </div>
      ))}

      <button type="button" onClick={addChemical} className="w-full p-4 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)]">
        + Add Chemical
      </button>

      <div className="space-y-2">
        {[
          { key: 'dust_silica_exposure' as const, label: 'Dust/Silica Exposure' },
          { key: 'fumes_gases' as const, label: 'Fumes/Gases' },
          { key: 'asbestos_potential' as const, label: 'Asbestos Potential (testing required)' },
        ].map(item => (
          <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData[item.key] ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData[item.key]} onChange={e => updateField(item.key, e.target.checked)} className="w-5 h-5 rounded accent-purple-500" />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  // Step 4: Other Hazards
  const renderStep4OtherHazards = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
        <h3 className="font-semibold text-orange-400 mb-2">⚡ Section C3-C7: Other Hazards</h3>
      </div>

      {/* Biological */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--muted)]">Biological Hazards</legend>
        {BIOLOGICAL_HAZARDS.map(h => (
          <label key={h} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer text-sm ${formData.biological_hazards.includes(h) ? 'border-green-500 bg-green-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData.biological_hazards.includes(h)} onChange={() => toggleArrayItem('biological_hazards', h)} className="w-4 h-4 rounded" />
            {h}
          </label>
        ))}
      </fieldset>

      {/* Ergonomic */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--muted)]">Ergonomic Hazards</legend>
        {ERGONOMIC_HAZARDS.map(h => (
          <label key={h} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer text-sm ${formData.ergonomic_hazards.includes(h) ? 'border-blue-500 bg-blue-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData.ergonomic_hazards.includes(h)} onChange={() => toggleArrayItem('ergonomic_hazards', h)} className="w-4 h-4 rounded" />
            {h}
          </label>
        ))}
      </fieldset>

      {/* Electrical */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--muted)]">Electrical Hazards</legend>
        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.electrical_hazards.overhead_lines ? 'border-yellow-500 bg-yellow-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.electrical_hazards.overhead_lines} onChange={e => updateField('electrical_hazards', { ...formData.electrical_hazards, overhead_lines: e.target.checked })} className="w-5 h-5 rounded" />
          Overhead Power Lines
        </label>
        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.electrical_hazards.underground_utilities ? 'border-yellow-500 bg-yellow-500/10' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={formData.electrical_hazards.underground_utilities} onChange={e => updateField('electrical_hazards', { ...formData.electrical_hazards, underground_utilities: e.target.checked })} className="w-5 h-5 rounded" />
          Underground Utilities
        </label>
        {formData.electrical_hazards.underground_utilities && (
          <div className="ml-8 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.electrical_hazards.one_call_completed ?? false} onChange={e => updateField('electrical_hazards', { ...formData.electrical_hazards, one_call_completed: e.target.checked })} className="w-4 h-4 rounded" />
              Ontario One Call completed
            </label>
            <input type="text" placeholder="Ticket #" value={formData.electrical_hazards.one_call_ticket || ''} onChange={e => updateField('electrical_hazards', { ...formData.electrical_hazards, one_call_ticket: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
          </div>
        )}
      </fieldset>

      {/* Equipment */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--muted)]">Equipment Hazards</legend>
        {EQUIPMENT_HAZARDS.map(h => (
          <label key={h} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer text-sm ${formData.equipment_hazards.includes(h) ? 'border-orange-500 bg-orange-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData.equipment_hazards.includes(h)} onChange={() => toggleArrayItem('equipment_hazards', h)} className="w-4 h-4 rounded" />
            {h}
          </label>
        ))}
      </fieldset>

      {/* Weather */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-[var(--muted)]">Weather & Environmental</legend>
        <div className="grid grid-cols-2 gap-3">
          <select value={formData.weather_conditions.current} onChange={e => updateField('weather_conditions', { ...formData.weather_conditions, current: e.target.value })} className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm appearance-none">
            {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <input type="number" value={formData.weather_conditions.wind_speed_kmh} onChange={e => updateField('weather_conditions', { ...formData.weather_conditions, wind_speed_kmh: parseInt(e.target.value) || 0 })} placeholder="Wind (km/h)" className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
        </div>
        <label className={`flex items-center gap-2 p-3 rounded-lg ${formData.weather_conditions.lightning_risk ? 'bg-red-500/20' : ''}`}>
          <input type="checkbox" checked={formData.weather_conditions.lightning_risk} onChange={e => updateField('weather_conditions', { ...formData.weather_conditions, lightning_risk: e.target.checked })} className="w-4 h-4 rounded" />
          <span className="text-sm">Lightning risk (stop work if &lt;10km)</span>
        </label>
      </fieldset>
    </div>
  );

  // Step 5: Risk Assessment
  const renderStep5RiskAssessment = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <h3 className="font-semibold text-red-400 mb-2">📊 Section D: Risk Assessment Matrix</h3>
        <p className="text-sm text-[var(--muted)]">Assess each hazard: Likelihood × Consequence = Risk</p>
      </div>

      {errors.risks && <p className="text-amber-400 text-sm">{errors.risks}</p>}

      {formData.risk_assessments.length === 0 && (
        <button type="button" onClick={generateRiskAssessments} className="w-full p-4 rounded-xl bg-[var(--primary)] text-white font-semibold">
          Generate Risk Assessments from Hazards
        </button>
      )}

      {formData.risk_assessments.map(risk => (
        <div key={risk.id} className={`p-4 rounded-xl border-2 space-y-4 ${RISK_COLORS[risk.risk_level_after].replace('bg-', 'border-')}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{risk.hazard}</p>
              <p className="text-xs text-[var(--muted)]">{risk.hazard_category}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-bold text-white ${RISK_COLORS[risk.risk_level_after]}`}>
              {risk.risk_level_after.toUpperCase()}
            </span>
          </div>

          {/* Before Controls */}
          <div className="p-3 rounded-lg bg-[var(--background)]">
            <p className="text-xs text-[var(--muted)] mb-2">BEFORE Controls</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs">Likelihood</label>
                <select value={risk.likelihood_before} onChange={e => updateRiskAssessment(risk.id, { likelihood_before: parseInt(e.target.value) as Likelihood })} className="w-full h-8 px-2 rounded bg-[var(--card)] border border-[var(--border)] text-xs appearance-none">
                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} - {LIKELIHOOD_LABELS[v as Likelihood]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs">Consequence</label>
                <select value={risk.consequence_before} onChange={e => updateRiskAssessment(risk.id, { consequence_before: parseInt(e.target.value) as Consequence })} className="w-full h-8 px-2 rounded bg-[var(--card)] border border-[var(--border)] text-xs appearance-none">
                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} - {CONSEQUENCE_LABELS[v as Consequence]}</option>)}
                </select>
              </div>
              <div className="text-center">
                <label className="text-xs">Risk</label>
                <p className={`font-bold text-lg ${RISK_COLORS[risk.risk_level_before].replace('bg-', 'text-')}`}>
                  {risk.risk_rating_before}
                </p>
              </div>
            </div>
          </div>

          {/* After Controls */}
          <div className="p-3 rounded-lg bg-emerald-500/10">
            <p className="text-xs text-emerald-400 mb-2">AFTER Controls (Residual Risk)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <select value={risk.likelihood_after} onChange={e => updateRiskAssessment(risk.id, { likelihood_after: parseInt(e.target.value) as Likelihood })} className="w-full h-8 px-2 rounded bg-[var(--card)] border border-[var(--border)] text-xs appearance-none">
                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} - {LIKELIHOOD_LABELS[v as Likelihood]}</option>)}
                </select>
              </div>
              <div>
                <select value={risk.consequence_after} onChange={e => updateRiskAssessment(risk.id, { consequence_after: parseInt(e.target.value) as Consequence })} className="w-full h-8 px-2 rounded bg-[var(--card)] border border-[var(--border)] text-xs appearance-none">
                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} - {CONSEQUENCE_LABELS[v as Consequence]}</option>)}
                </select>
              </div>
              <div className="text-center">
                <p className={`font-bold text-lg ${RISK_COLORS[risk.risk_level_after].replace('bg-', 'text-')}`}>
                  {risk.risk_rating_after}
                </p>
              </div>
            </div>
          </div>

          <label className={`flex items-center gap-2 p-2 rounded ${risk.acceptable ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            <input type="checkbox" checked={risk.acceptable} onChange={e => updateRiskAssessment(risk.id, { acceptable: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm">Residual risk is acceptable</span>
          </label>
        </div>
      ))}
    </div>
  );

  // Step 6: Controls
  const renderStep6Controls = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <h3 className="font-semibold text-emerald-400 mb-2">🛡️ Section E: Control Measures (Hierarchy)</h3>
        <p className="text-sm text-[var(--muted)]">Elimination → Substitution → Engineering → Admin → PPE</p>
      </div>

      {formData.risk_assessments.map(risk => (
        <div key={risk.id} className="p-4 rounded-xl border border-[var(--border)] space-y-4">
          <p className="font-medium">{risk.hazard}</p>

          {/* Engineering Controls */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--muted)]">Engineering Controls</p>
            <div className="grid grid-cols-2 gap-2">
              {ENGINEERING_CONTROLS.map(c => (
                <label key={c} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer ${risk.controls.engineering.includes(c) ? 'bg-emerald-500/20' : 'bg-[var(--background)]'}`}>
                  <input type="checkbox" checked={risk.controls.engineering.includes(c)} onChange={e => {
                    const newEng = e.target.checked ? [...risk.controls.engineering, c] : risk.controls.engineering.filter(x => x !== c);
                    updateRiskControls(risk.id, { engineering: newEng });
                  }} className="w-4 h-4 rounded" />
                  {c}
                </label>
              ))}
            </div>
          </div>

          {/* Administrative Controls */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--muted)]">Administrative Controls</p>
            <div className="grid grid-cols-2 gap-2">
              {ADMINISTRATIVE_CONTROLS.map(c => (
                <label key={c} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer ${risk.controls.administrative.includes(c) ? 'bg-blue-500/20' : 'bg-[var(--background)]'}`}>
                  <input type="checkbox" checked={risk.controls.administrative.includes(c)} onChange={e => {
                    const newAdmin = e.target.checked ? [...risk.controls.administrative, c] : risk.controls.administrative.filter(x => x !== c);
                    updateRiskControls(risk.id, { administrative: newAdmin });
                  }} className="w-4 h-4 rounded" />
                  {c}
                </label>
              ))}
            </div>
          </div>

          {/* PPE */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--muted)]">PPE Required</p>
            <div className="grid grid-cols-2 gap-2">
              {PPE_OPTIONS.slice(0, 10).map(p => (
                <label key={p.value} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer ${risk.controls.ppe.includes(p.value) ? 'bg-amber-500/20' : 'bg-[var(--background)]'}`}>
                  <input type="checkbox" checked={risk.controls.ppe.includes(p.value)} onChange={e => {
                    const newPPE = e.target.checked ? [...risk.controls.ppe, p.value] : risk.controls.ppe.filter(x => x !== p.value);
                    updateRiskControls(risk.id, { ppe: newPPE });
                  }} className="w-4 h-4 rounded" />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Step 7: Emergency Response
  const renderStep7Emergency = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <h3 className="font-semibold text-red-400 mb-2">🚨 Section F: Emergency Response</h3>
      </div>

      <div className="space-y-3">
        {[
          { key: 'emergency_numbers_displayed' as const, label: 'Emergency contact numbers displayed' },
          { key: 'evacuation_reviewed' as const, label: 'Evacuation plan reviewed' },
          { key: 'fire_extinguisher' as const, label: 'Fire extinguisher available' },
          { key: 'rescue_equipment' as const, label: 'Rescue equipment available' },
          { key: 'spill_kit' as const, label: 'Spill kit available' },
        ].map(item => (
          <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData.emergency_response[item.key] ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={formData.emergency_response[item.key] as boolean} onChange={e => updateField('emergency_response', { ...formData.emergency_response, [item.key]: e.target.checked })} className="w-5 h-5 rounded accent-emerald-500" />
            {item.label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">First Aid Location</label>
          <input type="text" value={formData.emergency_response.first_aid_location} onChange={e => updateField('emergency_response', { ...formData.emergency_response, first_aid_location: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">First Aid Attendant</label>
          <input type="text" value={formData.emergency_response.first_aid_attendant} onChange={e => updateField('emergency_response', { ...formData.emergency_response, first_aid_attendant: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nearest Hospital</label>
        <input type="text" value={formData.emergency_response.nearest_hospital} onChange={e => updateField('emergency_response', { ...formData.emergency_response, nearest_hospital: e.target.value })} placeholder="Name and address" className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
      </div>

      {/* Stop Work */}
      <div className="p-4 rounded-xl bg-red-500 text-white">
        <p className="font-bold mb-2">🛑 STOP WORK CONDITIONS</p>
        <ul className="text-sm space-y-1">
          <li>• Weather deteriorates</li>
          <li>• Equipment malfunction</li>
          <li>• Injury occurs</li>
          <li>• New hazard discovered</li>
          <li>• Control measures fail</li>
          <li>• Worker feels unsafe</li>
        </ul>
      </div>

      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.stop_work_understood ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10'}`}>
        <input type="checkbox" checked={formData.stop_work_understood} onChange={e => updateField('stop_work_understood', e.target.checked)} className="w-5 h-5 rounded" />
        <span className="font-medium">All crew understand stop work authority</span>
      </label>
    </div>
  );

  // Step 8: Permits
  const renderStep8Permits = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">📝 Section H: Permits & Approvals</h3>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Required Permits</legend>
        {PERMIT_TYPES.map(p => {
          const permit = formData.permits.find(x => x.type === p.value);
          return (
            <div key={p.value}>
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${permit ? 'border-blue-500 bg-blue-500/10' : 'border-[var(--border)]'}`}>
                <input type="checkbox" checked={!!permit} onChange={() => togglePermit(p.value)} className="w-5 h-5 rounded accent-blue-500" />
                {p.label}
              </label>
              {permit && (
                <div className="ml-8 mt-2 space-y-2">
                  <input type="text" value={permit.number} onChange={e => updatePermit(p.value, { number: e.target.value })} placeholder="Permit number" className="w-full h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm" />
                  <label className={`flex items-center gap-2 p-2 rounded ${permit.attached ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <input type="checkbox" checked={permit.attached} onChange={e => updatePermit(p.value, { attached: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-sm">Permit attached/verified</span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </fieldset>
    </div>
  );

  // Step 9: Pre-Task Meeting
  const renderStep9Meeting = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <h3 className="font-semibold text-emerald-400 mb-2">👥 Section I: Pre-Task Meeting & Crew Sign-off</h3>
      </div>

      {errors.meeting && <p className="text-red-400 text-sm">{errors.meeting}</p>}

      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.meeting_held ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
        <input type="checkbox" checked={formData.meeting_held} onChange={e => {
          updateField('meeting_held', e.target.checked);
          if (e.target.checked) updateField('meeting_datetime', new Date().toISOString());
        }} className="w-5 h-5 rounded accent-emerald-500" />
        <span className="font-medium">Pre-task meeting held with crew</span>
      </label>

      {formData.meeting_held && (
        <div className="space-y-3">
          {[
            { key: 'all_attended' as const, label: 'All crew members attended' },
            { key: 'hazards_explained' as const, label: 'Hazards and controls explained' },
            { key: 'questions_answered' as const, label: 'All questions answered' },
            { key: 'crew_comfortable' as const, label: 'All crew comfortable proceeding' },
          ].map(item => (
            <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${formData[item.key] ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
              <input type="checkbox" checked={formData[item.key]} onChange={e => updateField(item.key, e.target.checked)} className="w-5 h-5 rounded" />
              {item.label}
            </label>
          ))}
          {errors.comfort && <p className="text-red-400 text-sm">{errors.comfort}</p>}

          {/* Crew Signatures */}
          <div className="p-4 rounded-xl bg-[var(--background)]">
            <p className="text-sm font-medium mb-3">Crew Member Acknowledgment</p>
            <p className="text-xs text-[var(--muted)] mb-4">"I understand the hazards, controls, and how to stop work if unsafe."</p>
            
            {formData.crew_members.map(member => (
              <div key={member.worker_id} className={`p-3 rounded-lg mb-2 ${member.signature ? 'bg-emerald-500/10' : 'bg-[var(--card)]'}`}>
                <div className="flex justify-between items-center">
                  <span>{member.name}</span>
                  {member.signature ? (
                    <span className="text-emerald-400 text-sm">✓ Signed</span>
                  ) : (
                    <button type="button" onClick={() => setActiveCrewSignature(member.worker_id)} className="px-3 py-1 rounded bg-[var(--primary)] text-white text-sm">
                      Sign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crew Signature Modal */}
      {activeCrewSignature && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="bg-[var(--card)] border-b border-[var(--border)] p-4">
            <h3 className="font-semibold">{formData.crew_members.find(c => c.worker_id === activeCrewSignature)?.name}</h3>
          </div>
          <div className="flex-1 p-4">
            <SignaturePad
              label="Signature"
              onSignatureChange={sig => {
                if (sig?.data) {
                  updateCrewMember(activeCrewSignature, { signature: sig.data, signed_at: new Date().toISOString() });
                  setActiveCrewSignature(null);
                }
              }}
            />
          </div>
          <div className="bg-[var(--card)] p-4">
            <button type="button" onClick={() => setActiveCrewSignature(null)} className="w-full h-12 rounded-xl bg-[var(--border)]">Cancel</button>
          </div>
        </div>
      )}

      {/* Monitoring */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Check-in Frequency</label>
        <select value={formData.monitoring_frequency} onChange={e => updateField('monitoring_frequency', e.target.value as 'hourly' | '2_hours' | 'continuous')} className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] appearance-none">
          <option value="hourly">Every hour</option>
          <option value="2_hours">Every 2 hours</option>
          <option value="continuous">Continuous</option>
        </select>
      </div>
    </div>
  );

  // Step 10: Final Sign-off
  const renderStep10Signoff = () => (
    <div className="space-y-6">
      <div className={`p-6 rounded-xl text-center ${canProceed ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
        <p className="text-4xl mb-2">{canProceed ? '✅' : '🚫'}</p>
        <p className={`text-xl font-bold ${canProceed ? 'text-emerald-400' : 'text-red-400'}`}>
          {canProceed ? 'APPROVED TO PROCEED' : 'CANNOT PROCEED'}
        </p>
        <p className={`text-sm mt-2 ${RISK_COLORS[highestRiskLevel].replace('bg-', 'text-')}`}>
          Highest Risk Level: {highestRiskLevel.toUpperCase()}
        </p>
      </div>

      {!canProceed && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500">
          <p className="font-medium text-red-400 mb-2">Blocking Issues:</p>
          <ul className="text-sm space-y-1">
            {formData.risk_assessments.some(r => r.risk_level_after === 'extreme' && !r.acceptable) && (
              <li>• Extreme risk not accepted - additional controls required</li>
            )}
            {formData.crew_members.some(c => !c.certs_valid) && (
              <li>• Crew members missing required certifications</li>
            )}
            {formData.permits.some(p => !p.attached) && (
              <li>• Required permits not attached</li>
            )}
            {!formData.crew_comfortable && (
              <li>• Crew not comfortable proceeding</li>
            )}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-[var(--muted)]">PTHA #:</span><span className="font-mono">{formData.ptha_number}</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Task:</span><span>{HIGH_RISK_TASKS.find(t => t.value === formData.task_type)?.label}</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Crew Size:</span><span>{formData.crew_members.length}</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Hazards Identified:</span><span>{formData.risk_assessments.length}</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Permits Required:</span><span>{formData.permits.length}</span></div>
      </div>

      {/* Supervisor Signature */}
      <SignaturePad
        label="Supervisor Signature"
        value={formData.supervisor_signature}
        onSignatureChange={sig => {
          updateField('supervisor_signature', sig?.data || '');
          if (sig) updateField('supervisor_date', getCurrentDate());
        }}
        required
        error={errors.supervisor}
      />

      {/* Safety Manager (if high/extreme) */}
      {(highestRiskLevel === 'high' || highestRiskLevel === 'extreme') && (
        <SignaturePad
          label="Safety Manager Signature (Required for High/Extreme Risk)"
          value={formData.safety_manager_signature}
          onSignatureChange={sig => {
            updateField('safety_manager_signature', sig?.data || '');
            if (sig) updateField('safety_manager_date', getCurrentDate());
          }}
          required
          error={errors.safety_manager}
        />
      )}

      {/* Task Lead Signature */}
      <SignaturePad
        label="Task Lead Signature"
        value={formData.task_lead_signature}
        onSignatureChange={sig => updateField('task_lead_signature', sig?.data || '')}
        required
      />

      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <p className="text-sm text-blue-400">
          📋 Tagged as COR audit evidence for <strong>{formData.audit_element}</strong>
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0Task();
      case 1: return renderStep1Crew();
      case 2: return renderStep2PhysicalHazards();
      case 3: return renderStep3ChemicalHazards();
      case 4: return renderStep4OtherHazards();
      case 5: return renderStep5RiskAssessment();
      case 6: return renderStep6Controls();
      case 7: return renderStep7Emergency();
      case 8: return renderStep8Permits();
      case 9: return renderStep9Meeting();
      case 10: return renderStep10Signoff();
      default: return null;
    }
  };

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
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

      {showDraftBanner && draftInfo && (
        <div className="sticky top-0 z-40 bg-amber-500 text-black px-4 py-3">
          <p className="text-sm font-medium mb-2">📝 Resume draft from {formatRelativeTime(draftInfo.updatedAt)}?</p>
          <div className="flex gap-3">
            <button type="button" onClick={handleRestoreDraft} className="flex-1 bg-black/20 py-2 px-4 rounded-lg font-semibold">Yes</button>
            <button type="button" onClick={handleDiscardDraft} className="flex-1 bg-white/20 py-2 px-4 rounded-lg font-semibold">No</button>
          </div>
        </div>
      )}

      {renderProgressHeader()}

      <div ref={formRef} className="px-4 py-6 overflow-y-auto">
        {renderCurrentStep()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStep > 0 && (
            <button type="button" onClick={handleBack} className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold">← Back</button>
          )}
          
          {currentStep === 0 && (
            <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft} className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold disabled:opacity-50">
              {isSavingDraft ? 'Saving...' : '💾 Save'}
            </button>
          )}

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button type="button" onClick={handleNext} className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white font-semibold">Continue →</button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed}
              className={`flex-1 h-14 rounded-xl font-semibold text-white disabled:opacity-50 ${canProceed ? 'bg-emerald-500' : 'bg-red-500'}`}
            >
              {isSubmitting ? '⟳ Submitting...' : canProceed ? '✅ Approve & Proceed' : '🚫 Cannot Proceed'}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-[var(--muted)]">
          <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
          <span className={`font-medium ${RISK_COLORS[highestRiskLevel].replace('bg-', 'text-')}`}>
            Risk: {highestRiskLevel.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

export type { PTHAFormProps };
