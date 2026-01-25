'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  submitForm,
  saveDraft,
  loadDraft,
  deleteDraft,
  getCurrentGPS,
  createAutoSave,
  type HazardAssessmentFormData,
} from '@/lib/sync/form-submission';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORM_TYPE = 'hazard_assessment';

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear ☀️' },
  { value: 'rain', label: 'Rain 🌧️' },
  { value: 'snow', label: 'Snow ❄️' },
  { value: 'fog', label: 'Fog 🌫️' },
] as const;

const HAZARD_OPTIONS = [
  { value: 'slips_trips_falls', label: 'Slips/Trips/Falls' },
  { value: 'working_at_heights', label: 'Working at Heights' },
  { value: 'confined_spaces', label: 'Confined Spaces' },
  { value: 'electrical_hazards', label: 'Electrical Hazards' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'overhead_work', label: 'Overhead Work' },
  { value: 'excavation', label: 'Excavation' },
  { value: 'other', label: 'Other' },
] as const;

// =============================================================================
// TYPES
// =============================================================================

interface HazardAssessmentFormProps {
  /** Company ID for tenant isolation */
  companyId: string;
  /** Worker ID submitting the form */
  workerId: string | null;
  /** Available jobsites to select from */
  jobsites: Array<{ id: string; name: string }>;
  /** Callback when form is successfully submitted */
  onSubmitSuccess?: (formId: string) => void;
  /** Callback when draft is saved */
  onDraftSaved?: (formId: string) => void;
}

interface FormErrors {
  jobsite_id?: string;
  hazards?: string;
  controls?: string;
  worker_signature?: string;
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
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HazardAssessmentForm({
  companyId,
  workerId,
  jobsites,
  onSubmitSuccess,
  onDraftSaved,
}: HazardAssessmentFormProps) {
  const { isOnline } = useNetworkStatus();

  // Form state
  const [formData, setFormData] = useState<HazardAssessmentFormData>({
    jobsite_id: '',
    date: getCurrentDate(),
    time: getCurrentTime(),
    weather: 'clear',
    temperature: 20,
    hazards: [],
    controls: {},
    notes: '',
    worker_signature: '',
    supervisor_signature: '',
    photos: [],
    gps_coordinates: null,
    status: 'draft',
  });

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ formId: string; updatedAt: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [otherHazard, setOtherHazard] = useState('');

  // Refs
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave<HazardAssessmentFormData>> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ==========================================================================
  // TOAST MANAGEMENT
  // ==========================================================================

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ==========================================================================
  // GPS CAPTURE
  // ==========================================================================

  useEffect(() => {
    getCurrentGPS().then((coords) => {
      if (coords) {
        setFormData((prev) => ({ ...prev, gps_coordinates: coords }));
      }
    });
  }, []);

  // ==========================================================================
  // DRAFT MANAGEMENT
  // ==========================================================================

  // Check for existing draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      const draft = await loadDraft<HazardAssessmentFormData>(FORM_TYPE, companyId);
      if (draft) {
        setDraftInfo({ formId: draft.formId, updatedAt: draft.updatedAt });
        setShowDraftBanner(true);
      }
    };
    checkDraft();
  }, [companyId]);

  // Initialize auto-save
  useEffect(() => {
    autoSaveRef.current = createAutoSave<HazardAssessmentFormData>(
      FORM_TYPE,
      { companyId, workerId, formType: FORM_TYPE },
      30000 // 30 seconds
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

  const handleRestoreDraft = async () => {
    if (draftInfo) {
      const draft = await loadDraft<HazardAssessmentFormData>(FORM_TYPE, companyId);
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

  const updateField = <K extends keyof HazardAssessmentFormData>(
    field: K,
    value: HazardAssessmentFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleHazardToggle = (hazard: string) => {
    setFormData((prev) => {
      const newHazards = prev.hazards.includes(hazard)
        ? prev.hazards.filter((h) => h !== hazard)
        : [...prev.hazards, hazard];

      // Also remove control if hazard is unchecked
      const newControls = { ...prev.controls };
      if (!newHazards.includes(hazard)) {
        delete newControls[hazard];
      }

      return { ...prev, hazards: newHazards, controls: newControls };
    });

    if (errors.hazards) {
      setErrors((prev) => ({ ...prev, hazards: undefined }));
    }
  };

  const handleControlChange = (hazard: string, control: string) => {
    setFormData((prev) => ({
      ...prev,
      controls: { ...prev.controls, [hazard]: control },
    }));
    if (errors.controls) {
      setErrors((prev) => ({ ...prev, controls: undefined }));
    }
  };

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.jobsite_id) {
      newErrors.jobsite_id = 'Please select a jobsite';
    }

    if (formData.hazards.length === 0) {
      newErrors.hazards = 'Please identify at least one hazard';
    }

    // Check that each hazard has a control
    const missingControls = formData.hazards.filter(
      (h) => !formData.controls[h] || formData.controls[h].trim() === ''
    );
    if (missingControls.length > 0) {
      newErrors.controls = 'Please describe controls for all identified hazards';
    }

    if (!formData.worker_signature) {
      newErrors.worker_signature = 'Worker signature is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      showToast('📝 Draft saved locally', 'info');
      onDraftSaved?.(result.formId);
    } else {
      showToast('Failed to save draft', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorField);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    // Stop auto-save during submission
    autoSaveRef.current?.stop();

    const result = await submitForm(FORM_TYPE, { ...formData, status: 'submitted' }, {
      companyId,
      workerId,
      formType: FORM_TYPE,
      priority: 2,
    });

    setIsSubmitting(false);

    if (result.success && result.formId) {
      showToast('✅ Submitted - will sync when online', 'success');
      onSubmitSuccess?.(result.formId);
    } else {
      showToast(result.error || 'Submission failed', 'error');
      // Restart auto-save on failure
      autoSaveRef.current?.start(formData);
    }
  };

  // ==========================================================================
  // RENDER
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
        <div className="sticky top-12 z-40 bg-amber-500 text-black px-4 py-3">
          <p className="text-sm font-medium mb-2">
            Resume your draft from {formatRelativeTime(draftInfo.updatedAt)}?
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

      {/* Form Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-xl font-bold text-center">Hazard Assessment</h1>
        <p className="text-sm text-[var(--muted)] text-center mt-1">
          COR Element 3 - Hazard Identification
        </p>
      </header>

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        {/* Jobsite Selector */}
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
            style={{ WebkitAppearance: 'none' }}
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

        {/* Date & Time (readonly) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="date" className="block text-sm font-medium">
              Date
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
            <label htmlFor="time" className="block text-sm font-medium">
              Time
            </label>
            <input
              id="time"
              type="time"
              value={formData.time}
              readOnly
              className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base opacity-70"
            />
          </div>
        </div>

        {/* Weather Conditions */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Weather Conditions</legend>
          <div className="grid grid-cols-2 gap-3">
            {WEATHER_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all ${
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
                  onChange={(e) => updateField('weather', e.target.value as typeof formData.weather)}
                  className="sr-only"
                />
                <span className="text-base font-medium">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Temperature */}
        <div className="space-y-2">
          <label htmlFor="temperature" className="block text-sm font-medium">
            Temperature (°C)
          </label>
          <input
            id="temperature"
            type="number"
            value={formData.temperature}
            onChange={(e) => updateField('temperature', parseInt(e.target.value) || 0)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
            min="-50"
            max="50"
          />
        </div>

        {/* Hazards Identified */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            Hazards Identified <span className="text-red-400">*</span>
          </legend>
          {errors.hazards && (
            <p className="text-red-400 text-sm">{errors.hazards}</p>
          )}
          <div className="space-y-2">
            {HAZARD_OPTIONS.map((hazard) => (
              <label
                key={hazard.value}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.hazards.includes(hazard.value)
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.hazards.includes(hazard.value)}
                  onChange={() => handleHazardToggle(hazard.value)}
                  className="w-6 h-6 rounded border-2 border-[var(--border)] accent-[var(--primary)]"
                />
                <span className="text-base font-medium">{hazard.label}</span>
              </label>
            ))}
          </div>

          {/* Other hazard text input */}
          {formData.hazards.includes('other') && (
            <div className="mt-3 pl-9">
              <input
                type="text"
                placeholder="Describe other hazard..."
                value={otherHazard}
                onChange={(e) => setOtherHazard(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base"
              />
            </div>
          )}
        </fieldset>

        {/* Controls for each hazard */}
        {formData.hazards.length > 0 && (
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium">
              Controls Implemented <span className="text-red-400">*</span>
            </legend>
            {errors.controls && (
              <p className="text-red-400 text-sm">{errors.controls}</p>
            )}
            {formData.hazards.map((hazardValue) => {
              const hazardLabel =
                HAZARD_OPTIONS.find((h) => h.value === hazardValue)?.label || hazardValue;
              return (
                <div key={hazardValue} className="space-y-2">
                  <label
                    htmlFor={`control_${hazardValue}`}
                    className="block text-sm text-[var(--muted)]"
                  >
                    Controls for: <span className="text-[var(--foreground)]">{hazardLabel}</span>
                  </label>
                  <textarea
                    id={`control_${hazardValue}`}
                    value={formData.controls[hazardValue] || ''}
                    onChange={(e) => handleControlChange(hazardValue, e.target.value)}
                    placeholder="Describe the control measures..."
                    rows={3}
                    className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
                  />
                </div>
              );
            })}
          </fieldset>
        )}

        {/* Additional Notes */}
        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium">
            Additional Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Any additional observations or comments..."
            rows={4}
            className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-base resize-none"
          />
        </div>

        {/* Worker Signature Placeholder */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Worker Signature <span className="text-red-400">*</span>
          </label>
          <div
            className={`h-32 rounded-xl border-2 border-dashed flex items-center justify-center ${
              errors.worker_signature ? 'border-red-500' : 'border-[var(--border)]'
            } bg-[var(--card)]`}
          >
            {formData.worker_signature ? (
              <div className="text-center">
                <span className="text-emerald-400 text-2xl">✓</span>
                <p className="text-sm text-[var(--muted)] mt-1">Signature captured</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // TODO: Open signature pad modal
                  // For now, simulate signature
                  updateField('worker_signature', 'signature_placeholder_base64');
                }}
                className="text-[var(--primary)] font-medium"
              >
                Tap to sign
              </button>
            )}
          </div>
          {errors.worker_signature && (
            <p className="text-red-400 text-sm">{errors.worker_signature}</p>
          )}
        </div>

        {/* Supervisor Signature Placeholder (Optional) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Supervisor Signature <span className="text-[var(--muted)]">(optional)</span>
          </label>
          <div className="h-32 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] flex items-center justify-center">
            {formData.supervisor_signature ? (
              <div className="text-center">
                <span className="text-emerald-400 text-2xl">✓</span>
                <p className="text-sm text-[var(--muted)] mt-1">Signature captured</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // TODO: Open signature pad modal
                  updateField('supervisor_signature', 'signature_placeholder_base64');
                }}
                className="text-[var(--muted)] font-medium"
              >
                Tap to sign (optional)
              </button>
            )}
          </div>
        </div>

        {/* Photos Placeholder */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Photos <span className="text-[var(--muted)]">(optional)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {formData.photos.map((photo, index) => (
              <div
                key={index}
                className="aspect-square rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-hidden relative"
              >
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      photos: prev.photos.filter((_, i) => i !== index),
                    }));
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full text-white text-sm flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                // TODO: Open camera or file picker
                console.log('Open camera');
              }}
              className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] flex flex-col items-center justify-center text-[var(--muted)]"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs mt-1">Add Photo</span>
            </button>
          </div>
        </div>

        {/* GPS Coordinates (readonly) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">GPS Coordinates</label>
          <div className="h-12 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center text-sm text-[var(--muted)]">
            {formData.gps_coordinates ? (
              <>
                📍 {formData.gps_coordinates.lat.toFixed(6)}, {formData.gps_coordinates.lng.toFixed(6)}
              </>
            ) : (
              <>📍 Acquiring location...</>
            )}
          </div>
        </div>
      </form>

      {/* Sticky Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold text-base transition-colors hover:bg-[var(--background)] disabled:opacity-50"
          >
            {isSavingDraft ? 'Saving...' : '💾 Save Draft'}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white font-semibold text-base transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span> Submitting...
              </span>
            ) : (
              '✅ Submit'
            )}
          </button>
        </div>

        {/* Network status indicator */}
        <p className="text-xs text-center text-[var(--muted)] mt-2">
          {isOnline ? '🟢 Online' : '🔴 Offline'} • Form will sync automatically
        </p>
      </div>

    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { HazardAssessmentFormProps };
