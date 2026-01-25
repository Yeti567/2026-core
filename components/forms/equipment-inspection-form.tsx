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
  type EquipmentInspection,
  type ChecklistItem,
  type Deficiency,
  type EquipmentType,
  EQUIPMENT_TYPES,
  EQUIPMENT_CHECKLISTS,
  SEVERITY_OPTIONS,
  MAINTENANCE_TYPES,
  WIZARD_STEPS,
} from './equipment-inspection-types';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORM_TYPE = 'equipment_inspection';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// =============================================================================
// PROPS & TYPES
// =============================================================================

interface EquipmentInspectionFormProps {
  companyId: string;
  userId: string;
  userName: string;
  jobsites: Array<{ id: string; name: string }>;
  equipment: Array<{
    id: string;
    type: string;
    serial: string;
    make?: string;
    model?: string;
    purchase_date?: string;
    last_inspection?: string;
    last_maintenance?: string;
  }>;
  workers: Array<{ id: string; name: string; license_type?: string; license_expiry?: string }>;
  onSubmitSuccess?: (formId: string, inspectionNumber: string) => void;
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

const generateInspectionNumber = (equipmentId: string) => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `EQP-${equipmentId.slice(0, 8).toUpperCase()}-${year}-${seq}`;
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

const calculateNextInspection = (equipmentType: EquipmentType): string => {
  const typeConfig = EQUIPMENT_TYPES.find(t => t.value === equipmentType);
  const frequency = typeConfig?.inspectionFrequency || 'daily';
  const date = new Date();
  
  switch (frequency) {
    case 'daily': date.setDate(date.getDate() + 1); break;
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    default: date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split('T')[0];
};

const getInitialFormData = (props: EquipmentInspectionFormProps): EquipmentInspection => ({
  inspection_number: '',
  company_id: props.companyId,
  equipment_id: '',
  equipment_type: 'extension_ladder',
  equipment_serial: '',
  inspection_date: getCurrentDate(),
  inspection_time: getCurrentTime(),
  inspector_id: props.userId,
  inspector_name: props.userName,
  jobsite_id: '',
  checklist_items: [],
  deficiencies: [],
  out_of_service: false,
  maintenance_due: false,
  maintenance_required: [],
  operator_id: '',
  operator_name: '',
  operator_licensed: false,
  operator_trained: false,
  operator_signature: '',
  overall_result: '',
  inspector_signature: '',
  inspector_date: '',
  next_inspection_due: '',
  audit_element: 'Element 13',
  status: 'draft',
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EquipmentInspectionForm(props: EquipmentInspectionFormProps) {
  const { companyId, userId, equipment, workers, jobsites, onSubmitSuccess, onDraftSaved } = props;
  const { isOnline } = useNetworkStatus();

  // Form state
  const [formData, setFormData] = useState<EquipmentInspection>(() => getInitialFormData(props));
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ formId: string; updatedAt: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deficiencyPhotos, setDeficiencyPhotos] = useState<Record<string, CapturedPhoto[]>>({});
  const [oosTagPhoto, setOosTagPhoto] = useState<CapturedPhoto[]>([]);

  // Refs
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave<EquipmentInspection>> | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Computed
  const currentStepConfig = WIZARD_STEPS[currentStep];
  const failedItems = formData.checklist_items.filter(item => item.result === 'fail');
  const hasCriticalDeficiency = formData.deficiencies.some(d => d.severity === 'critical');

  // Auto-calculate overall result
  const calculatedResult = useMemo(() => {
    if (hasCriticalDeficiency || formData.out_of_service) return 'fail';
    if (formData.deficiencies.some(d => d.severity === 'major')) return 'conditional_pass';
    if (failedItems.length === 0 && formData.checklist_items.length > 0) return 'pass';
    if (failedItems.length > 0) return 'conditional_pass';
    return '';
  }, [hasCriticalDeficiency, formData.out_of_service, formData.deficiencies, failedItems, formData.checklist_items]);

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
      const draft = await loadDraft<EquipmentInspection>(FORM_TYPE, companyId);
      if (draft) {
        setDraftInfo({ formId: draft.formId, updatedAt: draft.updatedAt });
        setShowDraftBanner(true);
      }
    };
    checkDraft();
  }, [companyId]);

  useEffect(() => {
    autoSaveRef.current = createAutoSave<EquipmentInspection>(
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
      const draft = await loadDraft<EquipmentInspection>(FORM_TYPE, companyId);
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

  const updateField = <K extends keyof EquipmentInspection>(field: K, value: EquipmentInspection[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleEquipmentSelect = (equipmentId: string) => {
    const selected = equipment.find(e => e.id === equipmentId);
    if (selected) {
      const checklist = EQUIPMENT_CHECKLISTS[selected.type] || EQUIPMENT_CHECKLISTS.other;
      const checklistItems: ChecklistItem[] = checklist.map(item => ({
        ...item,
        result: '',
      }));

      setFormData(prev => ({
        ...prev,
        equipment_id: equipmentId,
        equipment_type: selected.type as EquipmentType,
        equipment_serial: selected.serial,
        equipment_make: selected.make,
        equipment_model: selected.model,
        purchase_date: selected.purchase_date,
        last_inspection_date: selected.last_inspection,
        last_maintenance_date: selected.last_maintenance,
        inspection_number: generateInspectionNumber(equipmentId),
        checklist_items: checklistItems,
        next_inspection_due: calculateNextInspection(selected.type as EquipmentType),
      }));
    }
  };

  const handleEquipmentTypeChange = (type: EquipmentType) => {
    const checklist = EQUIPMENT_CHECKLISTS[type] || EQUIPMENT_CHECKLISTS.other;
    const checklistItems: ChecklistItem[] = checklist.map(item => ({
      ...item,
      result: '',
    }));

    setFormData(prev => ({
      ...prev,
      equipment_type: type,
      checklist_items: checklistItems,
      next_inspection_due: calculateNextInspection(type),
    }));
  };

  const updateChecklistItem = (id: string, result: 'pass' | 'fail' | 'na', notes?: string) => {
    setFormData(prev => ({
      ...prev,
      checklist_items: prev.checklist_items.map(item =>
        item.id === id ? { ...item, result, notes } : item
      ),
    }));

    // Auto-add deficiency if failed
    if (result === 'fail') {
      const item = formData.checklist_items.find(i => i.id === id);
      if (item && !formData.deficiencies.find(d => d.checklist_item_id === id)) {
        addDeficiency(item.item, id);
      }
    } else {
      // Remove auto-added deficiency if no longer failed
      setFormData(prev => ({
        ...prev,
        deficiencies: prev.deficiencies.filter(d => d.checklist_item_id !== id),
      }));
    }
  };

  const addDeficiency = (description: string, checklistItemId?: string) => {
    const newDeficiency: Deficiency = {
      id: `def_${Date.now()}`,
      description,
      checklist_item_id: checklistItemId,
      severity: 'minor',
      repair_required: false,
      technician_required: false,
    };
    setFormData(prev => ({
      ...prev,
      deficiencies: [...prev.deficiencies, newDeficiency],
    }));
  };

  const updateDeficiency = (id: string, updates: Partial<Deficiency>) => {
    setFormData(prev => ({
      ...prev,
      deficiencies: prev.deficiencies.map(d => d.id === id ? { ...d, ...updates } : d),
    }));

    // Auto-set OOS if critical
    if (updates.severity === 'critical') {
      setFormData(prev => ({
        ...prev,
        out_of_service: true,
        oos_reason: prev.deficiencies.filter(d => d.severity === 'critical').map(d => d.description).join('; '),
      }));
    }
  };

  const removeDeficiency = (id: string) => {
    setFormData(prev => ({
      ...prev,
      deficiencies: prev.deficiencies.filter(d => d.id !== id),
    }));
    setDeficiencyPhotos(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleOperatorSelect = (operatorId: string) => {
    const operator = workers.find(w => w.id === operatorId);
    if (operator) {
      setFormData(prev => ({
        ...prev,
        operator_id: operatorId,
        operator_name: operator.name,
        operator_license_type: operator.license_type,
        operator_license_expiry: operator.license_expiry,
        operator_licensed: !!operator.license_type && !!operator.license_expiry && new Date(operator.license_expiry) > new Date(),
      }));
    }
  };

  const toggleMaintenance = (type: string) => {
    setFormData(prev => ({
      ...prev,
      maintenance_required: prev.maintenance_required.includes(type)
        ? prev.maintenance_required.filter(m => m !== type)
        : [...prev.maintenance_required, type],
    }));
  };

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateStep = (step: number): FormErrors => {
    const newErrors: FormErrors = {};
    switch (step) {
      case 0: // Equipment
        if (!formData.equipment_id && !formData.equipment_serial) newErrors.equipment = 'Select or enter equipment';
        if (!formData.jobsite_id) newErrors.jobsite = 'Select jobsite';
        break;
      case 1: // Checklist
        const unanswered = formData.checklist_items.filter(i => i.result === '');
        if (unanswered.length > 0) newErrors.checklist = `${unanswered.length} items not inspected`;
        break;
      case 2: // Deficiencies
        const missingPhotos = formData.deficiencies.filter(d => 
          (d.severity === 'major' || d.severity === 'critical') && !d.photo
        );
        if (missingPhotos.length > 0) newErrors.photos = 'Photos required for Major/Critical deficiencies';
        break;
      case 3: // OOS
        if (formData.out_of_service) {
          if (!formData.oos_tagged_by_signature) newErrors.oos_signature = 'Signature required';
          if (oosTagPhoto.length === 0) newErrors.oos_photo = 'Photo of tag required';
        }
        break;
      case 5: // Operator
        if (!formData.operator_id) newErrors.operator = 'Select operator';
        if (!formData.operator_licensed) newErrors.operator_license = 'Operator must be licensed';
        break;
      case 6: // Sign-off
        if (!formData.inspector_signature) newErrors.inspector_signature = 'Inspector signature required';
        if (!formData.out_of_service && !formData.operator_signature) newErrors.operator_signature = 'Operator signature required';
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

    // Skip deficiencies step if none found
    if (currentStep === 1 && failedItems.length === 0 && formData.deficiencies.length === 0) {
      setCurrentStep(4); // Skip to maintenance
      return;
    }

    // Skip OOS step if not out of service
    if (currentStep === 2 && !formData.out_of_service && !hasCriticalDeficiency) {
      setCurrentStep(4); // Skip to maintenance
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
    const finalErrors = validateStep(6);
    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      showToast('Please complete required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    autoSaveRef.current?.stop();

    // Attach photos to deficiencies
    const deficienciesWithPhotos = formData.deficiencies.map(d => ({
      ...d,
      photo: deficiencyPhotos[d.id]?.[0]?.data || d.photo,
    }));

    const finalData: EquipmentInspection = {
      ...formData,
      status: 'submitted',
      overall_result: calculatedResult || 'pass',
      deficiencies: deficienciesWithPhotos,
      oos_tag_photo: oosTagPhoto[0]?.data,
      inspector_date: getCurrentDate(),
    };

    const result = await submitForm(FORM_TYPE, finalData, {
      companyId, workerId: userId, formType: FORM_TYPE, priority: finalData.out_of_service ? 1 : 2,
    });

    setIsSubmitting(false);

    if (result.success && result.formId) {
      const resultText = finalData.overall_result === 'pass' ? '✅ PASS' 
        : finalData.overall_result === 'fail' ? '❌ FAIL - OUT OF SERVICE'
        : '⚠️ CONDITIONAL PASS';
      showToast(`Inspection Complete - ${resultText}`, finalData.overall_result === 'pass' ? 'success' : 'warning');
      onSubmitSuccess?.(result.formId, finalData.inspection_number);
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
          <h1 className="text-lg font-bold">Equipment Inspection</h1>
          <p className="text-xs text-[var(--muted)]">{formData.inspection_number || 'New Inspection'} • COR Element 13</p>
        </div>
        {calculatedResult && (
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            calculatedResult === 'pass' ? 'bg-emerald-500/20 text-emerald-400' 
            : calculatedResult === 'fail' ? 'bg-red-500/20 text-red-400'
            : 'bg-amber-500/20 text-amber-400'
          }`}>
            {calculatedResult === 'pass' ? '✅ PASS' : calculatedResult === 'fail' ? '❌ FAIL' : '⚠️ COND.'}
          </span>
        )}
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

  // Step 0: Equipment Identification
  const renderStep0Equipment = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">🔧 Section A: Equipment Identification</h3>
      </div>

      {/* Equipment Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Select Equipment <span className="text-red-400">*</span></label>
        <select
          value={formData.equipment_id}
          onChange={e => handleEquipmentSelect(e.target.value)}
          className={`w-full h-14 px-4 rounded-xl bg-[var(--card)] border ${errors.equipment ? 'border-red-500' : 'border-[var(--border)]'} text-base appearance-none`}
        >
          <option value="">Select from equipment registry...</option>
          {equipment.map(e => (
            <option key={e.id} value={e.id}>
              {e.type.replace(/_/g, ' ').toUpperCase()} - {e.serial} {e.make && `(${e.make})`}
            </option>
          ))}
        </select>
        {errors.equipment && <p className="text-red-400 text-sm">{errors.equipment}</p>}
      </div>

      <div className="text-center text-[var(--muted)] text-sm">— or —</div>

      {/* Manual Entry */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Equipment Type</label>
          <select
            value={formData.equipment_type}
            onChange={e => handleEquipmentTypeChange(e.target.value as EquipmentType)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] appearance-none"
          >
            {EQUIPMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {formData.equipment_type === 'other' && (
          <input
            type="text"
            value={formData.custom_equipment_type || ''}
            onChange={e => updateField('custom_equipment_type', e.target.value)}
            placeholder="Describe equipment type..."
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
          />
        )}

        <input
          type="text"
          value={formData.equipment_serial}
          onChange={e => updateField('equipment_serial', e.target.value)}
          placeholder="Serial Number / Equipment ID"
          className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={formData.equipment_make || ''}
            onChange={e => updateField('equipment_make', e.target.value)}
            placeholder="Make"
            className="h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
          />
          <input
            type="text"
            value={formData.equipment_model || ''}
            onChange={e => updateField('equipment_model', e.target.value)}
            placeholder="Model"
            className="h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
          />
        </div>
      </div>

      {/* Jobsite Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Jobsite <span className="text-red-400">*</span></label>
        <select
          value={formData.jobsite_id}
          onChange={e => updateField('jobsite_id', e.target.value)}
          className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border ${errors.jobsite ? 'border-red-500' : 'border-[var(--border)]'} appearance-none`}
        >
          <option value="">Select jobsite...</option>
          {jobsites.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        {errors.jobsite && <p className="text-red-400 text-sm">{errors.jobsite}</p>}
      </div>

      {/* Info Display */}
      {formData.equipment_id && (
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Last Inspection:</span>
            <span>{formData.last_inspection_date || 'Never'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Last Maintenance:</span>
            <span>{formData.last_maintenance_date || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Inspection Frequency:</span>
            <span className="capitalize">{EQUIPMENT_TYPES.find(t => t.value === formData.equipment_type)?.inspectionFrequency}</span>
          </div>
        </div>
      )}

      {/* Inspector Info (readonly) */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">Inspector</p>
        <p className="font-medium">{formData.inspector_name}</p>
        <p className="text-xs text-[var(--muted)]">{formData.inspection_date} at {formData.inspection_time}</p>
      </div>
    </div>
  );

  // Step 1: Checklist
  const renderStep1Checklist = () => {
    const categories = [...new Set(formData.checklist_items.map(i => i.category))];
    const passCount = formData.checklist_items.filter(i => i.result === 'pass').length;
    const failCount = formData.checklist_items.filter(i => i.result === 'fail').length;
    const totalCount = formData.checklist_items.length;

    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <h3 className="font-semibold text-emerald-400 mb-2">
            ✅ Section B: Pre-Use Inspection Checklist
          </h3>
          <p className="text-sm text-[var(--muted)]">
            {EQUIPMENT_TYPES.find(t => t.value === formData.equipment_type)?.label || formData.equipment_type}
          </p>
        </div>

        {/* Summary */}
        <div className="flex gap-3">
          <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 text-center">
            <p className="text-2xl font-bold text-emerald-400">{passCount}</p>
            <p className="text-xs text-[var(--muted)]">Pass</p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-red-500/10 text-center">
            <p className="text-2xl font-bold text-red-400">{failCount}</p>
            <p className="text-xs text-[var(--muted)]">Fail</p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-[var(--background)] text-center">
            <p className="text-2xl font-bold">{totalCount - passCount - failCount}</p>
            <p className="text-xs text-[var(--muted)]">Remaining</p>
          </div>
        </div>

        {errors.checklist && <p className="text-amber-400 text-sm">⚠️ {errors.checklist}</p>}

        {/* Quick All Pass */}
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              checklist_items: prev.checklist_items.map(item => 
                item.result === '' ? { ...item, result: 'pass' } : item
              ),
            }));
          }}
          className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium"
        >
          ✅ Mark All Remaining as PASS
        </button>

        {/* Checklist by Category */}
        {categories.map(category => (
          <div key={category} className="space-y-2">
            <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">{category}</h4>
            {formData.checklist_items.filter(i => i.category === category).map(item => (
              <div key={item.id} className={`p-4 rounded-xl border-2 ${
                item.result === 'pass' ? 'border-emerald-500/50 bg-emerald-500/5'
                : item.result === 'fail' ? 'border-red-500 bg-red-500/10'
                : 'border-[var(--border)]'
              }`}>
                <p className="font-medium mb-3">{item.item}</p>
                <div className="flex gap-2">
                  {['pass', 'fail', 'na'].map(result => (
                    <button
                      key={result}
                      type="button"
                      onClick={() => updateChecklistItem(item.id, result as 'pass' | 'fail' | 'na')}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase transition-all ${
                        item.result === result
                          ? result === 'pass' ? 'bg-emerald-500 text-white scale-105'
                          : result === 'fail' ? 'bg-red-500 text-white scale-105'
                          : 'bg-gray-500 text-white scale-105'
                          : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {result === 'pass' ? '✅ Pass' : result === 'fail' ? '❌ Fail' : '➖ N/A'}
                    </button>
                  ))}
                </div>
                {item.result === 'fail' && (
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={e => updateChecklistItem(item.id, 'fail', e.target.value)}
                    placeholder="Notes about deficiency..."
                    className="w-full h-10 px-3 mt-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Step 2: Deficiencies
  const renderStep2Deficiencies = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <h3 className="font-semibold text-red-400 mb-2">⚠️ Section C: Deficiencies Found</h3>
        <p className="text-sm text-[var(--muted)]">{formData.deficiencies.length} deficienc{formData.deficiencies.length === 1 ? 'y' : 'ies'} identified</p>
      </div>

      {errors.photos && <p className="text-amber-400 text-sm">⚠️ {errors.photos}</p>}

      {formData.deficiencies.map((deficiency, i) => (
        <div key={deficiency.id} className={`p-4 rounded-xl border-2 space-y-4 ${
          deficiency.severity === 'critical' ? 'border-red-500 bg-red-500/10'
          : deficiency.severity === 'major' ? 'border-orange-500 bg-orange-500/10'
          : 'border-amber-500 bg-amber-500/10'
        }`}>
          <div className="flex justify-between items-start">
            <span className="font-medium">Deficiency #{i + 1}</span>
            <button type="button" onClick={() => removeDeficiency(deficiency.id)} className="text-red-400 text-sm">Remove</button>
          </div>

          <p className="text-sm">{deficiency.description}</p>

          {/* Severity */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--muted)]">Severity</label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateDeficiency(deficiency.id, { severity: opt.value })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    deficiency.severity === opt.value
                      ? opt.value === 'critical' ? 'bg-red-500 text-white'
                      : opt.value === 'major' ? 'bg-orange-500 text-white'
                      : 'bg-amber-500 text-black'
                      : 'bg-[var(--background)] border border-[var(--border)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo - Required for Major/Critical */}
          {(deficiency.severity === 'major' || deficiency.severity === 'critical') && (
            <PhotoCapture
              label={`Photo of Deficiency (Required)`}
              photos={deficiencyPhotos[deficiency.id] || []}
              onPhotosChange={photos => setDeficiencyPhotos(prev => ({ ...prev, [deficiency.id]: photos }))}
              maxPhotos={1}
              required
            />
          )}

          {/* Repair Required */}
          <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer">
            <input
              type="checkbox"
              checked={deficiency.repair_required}
              onChange={e => updateDeficiency(deficiency.id, { repair_required: e.target.checked })}
              className="w-5 h-5 rounded accent-[var(--primary)]"
            />
            <span>Repair Required</span>
          </label>

          {deficiency.repair_required && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={deficiency.repair_time_estimate || ''}
                onChange={e => updateDeficiency(deficiency.id, { repair_time_estimate: e.target.value })}
                placeholder="Est. repair time"
                className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              />
              <input
                type="text"
                value={deficiency.parts_needed || ''}
                onChange={e => updateDeficiency(deficiency.id, { parts_needed: e.target.value })}
                placeholder="Parts needed"
                className="h-10 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              />
            </div>
          )}

          <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer">
            <input
              type="checkbox"
              checked={deficiency.technician_required}
              onChange={e => updateDeficiency(deficiency.id, { technician_required: e.target.checked })}
              className="w-5 h-5 rounded accent-[var(--primary)]"
            />
            <span>Technician Required</span>
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={() => addDeficiency('')}
        className="w-full p-4 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)]"
      >
        + Add Another Deficiency
      </button>
    </div>
  );

  // Step 3: Out of Service Tag
  const renderStep3OOS = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <h3 className="font-semibold text-red-400 mb-2">🚫 Section D: Out of Service Tag</h3>
      </div>

      {hasCriticalDeficiency && (
        <div className="p-4 rounded-xl bg-red-500 text-white">
          <p className="font-bold">⚠️ CRITICAL DEFICIENCY FOUND</p>
          <p className="text-sm mt-1">Equipment MUST be taken out of service immediately.</p>
        </div>
      )}

      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.out_of_service ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)]'}`}>
        <input
          type="checkbox"
          checked={formData.out_of_service}
          onChange={e => {
            updateField('out_of_service', e.target.checked);
            if (e.target.checked) {
              updateField('oos_tag_number', `OOS-${formData.equipment_serial}-${getCurrentDate()}-${Math.floor(Math.random() * 100)}`);
            }
          }}
          className="w-6 h-6 rounded accent-red-500"
        />
        <div>
          <span className="font-bold text-red-400">Equipment OUT OF SERVICE</span>
          <p className="text-sm text-[var(--muted)]">Tag will be generated and must be attached to equipment</p>
        </div>
      </label>

      {formData.out_of_service && (
        <>
          <div className="p-4 rounded-xl bg-red-500 text-white space-y-3">
            <p className="text-2xl font-bold text-center">🚫 OUT OF SERVICE</p>
            <p className="text-center font-mono">{formData.oos_tag_number}</p>
            <hr className="border-white/30" />
            <div>
              <p className="text-xs">REASON:</p>
              <p className="font-medium">{formData.oos_reason || formData.deficiencies.map(d => d.description).join('; ')}</p>
            </div>
            <div>
              <p className="text-xs">DATE TAGGED:</p>
              <p className="font-medium">{getCurrentDate()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Reason for Out of Service</label>
            <textarea
              value={formData.oos_reason || ''}
              onChange={e => updateField('oos_reason', e.target.value)}
              placeholder="Describe reason..."
              rows={3}
              className="w-full p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm resize-none"
            />
          </div>

          <SignaturePad
            label="Tagged By (Signature)"
            value={formData.oos_tagged_by_signature}
            onSignatureChange={sig => updateField('oos_tagged_by_signature', sig?.data || '')}
            required
            error={errors.oos_signature}
          />

          <PhotoCapture
            label="Photo of Tag Attached to Equipment"
            photos={oosTagPhoto}
            onPhotosChange={setOosTagPhoto}
            maxPhotos={1}
            required
            error={errors.oos_photo}
          />
        </>
      )}
    </div>
  );

  // Step 4: Maintenance
  const renderStep4Maintenance = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <h3 className="font-semibold text-amber-400 mb-2">🔧 Section E: Maintenance Required</h3>
      </div>

      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.maintenance_due ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)]'}`}>
        <input
          type="checkbox"
          checked={formData.maintenance_due}
          onChange={e => updateField('maintenance_due', e.target.checked)}
          className="w-5 h-5 rounded accent-amber-500"
        />
        <span>Routine maintenance is due / needed</span>
      </label>

      {formData.maintenance_due && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Maintenance Required</legend>
            <div className="grid grid-cols-2 gap-2">
              {MAINTENANCE_TYPES.map(type => (
                <label key={type} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm ${formData.maintenance_required.includes(type) ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)]'}`}>
                  <input
                    type="checkbox"
                    checked={formData.maintenance_required.includes(type)}
                    onChange={() => toggleMaintenance(type)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Target Completion Date</label>
            <input
              type="date"
              value={formData.maintenance_scheduled_date || ''}
              onChange={e => updateField('maintenance_scheduled_date', e.target.value)}
              min={getCurrentDate()}
              className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              value={formData.maintenance_notes || ''}
              onChange={e => updateField('maintenance_notes', e.target.value)}
              placeholder="Additional maintenance notes..."
              rows={3}
              className="w-full p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm resize-none"
            />
          </div>
        </>
      )}
    </div>
  );

  // Step 5: Operator Verification
  const renderStep5Operator = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <h3 className="font-semibold text-blue-400 mb-2">👷 Section F: Operator Verification</h3>
      </div>

      {formData.out_of_service && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500">
          <p className="text-red-400 font-medium">⚠️ Equipment is OUT OF SERVICE</p>
          <p className="text-sm text-[var(--muted)]">No operator can use this equipment until repaired and re-inspected.</p>
        </div>
      )}

      {!formData.out_of_service && (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Operator <span className="text-red-400">*</span></label>
            <select
              value={formData.operator_id}
              onChange={e => handleOperatorSelect(e.target.value)}
              className={`w-full h-12 px-4 rounded-xl bg-[var(--card)] border ${errors.operator ? 'border-red-500' : 'border-[var(--border)]'} appearance-none`}
            >
              <option value="">Select operator...</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {errors.operator && <p className="text-red-400 text-sm">{errors.operator}</p>}
          </div>

          {formData.operator_id && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${formData.operator_licensed ? 'bg-emerald-500/10 border border-emerald-500' : 'bg-red-500/10 border border-red-500'}`}>
                <div className="flex items-center justify-between">
                  <span>Operator Licensed/Certified?</span>
                  <span className={`font-bold ${formData.operator_licensed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formData.operator_licensed ? '✅ YES' : '❌ NO'}
                  </span>
                </div>
                {formData.operator_license_type && (
                  <p className="text-sm text-[var(--muted)] mt-1">License: {formData.operator_license_type}</p>
                )}
                {formData.operator_license_expiry && (
                  <p className="text-sm text-[var(--muted)]">Expires: {formData.operator_license_expiry}</p>
                )}
              </div>
              {errors.operator_license && <p className="text-red-400 text-sm">{errors.operator_license}</p>}

              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.operator_trained ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)]'}`}>
                <input
                  type="checkbox"
                  checked={formData.operator_trained}
                  onChange={e => updateField('operator_trained', e.target.checked)}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span>Operator trained on this specific equipment?</span>
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Step 6: Final Sign-off
  const renderStep6Signoff = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <h3 className="font-semibold text-emerald-400 mb-2">✅ Section G: Final Sign-off</h3>
      </div>

      {/* Overall Result */}
      <div className={`p-6 rounded-xl text-center ${
        calculatedResult === 'pass' ? 'bg-emerald-500/20 border-2 border-emerald-500'
        : calculatedResult === 'fail' ? 'bg-red-500/20 border-2 border-red-500'
        : 'bg-amber-500/20 border-2 border-amber-500'
      }`}>
        <p className="text-4xl font-bold mb-2">
          {calculatedResult === 'pass' ? '✅' : calculatedResult === 'fail' ? '🚫' : '⚠️'}
        </p>
        <p className={`text-2xl font-bold ${
          calculatedResult === 'pass' ? 'text-emerald-400'
          : calculatedResult === 'fail' ? 'text-red-400'
          : 'text-amber-400'
        }`}>
          {calculatedResult === 'pass' ? 'PASS - Safe to Use'
           : calculatedResult === 'fail' ? 'FAIL - Out of Service'
           : 'CONDITIONAL PASS - Monitor'}
        </p>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Equipment:</span>
          <span>{formData.equipment_type.replace(/_/g, ' ')} - {formData.equipment_serial}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Inspection #:</span>
          <span className="font-mono">{formData.inspection_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Checklist Items:</span>
          <span>{formData.checklist_items.filter(i => i.result === 'pass').length}/{formData.checklist_items.length} Pass</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Deficiencies:</span>
          <span>{formData.deficiencies.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Next Inspection Due:</span>
          <span>{formData.next_inspection_due}</span>
        </div>
      </div>

      {/* Inspector Signature */}
      <SignaturePad
        label="Inspector Signature"
        value={formData.inspector_signature}
        onSignatureChange={sig => {
          updateField('inspector_signature', sig?.data || '');
          if (sig) updateField('inspector_date', getCurrentDate());
        }}
        required
        error={errors.inspector_signature}
      />

      {/* Operator Signature (if not OOS) */}
      {!formData.out_of_service && (
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] mb-4">
            Operator Declaration: "I have reviewed this inspection and the equipment is safe to use."
          </p>
          <SignaturePad
            label="Operator Signature"
            value={formData.operator_signature}
            onSignatureChange={sig => updateField('operator_signature', sig?.data || '')}
            required
            error={errors.operator_signature}
          />
        </div>
      )}

      {/* COR Audit Info */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <p className="text-sm text-blue-400">
          📋 Tagged as COR audit evidence for <strong>{formData.audit_element}</strong>
        </p>
        <p className="text-xs text-[var(--muted)] mt-1">
          O. Reg. 213/91: Equipment must be inspected before use
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0Equipment();
      case 1: return renderStep1Checklist();
      case 2: return renderStep2Deficiencies();
      case 3: return renderStep3OOS();
      case 4: return renderStep4Maintenance();
      case 5: return renderStep5Operator();
      case 6: return renderStep6Signoff();
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
              {isSavingDraft ? 'Saving...' : '💾 Save'}
            </button>
          )}

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button type="button" onClick={handleNext} className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white font-semibold">
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 h-14 rounded-xl font-semibold text-white disabled:opacity-50 ${
                calculatedResult === 'pass' ? 'bg-emerald-500'
                : calculatedResult === 'fail' ? 'bg-red-500'
                : 'bg-amber-500'
              }`}
            >
              {isSubmitting ? '⟳ Submitting...' : calculatedResult === 'fail' ? '🚫 Submit OOS' : '✅ Complete'}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-[var(--muted)]">
          <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
          {failedItems.length > 0 && <span className="text-red-400">⚠️ {failedItems.length} failed items</span>}
        </div>
      </div>
    </div>
  );
}

export type { EquipmentInspectionFormProps };
