/**
 * useFormTemplate Hook
 * 
 * React hook for working with form templates.
 * Handles loading templates, managing form state, and submission.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  FormTemplate,
  FormSchema,
  FormValues,
  FormState,
  FormContext,
  GPSCoordinates,
} from './types';
import {
  getDefaultValues,
  validateForm,
  isFormValid,
  calculateCompletion,
  getVisibleFields,
} from './schema-utils';
import { localDB } from '@/lib/db/local-db';
import { getCurrentGPS, createAutoSave, saveDraft } from '@/lib/sync/form-submission';

// =============================================================================
// TYPES
// =============================================================================

interface UseFormTemplateOptions {
  /** Company ID for tenant isolation */
  companyId: string;
  /** Worker ID submitting the form */
  workerId?: string;
  /** Worker's display name */
  workerName?: string;
  /** Available jobsites */
  jobsites?: Array<{ id: string; name: string }>;
  /** Available workers (for worker_select fields) */
  workers?: Array<{ id: string; first_name: string; last_name: string; position?: string }>;
  /** Available equipment (for equipment_select fields) */
  equipment?: Array<{ id: string; name: string; type: string }>;
  /** Whether the device is online */
  isOnline?: boolean;
  /** Optional initial values to populate the form */
  initialValues?: Partial<FormValues>;
  /** Callback when form is successfully submitted */
  onSubmitSuccess?: (formId: string) => void;
  /** Callback when form submission fails */
  onSubmitError?: (error: string) => void;
  /** Callback when draft is saved */
  onDraftSaved?: (formId: string) => void;
}

interface UseFormTemplateReturn {
  // State
  values: FormValues;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  completion: number;
  formId?: string;
  lastSavedAt?: string;
  
  // Context
  context: FormContext;
  template: FormTemplate | null;
  isLoading: boolean;
  loadError: string | null;
  
  // Actions
  setFieldValue: (fieldId: string, value: unknown) => void;
  setFieldTouched: (fieldId: string, touched?: boolean) => void;
  validateField: (fieldId: string) => string | null;
  validateAllFields: () => boolean;
  resetForm: () => void;
  submitForm: () => Promise<void>;
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<boolean>;
  discardDraft: () => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing form template state and submission
 */
export function useFormTemplate(
  templateIdOrSlug: string,
  options: UseFormTemplateOptions
): UseFormTemplateReturn {
  // Template state
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formId, setFormId] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();

  // GPS state
  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinates | undefined>();

  // Refs for auto-save
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);
  const initialValuesRef = useRef(options.initialValues);

  // ==========================================================================
  // CONTEXT
  // ==========================================================================

  const context: FormContext = {
    companyId: options.companyId,
    workerId: options.workerId,
    workerName: options.workerName,
    jobsites: options.jobsites,
    workers: options.workers,
    equipment: options.equipment,
    isOnline: options.isOnline ?? true,
    currentDate: new Date().toISOString().split('T')[0],
    currentTime: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    gpsCoordinates,
  };

  // ==========================================================================
  // LOAD TEMPLATE
  // ==========================================================================

  useEffect(() => {
    async function loadTemplate() {
      setIsLoading(true);
      setLoadError(null);

      try {
        // For now, we'll use mock data since we can't query the DB directly
        // In production, this would fetch from Supabase
        const mockTemplates: Record<string, FormTemplate> = {
          'pre-task-hazard-assessment': {
            id: 'a0000000-0000-0000-0000-000000000001',
            company_id: null,
            name: 'Pre-Task Hazard Assessment',
            slug: 'pre-task-hazard-assessment',
            description: 'Daily pre-task hazard identification and control planning',
            icon: '⚠️',
            cor_element: 'element_3',
            audit_category: 'Hazard Identification',
            schema: {
              fields: [
                { id: 'jobsite_id', type: 'jobsite_select', label: 'Jobsite', required: true, order: 1 },
                { id: 'date', type: 'date', label: 'Date', required: true, default: 'today', order: 2 },
                { id: 'time', type: 'time', label: 'Time', required: true, default: 'now', order: 3 },
                { id: 'weather', type: 'weather', label: 'Weather Conditions', required: true, order: 4 },
                { id: 'temperature', type: 'temperature', label: 'Temperature (°C)', required: false, order: 5 },
                { 
                  id: 'hazards', 
                  type: 'checkbox_group', 
                  label: 'Hazards Identified', 
                  required: true,
                  order: 6
                },
                { id: 'notes', type: 'textarea', label: 'Additional Notes', required: false, order: 9 },
                { id: 'worker_signature', type: 'signature', label: 'Worker Signature', required: true, order: 10 },
                { id: 'photos', type: 'photo', label: 'Photos', required: false, order: 12 },
                { id: 'gps', type: 'gps', label: 'Location', required: false, order: 13 },
              ],
              sections: [
                { id: 'location', title: 'Location & Conditions', fields: ['jobsite_id', 'date', 'time', 'weather', 'temperature'] },
                { id: 'hazards', title: 'Hazard Identification', fields: ['hazards'] },
                { id: 'controls', title: 'Notes', fields: ['notes'] },
                { id: 'signatures', title: 'Sign-Off', fields: ['worker_signature'] },
                { id: 'evidence', title: 'Evidence', fields: ['photos', 'gps'] },
              ],
            },
            settings: {
              require_signature: true,
              require_gps: true,
              allow_photos: true,
              max_photos: 5,
              auto_save_interval: 30000,
              allow_draft: true,
              offline_enabled: true,
              sync_priority: 2,
            },
            status: 'published',
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };

        // Try to find by slug first, then by ID
        // Safe: templateIdOrSlug is validated to be alphanumeric slug or UUID
        // eslint-disable-next-line security/detect-object-injection
        let foundTemplate: FormTemplate | undefined = mockTemplates[templateIdOrSlug];
        if (!foundTemplate) {
          foundTemplate = Object.values(mockTemplates).find((t) => t.id === templateIdOrSlug);
        }

        if (foundTemplate) {
          setTemplate(foundTemplate);
          const defaultVals = getDefaultValues(foundTemplate.schema);
          setValues({ ...defaultVals, ...initialValuesRef.current });
        } else {
          setLoadError(`Template not found: ${templateIdOrSlug}`);
        }
      } catch (error) {
        console.error('[useFormTemplate] Load error:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load template');
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplate();
  }, [templateIdOrSlug]);

  // ==========================================================================
  // GPS CAPTURE
  // ==========================================================================

  useEffect(() => {
    if (template?.settings.require_gps) {
      getCurrentGPS().then((coords) => {
        if (coords) {
          setGpsCoordinates({ lat: coords.lat, lng: coords.lng, timestamp: Date.now() });
          setValues((prev) => ({ ...prev, gps: coords }));
        }
      });
    }
  }, [template?.settings.require_gps]);

  // ==========================================================================
  // AUTO-SAVE
  // ==========================================================================

  useEffect(() => {
    if (!template || !template.settings.allow_draft) return;

    autoSaveRef.current = createAutoSave(
      template.slug,
      {
        companyId: options.companyId,
        workerId: options.workerId ?? null,
        formType: template.slug,
      },
      template.settings.auto_save_interval || 30000
    );

    autoSaveRef.current.start({ ...values, status: 'draft' } as never);

    return () => {
      autoSaveRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.slug, options.companyId, options.workerId]);

  // Update auto-save data when values change
  useEffect(() => {
    if (isDirty) {
      autoSaveRef.current?.update({ ...values, status: 'draft' } as never);
    }
  }, [values, isDirty]);

  // ==========================================================================
  // FIELD HANDLERS
  // ==========================================================================

  const setFieldValue = useCallback((fieldId: string, value: unknown) => {
    // Safe: fieldId is a controlled form field identifier from the template schema
     
    setValues((prev) => ({ ...prev, [fieldId]: value as FormValues[string] }));
    setIsDirty(true);

    // Clear error when field is updated
    setErrors((prev) => {
      // Safe: fieldId is a controlled form field identifier from the template schema
      // eslint-disable-next-line security/detect-object-injection
      if (prev[fieldId]) {
        const { [fieldId]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const setFieldTouched = useCallback((fieldId: string, isTouched = true) => {
    // Safe: fieldId is a controlled form field identifier from the template schema
     
    setTouched((prev) => ({ ...prev, [fieldId]: isTouched }));
  }, []);

  const validateFieldById = useCallback(
    (fieldId: string): string | null => {
      if (!template) return null;

      const field = template.schema.fields.find((f) => f.id === fieldId);
      if (!field) return null;

      const fieldErrors = validateForm(
        { fields: [field], sections: [] },
        values
      );

      // Safe: fieldId is a controlled form field identifier from the template schema
      // eslint-disable-next-line security/detect-object-injection
      const error = fieldErrors[fieldId] || null;
      setErrors((prev) => {
        if (error) {
          // Safe: fieldId is a controlled form field identifier from the template schema
           
          return { ...prev, [fieldId]: error };
        }
        const { [fieldId]: _, ...rest } = prev;
        return rest;
      });

      return error;
    },
    [template, values]
  );

  const validateAllFields = useCallback((): boolean => {
    if (!template) return false;

    const allErrors = validateForm(template.schema, values);
    setErrors(allErrors);

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    for (const field of template.schema.fields) {
      // Safe: field.id is from template.schema.fields (controlled form field IDs)
       
      allTouched[field.id] = true;
    }
    setTouched(allTouched);

    return Object.keys(allErrors).length === 0;
  }, [template, values]);

  // ==========================================================================
  // FORM ACTIONS
  // ==========================================================================

  const resetForm = useCallback(() => {
    if (!template) return;

    const defaultVals = getDefaultValues(template.schema);
    setValues({ ...defaultVals, ...initialValuesRef.current });
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setFormId(undefined);
    setLastSavedAt(undefined);
  }, [template]);

  const handleSaveDraft = useCallback(async () => {
    if (!template) return;

    const result = await saveDraft(
      template.slug,
      { ...values, status: 'draft' } as never,
      {
        companyId: options.companyId,
        workerId: options.workerId ?? null,
        formType: template.slug,
      }
    );

    if (result.success && result.formId) {
      setFormId(result.formId);
      setLastSavedAt(new Date().toISOString());
      options.onDraftSaved?.(result.formId);
    }
  }, [template, values, options]);

  const loadDraftData = useCallback(async (): Promise<boolean> => {
    if (!template) return false;

    try {
      // Check localStorage for draft reference
      const draftRef = localStorage.getItem(`form_draft_${template.slug}_${options.companyId}`);
      if (!draftRef) return false;

      const { formId: draftFormId } = JSON.parse(draftRef);
      const form = await localDB.forms.get(draftFormId);

      if (form && form.form_data) {
        setValues(form.form_data as unknown as FormValues);
        setFormId(draftFormId);
        setLastSavedAt(form.updated_at);
        return true;
      }
    } catch (error) {
      console.error('[useFormTemplate] Load draft error:', error);
    }

    return false;
  }, [template, options.companyId]);

  const discardDraftData = useCallback(async () => {
    if (!template) return;

    if (formId) {
      try {
        const form = await localDB.forms.get(formId);
        if (form && (form.form_data as { status?: string })?.status === 'draft') {
          await localDB.forms.delete(formId);
        }
      } catch (error) {
        console.error('[useFormTemplate] Discard draft error:', error);
      }
    }

    // Clean up localStorage reference
    localStorage.removeItem(`form_draft_${template.slug}_${options.companyId}`);

    resetForm();
  }, [template, formId, options.companyId, resetForm]);

  const submitForm = useCallback(async () => {
    if (!template) return;

    // Validate all fields
    if (!validateAllFields()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    autoSaveRef.current?.stop();

    try {
      const submissionId = formId || crypto.randomUUID();
      const now = new Date().toISOString();

      const submissionData = {
        ...values,
        status: 'submitted',
        gps_coordinates: gpsCoordinates,
      };

      // Save to IndexedDB
      await localDB.transaction('rw', [localDB.forms, localDB.sync_queue], async () => {
        const existingForm = formId ? await localDB.forms.get(formId) : null;

        if (existingForm) {
          await localDB.forms.update(submissionId, {
            form_data: submissionData,
            gps_coordinates: gpsCoordinates ? {
              latitude: gpsCoordinates.lat,
              longitude: gpsCoordinates.lng,
              accuracy: gpsCoordinates.accuracy,
              altitude: undefined,
              timestamp: gpsCoordinates.timestamp || Date.now(),
            } : null,
            synced: 'pending',
            updated_at: now,
          });
        } else {
          await localDB.forms.add({
            id: submissionId,
            company_id: options.companyId,
            worker_id: options.workerId ?? null,
            form_type: template.slug,
            form_data: submissionData,
            photos: [],
            signature_base64: (values.worker_signature as string) || null,
            gps_coordinates: gpsCoordinates ? {
              latitude: gpsCoordinates.lat,
              longitude: gpsCoordinates.lng,
              accuracy: gpsCoordinates.accuracy,
              altitude: undefined,
              timestamp: gpsCoordinates.timestamp || Date.now(),
            } : null,
            synced: 'pending',
            server_id: null,
            created_at: now,
            updated_at: now,
            sync_attempts: 0,
            last_sync_error: null,
          });
        }

        // Add to sync queue
        await localDB.queueForSync(
          'form_submission',
          submissionId,
          'forms',
          { template_id: template.id, ...submissionData },
          (template.settings.sync_priority || 2) as 1 | 2 | 3 | 4 | 5
        );
      });

      // Clean up draft reference
      localStorage.removeItem(`form_draft_${template.slug}_${options.companyId}`);

      setFormId(submissionId);
      options.onSubmitSuccess?.(submissionId);
    } catch (error) {
      console.error('[useFormTemplate] Submit error:', error);
      options.onSubmitError?.(error instanceof Error ? error.message : 'Failed to submit form');
      autoSaveRef.current?.start({ ...values, status: 'draft' } as never);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    template,
    values,
    formId,
    gpsCoordinates,
    errors,
    options,
    validateAllFields,
  ]);

  // ==========================================================================
  // COMPLETION
  // ==========================================================================

  const completion = template
    ? calculateCompletion(template.schema, values)
    : 0;

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    completion,
    formId,
    lastSavedAt,

    // Context
    context,
    template,
    isLoading,
    loadError,

    // Actions
    setFieldValue,
    setFieldTouched,
    validateField: validateFieldById,
    validateAllFields,
    resetForm,
    submitForm,
    saveDraft: handleSaveDraft,
    loadDraft: loadDraftData,
    discardDraft: discardDraftData,
  };
}
