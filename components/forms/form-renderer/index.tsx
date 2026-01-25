'use client';

/**
 * FormRenderer Component
 * 
 * Dynamic form renderer that reads a form schema and renders
 * the appropriate field components. Handles validation, conditional
 * logic, and form submission.
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  FormTemplate,
  FormValues,
  FormContext,
  FieldDefinition,
} from '@/lib/forms/types';
import { isFieldVisible } from '@/lib/forms/schema-utils';
import { useFormTemplate } from '@/lib/forms/use-form-template';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Field Components
import { TextField } from './fields/text-field';
import { TextareaField } from './fields/textarea-field';
import { NumberField } from './fields/number-field';
import { SelectField } from './fields/select-field';
import { CheckboxGroupField } from './fields/checkbox-group-field';
import { RadioField } from './fields/radio-field';
import { DateField } from './fields/date-field';
import { TimeField } from './fields/time-field';
import { SignatureField } from './fields/signature-field';
import { PhotoField } from './fields/photo-field';
import { GPSField } from './fields/gps-field';
import { WeatherField } from './fields/weather-field';
import { TemperatureField } from './fields/temperature-field';
import { YesNoField } from './fields/yes-no-field';
import { ChecklistField } from './fields/checklist-field';
import { RatingField } from './fields/rating-field';
import { JobsiteSelectField } from './fields/jobsite-select-field';
import { WorkerSelectField } from './fields/worker-select-field';
import { InstructionsField } from './fields/instructions-field';
import { SectionField } from './fields/section-field';

// =============================================================================
// TYPES
// =============================================================================

interface FormRendererProps {
  /** Template ID or slug to load */
  templateIdOrSlug: string;
  /** Company ID for tenant isolation */
  companyId: string;
  /** Worker ID submitting the form */
  workerId?: string;
  /** Worker's display name */
  workerName?: string;
  /** Available jobsites */
  jobsites?: Array<{ id: string; name: string }>;
  /** Available workers */
  workers?: Array<{ id: string; first_name: string; last_name: string; position?: string }>;
  /** Optional initial values */
  initialValues?: Partial<FormValues>;
  /** Callback when form is successfully submitted */
  onSubmitSuccess?: (formId: string) => void;
  /** Callback when form submission fails */
  onSubmitError?: (error: string) => void;
  /** Callback when draft is saved */
  onDraftSaved?: (formId: string) => void;
  /** Optional class name */
  className?: string;
}

type ToastType = 'success' | 'info' | 'warning' | 'error';

// =============================================================================
// FIELD RENDERER
// =============================================================================

interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  error?: string;
  touched?: boolean;
  context: FormContext;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

function FieldRenderer({
  field,
  value,
  error,
  touched,
  context,
  onChange,
  onBlur,
}: FieldRendererProps) {
  const commonProps = {
    id: field.id,
    label: field.label,
    description: field.description,
    helpText: field.helpText,
    required: field.required,
    disabled: field.disabled,
    error: touched ? error : undefined,
    onChange,
    onBlur,
  };

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <TextField
          {...commonProps}
          value={(value as string) || ''}
          placeholder={field.placeholder}
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
        />
      );

    case 'textarea':
      return (
        <TextareaField
          {...commonProps}
          value={(value as string) || ''}
          placeholder={field.placeholder}
          rows={(field as { rows?: number }).rows}
        />
      );

    case 'number':
      return (
        <NumberField
          {...commonProps}
          value={value as number}
          min={(field as { min?: number }).min}
          max={(field as { max?: number }).max}
          step={(field as { step?: number }).step}
          unit={(field as { unit?: string }).unit}
        />
      );

    case 'select':
      return (
        <SelectField
          {...commonProps}
          value={(value as string) || ''}
          options={(field as { options: Array<{ value: string; label: string }> }).options || []}
          placeholder={field.placeholder || 'Select...'}
        />
      );

    case 'multiselect':
    case 'checkbox_group':
      return (
        <CheckboxGroupField
          {...commonProps}
          value={(value as string[]) || []}
          options={(field as { options: Array<{ value: string; label: string }> }).options || []}
        />
      );

    case 'radio':
      return (
        <RadioField
          {...commonProps}
          value={(value as string) || ''}
          options={(field as { options: Array<{ value: string; label: string }> }).options || []}
        />
      );

    case 'date':
      return (
        <DateField
          {...commonProps}
          value={(value as string) || ''}
        />
      );

    case 'time':
      return (
        <TimeField
          {...commonProps}
          value={(value as string) || ''}
        />
      );

    case 'signature':
      return (
        <SignatureField
          {...commonProps}
          value={(value as string) || ''}
        />
      );

    case 'photo':
      return (
        <PhotoField
          {...commonProps}
          value={(value as string[]) || []}
          multiple={(field as { multiple?: boolean }).multiple}
          maxCount={(field as { maxCount?: number }).maxCount}
        />
      );

    case 'gps':
      return (
        <GPSField
          {...commonProps}
          value={value as { lat: number; lng: number } | null}
          autoCapture={(field as { auto_capture?: boolean }).auto_capture}
        />
      );

    case 'weather':
      return (
        <WeatherField
          {...commonProps}
          value={(value as string) || ''}
        />
      );

    case 'temperature':
      return (
        <TemperatureField
          {...commonProps}
          value={value as number}
          unit={(field as { unit?: 'celsius' | 'fahrenheit' }).unit}
        />
      );

    case 'yes_no':
      return (
        <YesNoField
          {...commonProps}
          value={value as boolean | null}
        />
      );

    case 'yes_no_na':
      return (
        <YesNoField
          {...commonProps}
          value={value as boolean | null | 'na'}
          showNA
        />
      );

    case 'checklist':
      return (
        <ChecklistField
          {...commonProps}
          value={value as Array<{ id: string; result: string; notes?: string }> || []}
          items={(field as { items: Array<{ id: string; label: string }> }).items || []}
        />
      );

    case 'rating':
      return (
        <RatingField
          {...commonProps}
          value={(value as number) || 0}
          max={(field as { max?: number }).max || 5}
        />
      );

    case 'jobsite_select':
      return (
        <JobsiteSelectField
          {...commonProps}
          value={(value as string) || ''}
          jobsites={context.jobsites || []}
        />
      );

    case 'worker_select':
      return (
        <WorkerSelectField
          {...commonProps}
          value={(value as string) || ''}
          workers={context.workers || []}
        />
      );

    case 'instructions':
      return (
        <InstructionsField
          content={(field as { content?: string }).content || field.description || ''}
          variant={(field as { variant?: 'info' | 'warning' | 'danger' }).variant}
        />
      );

    case 'section':
      return (
        <SectionField
          title={field.label}
          description={field.description}
        />
      );

    default:
      // Fallback to text field for unsupported types
      return (
        <TextField
          {...commonProps}
          value={String(value || '')}
          placeholder={field.placeholder}
        />
      );
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FormRenderer({
  templateIdOrSlug,
  companyId,
  workerId,
  workerName,
  jobsites = [],
  workers = [],
  initialValues,
  onSubmitSuccess,
  onSubmitError,
  onDraftSaved,
  className,
}: FormRendererProps) {
  const { isOnline } = useNetworkStatus();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const form = useFormTemplate(templateIdOrSlug, {
    companyId,
    workerId,
    workerName,
    jobsites,
    workers,
    isOnline,
    initialValues,
    onSubmitSuccess: (formId) => {
      showToast('✅ Submitted - will sync when online', 'success');
      onSubmitSuccess?.(formId);
    },
    onSubmitError: (error) => {
      showToast(error, 'error');
      onSubmitError?.(error);
    },
    onDraftSaved: (formId) => {
      showToast('📝 Draft saved', 'info');
      onDraftSaved?.(formId);
    },
  });

  // ==========================================================================
  // TOAST
  // ==========================================================================

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ==========================================================================
  // DRAFT HANDLING
  // ==========================================================================

  useEffect(() => {
    // Check for existing draft on mount
    form.loadDraft().then((hasDraft) => {
      if (hasDraft) {
        setShowDraftBanner(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.template?.slug]);

  const handleRestoreDraft = useCallback(async () => {
    await form.loadDraft();
    setShowDraftBanner(false);
    showToast('Draft restored', 'info');
  }, [form, showToast]);

  const handleDiscardDraft = useCallback(async () => {
    await form.discardDraft();
    setShowDraftBanner(false);
  }, [form]);

  const handleSaveDraft = useCallback(async () => {
    setIsSavingDraft(true);
    await form.saveDraft();
    setIsSavingDraft(false);
  }, [form]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (form.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-[var(--muted)]">Loading form...</p>
        </div>
      </div>
    );
  }

  if (form.loadError || !form.template) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Failed to Load Form</h1>
          <p className="text-[var(--muted)]">{form.loadError || 'Template not found'}</p>
        </div>
      </div>
    );
  }

  const { template, values, errors, touched, context, isSubmitting, completion } = form;
  const visibleFields = template.schema.fields.filter((field) =>
    isFieldVisible(field, values)
  );

  // Group fields by section if sections are defined
  const sections = template.schema.sections || [];
  const fieldsBySection = new Map<string, FieldDefinition[]>();
  const unsectionedFields: FieldDefinition[] = [];

  if (sections.length > 0) {
    for (const section of sections) {
      fieldsBySection.set(
        section.id,
        section.fields
          .map((fieldId) => visibleFields.find((f) => f.id === fieldId))
          .filter((f): f is FieldDefinition => f !== undefined)
      );
    }
  } else {
    unsectionedFields.push(...visibleFields.sort((a, b) => (a.order || 0) - (b.order || 0)));
  }

  return (
    <div className={`min-h-screen bg-[var(--background)] pb-32 ${className || ''}`}>
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
      {showDraftBanner && form.lastSavedAt && (
        <div className="sticky top-12 z-40 bg-amber-500 text-black px-4 py-3">
          <p className="text-sm font-medium mb-2">
            Resume your draft?
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
        <div className="flex items-center gap-3">
          <span className="text-2xl">{template.icon}</span>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{template.name}</h1>
            {template.description && (
              <p className="text-sm text-[var(--muted)] mt-0.5">{template.description}</p>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {template.settings.show_progress !== false && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
              <span>Progress</span>
              <span>{completion}%</span>
            </div>
            <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Form Content */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.submitForm();
        }}
        className="px-4 py-6 space-y-8"
      >
        {/* Render by sections if defined */}
        {sections.length > 0
          ? sections.map((section) => {
              const sectionFields = fieldsBySection.get(section.id) || [];
              if (sectionFields.length === 0) return null;

              return (
                <div key={section.id} className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-2">
                    <h2 className="text-lg font-semibold">{section.title}</h2>
                    {section.description && (
                      <p className="text-sm text-[var(--muted)] mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <div className="space-y-6">
                    {sectionFields.map((field) => (
                      <FieldRenderer
                        key={field.id}
                        field={field}
                        value={values[field.id]}
                        error={errors[field.id]}
                        touched={touched[field.id]}
                        context={context}
                        onChange={(value) => form.setFieldValue(field.id, value)}
                        onBlur={() => {
                          form.setFieldTouched(field.id);
                          form.validateField(field.id);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          : // Render unsectioned fields
            unsectionedFields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={values[field.id]}
                error={errors[field.id]}
                touched={touched[field.id]}
                context={context}
                onChange={(value) => form.setFieldValue(field.id, value)}
                onBlur={() => {
                  form.setFieldTouched(field.id);
                  form.validateField(field.id);
                }}
              />
            ))}
      </form>

      {/* Sticky Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          {template.settings.allow_draft && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex-1 h-14 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] font-semibold text-base transition-colors hover:bg-[var(--background)] disabled:opacity-50"
            >
              {isSavingDraft ? 'Saving...' : '💾 Save Draft'}
            </button>
          )}
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              form.submitForm();
            }}
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

export { FormRenderer };
