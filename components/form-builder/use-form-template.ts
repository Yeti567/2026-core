'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FormTemplate,
  FormSection,
  FormField,
  FormValues,
  FormContext,
  Worker,
  Jobsite,
  Equipment,
  Hazard,
  Task,
} from './types';
import {
  initializeFormValues,
  createFieldIdToCodeMap,
  validateForm,
  isFormValid,
  calculateCompletionPercentage,
  getVisibleSections,
  sortSections,
  sortFields,
} from './utils';

interface UseFormTemplateOptions {
  formTemplateId: string;
  companyId: string;
  userId?: string;
  initialData?: Record<string, unknown>;
  autoSaveInterval?: number; // ms, 0 to disable
  onAutoSave?: (values: FormValues) => Promise<void>;
}

interface UseFormTemplateReturn {
  // Template data
  template: FormTemplate | null;
  sections: FormSection[];
  fields: FormField[];
  isLoading: boolean;
  error: string | null;
  
  // Form state
  values: FormValues;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isSubmitting: boolean;
  
  // Progress
  completionPercentage: number;
  currentStep: number;
  totalSteps: number;
  
  // Context data
  context: FormContext;
  
  // Maps
  fieldIdToCodeMap: Map<string, string>;
  
  // Actions
  setValue: (fieldCode: string, value: unknown) => void;
  setTouched: (fieldCode: string) => void;
  setValues: (values: FormValues) => void;
  validate: () => boolean;
  validateField: (fieldCode: string) => string | null;
  reset: () => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  
  // Visibility
  getVisibleSections: () => FormSection[];
  getVisibleFields: (sectionId: string) => FormField[];
  isFieldVisible: (field: FormField) => boolean;
  isSectionVisible: (section: FormSection) => boolean;
}

export function useFormTemplate({
  formTemplateId,
  companyId,
  userId,
  initialData,
  autoSaveInterval = 30000,
  onAutoSave,
}: UseFormTemplateOptions): UseFormTemplateReturn {
  const supabase = createClient();
  
  // Template state
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Context data
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobsites, setJobsites] = useState<Jobsite[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  
  // Form state
  const [values, setValuesState] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [initialValues, setInitialValues] = useState<FormValues>({});
  const [isSubmitting, setSubmitting] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  
  // Create field ID to code map
  const fieldIdToCodeMap = useMemo(() => createFieldIdToCodeMap(fields), [fields]);
  
  // Calculate derived state
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);
  
  const completionPercentage = useMemo(() => {
    return calculateCompletionPercentage(fields, values, fieldIdToCodeMap);
  }, [fields, values, fieldIdToCodeMap]);
  
  const totalSteps = useMemo(() => {
    const visibleSections = sections.filter(s => {
      const logic = s.conditional_logic;
      if (!logic) return true;
      const fieldCode = fieldIdToCodeMap.get(logic.field_id) || logic.field_id;
      // Safe: fieldCode is from fieldIdToCodeMap or logic.field_id
      // eslint-disable-next-line security/detect-object-injection
      const fieldValue = values[fieldCode];
      return logic.operator === 'equals' ? fieldValue === logic.value : fieldValue !== logic.value;
    });
    return visibleSections.length;
  }, [sections, values, fieldIdToCodeMap]);
  
  // Load template from database
   
  useEffect(() => {
    async function loadTemplate() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load form template with sections and fields
        const { data: templateData, error: templateError } = await supabase
          .from('form_templates')
          .select(`
            *,
            form_sections (
              *,
              form_fields (*)
            ),
            form_workflows (*)
          `)
          .eq('id', formTemplateId)
          .single();
        
        if (templateError) throw templateError;
        if (!templateData) throw new Error('Form template not found');
        
        // Sort sections and fields
        const sortedSections = sortSections(templateData.form_sections || []);
        const allFields: FormField[] = [];
        
        for (const section of sortedSections) {
          section.form_fields = sortFields(section.form_fields || []);
          allFields.push(...section.form_fields);
        }
        
        setTemplate(templateData);
        setSections(sortedSections);
        setFields(allFields);
        
        // Initialize form values
        const defaultValues = initializeFormValues(allFields);
        const mergedValues = { ...defaultValues, ...(initialData || {}) };
        setValuesState(mergedValues as FormValues);
        setInitialValues(mergedValues as FormValues);
        
      } catch (err) {
        console.error('Failed to load form template:', err);
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialData only used for initial merge, not re-fetching
  }, [formTemplateId, supabase]);
  
  // Load context data (workers, jobsites, equipment, hazards, tasks)
  useEffect(() => {
    async function loadContextData() {
      try {
        // Load workers
        const { data: workersData } = await supabase
          .from('workers')
          .select('id, first_name, last_name, position, email')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('last_name');
        
        if (workersData) setWorkers(workersData);
        
        // Load jobsites
        const { data: jobsitesData } = await supabase
          .from('jobsites')
          .select('id, name, address, is_active')
          .eq('company_id', companyId)
          .order('name');
        
        if (jobsitesData) setJobsites(jobsitesData);
        
        // Load equipment
        const { data: equipmentData } = await supabase
          .from('equipment_inventory')
          .select('id, name, equipment_type, serial_number')
          .eq('company_id', companyId)
          .order('name');
        
        if (equipmentData) {
          setEquipment(equipmentData.map(e => ({
            id: e.id,
            name: e.name,
            type: e.equipment_type,
            serial_number: e.serial_number,
          })));
        }
        
        // Load hazards (global + company-specific)
        const { data: hazardsData } = await supabase
          .from('hazard_library')
          .select('*')
          .or(`company_id.is.null,company_id.eq.${companyId}`)
          .eq('is_active', true)
          .order('category')
          .order('name');
        
        if (hazardsData) setHazards(hazardsData as Hazard[]);
        
        // Load tasks (global + company-specific)
        const { data: tasksData } = await supabase
          .from('job_task_library')
          .select('*')
          .or(`company_id.is.null,company_id.eq.${companyId}`)
          .eq('is_active', true)
          .order('category')
          .order('name');
        
        if (tasksData) {
          setTasks(tasksData.map(t => ({
            ...t,
            hazards: t.typical_hazards || [],
            procedure_steps: t.procedure_steps || [],
            required_equipment: t.required_equipment || [],
            required_certifications: t.required_certifications || [],
            ppe_required: t.ppe_required || [],
          })) as Task[]);
        }
        
      } catch (err) {
        console.error('Failed to load context data:', err);
      }
    }
    
    loadContextData();
  }, [companyId, supabase]);
  
  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Auto-save
  useEffect(() => {
    if (!autoSaveInterval || !onAutoSave || !isDirty) return;
    
    const timer = setInterval(() => {
      if (isDirty) {
        onAutoSave(values);
      }
    }, autoSaveInterval);
    
    return () => clearInterval(timer);
  }, [autoSaveInterval, onAutoSave, isDirty, values]);
  
  // Actions
  const setValue = useCallback((fieldCode: string, value: unknown) => {
    setValuesState((prev) => ({ ...prev, [fieldCode]: value as any } as FormValues));
  }, []);
  
  const setTouched = useCallback((fieldCode: string) => {
    setTouchedState(prev => ({ ...prev, [fieldCode]: true }));
  }, []);
  
  const setValues = useCallback((newValues: FormValues) => {
    setValuesState(newValues);
  }, []);
  
  const validateSingleField = useCallback((fieldCode: string): string | null => {
    const field = fields.find(f => f.field_code === fieldCode);
    if (!field) return null;
    
    // Import validation function
    const rules = field.validation_rules || {};
    // Safe: fieldCode is from field definition matching
    // eslint-disable-next-line security/detect-object-injection
    const value = values[fieldCode];
    
    if (rules.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return rules.custom_message || `${field.label} is required`;
    }
    
    return null;
  }, [fields, values]);
  
  const validate = useCallback((): boolean => {
    const newErrors = validateForm(fields, values, fieldIdToCodeMap);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, values, fieldIdToCodeMap]);
  
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouchedState({});
    setCurrentStep(0);
  }, [initialValues]);
  
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);
  
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);
  
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  // Visibility helpers
  const getVisibleSectionsForForm = useCallback((): FormSection[] => {
    return getVisibleSections(sections, values, fieldIdToCodeMap);
  }, [sections, values, fieldIdToCodeMap]);
  
  const getVisibleFieldsForSection = useCallback((sectionId: string): FormField[] => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.form_fields) return [];
    
    return section.form_fields.filter(field => {
      if (!field.conditional_logic) return true;
      const { field_id, operator, value: condValue } = field.conditional_logic;
      const fieldCode = fieldIdToCodeMap.get(field_id) || field_id;
      // Safe: fieldCode is from fieldIdToCodeMap or field_id
      // eslint-disable-next-line security/detect-object-injection
      const fieldValue = values[fieldCode];
      
      switch (operator) {
        case 'equals':
          return fieldValue === condValue;
        case 'not_equals':
          return fieldValue !== condValue;
        case 'contains':
          return String(fieldValue).includes(String(condValue));
        case 'is_empty':
          return !fieldValue;
        case 'is_not_empty':
          return !!fieldValue;
        default:
          return true;
      }
    });
  }, [sections, values, fieldIdToCodeMap]);
  
  const isFieldVisible = useCallback((field: FormField): boolean => {
    if (!field.conditional_logic) return true;
    const { field_id, operator, value: condValue } = field.conditional_logic;
    const fieldCode = fieldIdToCodeMap.get(field_id) || field_id;
    // Safe: fieldCode is from fieldIdToCodeMap or field_id
    // eslint-disable-next-line security/detect-object-injection
    const fieldValue = values[fieldCode];
    
    switch (operator) {
      case 'equals':
        return fieldValue === condValue;
      case 'not_equals':
        return fieldValue !== condValue;
      default:
        return true;
    }
  }, [values, fieldIdToCodeMap]);
  
  const isSectionVisible = useCallback((section: FormSection): boolean => {
    if (!section.conditional_logic) return true;
    const { field_id, operator, value: condValue } = section.conditional_logic;
    const fieldCode = fieldIdToCodeMap.get(field_id) || field_id;
    // Safe: fieldCode is from fieldIdToCodeMap or field_id
    // eslint-disable-next-line security/detect-object-injection
    const fieldValue = values[fieldCode];
    
    switch (operator) {
      case 'equals':
        return fieldValue === condValue;
      case 'not_equals':
        return fieldValue !== condValue;
      default:
        return true;
    }
  }, [values, fieldIdToCodeMap]);
  
  const context: FormContext = useMemo(() => ({
    companyId,
    userId,
    workers,
    jobsites,
    equipment,
    hazards,
    tasks,
    isOnline,
  }), [companyId, userId, workers, jobsites, equipment, hazards, tasks, isOnline]);
  
  return {
    // Template data
    template,
    sections,
    fields,
    isLoading,
    error,
    
    // Form state
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    
    // Progress
    completionPercentage,
    currentStep,
    totalSteps,
    
    // Context data
    context,
    
    // Maps
    fieldIdToCodeMap,
    
    // Actions
    setValue,
    setTouched,
    setValues,
    validate,
    validateField: validateSingleField,
    reset,
    goToStep,
    nextStep,
    prevStep,
    setSubmitting,
    
    // Visibility
    getVisibleSections: getVisibleSectionsForForm,
    getVisibleFields: getVisibleFieldsForSection,
    isFieldVisible,
    isSectionVisible,
  };
}

export default useFormTemplate;
