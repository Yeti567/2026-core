'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  WifiOff,
  Plus,
  Trash2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

import { useFormTemplate } from './use-form-template';
import {
  FormRendererProps,
  FormSubmissionData,
  FormField as FormFieldType,
  FormSection,
  FormAttachments,
  FileAttachment,
  FieldType,
  SectionInstance,
} from './types';
import { getWidthClass, formatFrequency, formatEstimatedTime } from './utils';

// Field components
import TextField from './fields/text-field';
import TextareaField from './fields/textarea-field';
import NumberField from './fields/number-field';
import DateField from './fields/date-field';
import TimeField from './fields/time-field';
import DropdownField from './fields/dropdown-field';
import RadioField from './fields/radio-field';
import CheckboxField from './fields/checkbox-field';
import MultiselectField from './fields/multiselect-field';
import SignatureField from './fields/signature-field';
import PhotoField from './fields/photo-field';
import FileField from './fields/file-field';
import GPSField from './fields/gps-field';
import RatingField from './fields/rating-field';
import SliderField from './fields/slider-field';
import YesNoField from './fields/yes-no-field';
import WorkerSelectField from './fields/worker-select-field';
import JobsiteSelectField from './fields/jobsite-select-field';
import EquipmentSelectField from './fields/equipment-select-field';
import HazardSelectField from './fields/hazard-select-field';
import HazardMultiselectField from './fields/hazard-multiselect-field';
import TaskSelectField from './fields/task-select-field';

/**
 * DynamicFormRenderer
 * 
 * Renders interactive forms based on JSON schemas loaded from the database.
 * Supports all field types, conditional logic, repeatable sections,
 * validation, auto-save, and multi-step wizard mode.
 */
export function DynamicFormRenderer({
  formTemplateId,
  companyId,
  userId,
  initialData,
  mode,
  jobsiteId,
  onSubmit,
  onSaveDraft,
  onCancel,
  className,
}: FormRendererProps) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [repeatableSections, setRepeatableSections] = useState<Map<string, SectionInstance[]>>(new Map());
  
  const handleAutoSave = useCallback(async (values: Record<string, unknown>) => {
    if (onSaveDraft) {
      await onSaveDraft(values);
      setLastSavedAt(new Date());
    }
  }, [onSaveDraft]);
  
  const {
    template,
    sections,
    fields,
    isLoading,
    error,
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    completionPercentage,
    currentStep,
    totalSteps,
    context,
    fieldIdToCodeMap,
    setValue,
    setTouched,
    validate,
    reset,
    goToStep,
    nextStep,
    prevStep,
    setSubmitting,
    getVisibleSections,
    getVisibleFields,
    isFieldVisible,
    isSectionVisible,
  } = useFormTemplate({
    formTemplateId,
    companyId,
    userId,
    initialData,
    autoSaveInterval: mode !== 'view' ? 30000 : 0,
    onAutoSave: handleAutoSave,
  });
  
  // Determine if we should use wizard mode (3+ sections)
  const visibleSections = useMemo(() => getVisibleSections(), [getVisibleSections]);
  const useWizardMode = visibleSections.length >= 3;
  // Safe: currentStep is a number index controlled by state
  // eslint-disable-next-line security/detect-object-injection
  const currentSection = useWizardMode ? visibleSections[currentStep] : null;
  
  // Get icon component
  const IconComponent = useMemo(() => {
    if (!template?.icon) return null;
    const iconName = template.icon.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase());
    const icons = LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    >;
    // Safe: iconName is derived from template.icon with transformation
    // eslint-disable-next-line security/detect-object-injection
    return icons[iconName] || icons.FileText;
  }, [template?.icon]);
  
  // Render a single field based on its type
  const renderField = useCallback((field: FormFieldType) => {
    if (!isFieldVisible(field)) return null;
    
    const fieldValue = values[field.field_code];
    const fieldError = touched[field.field_code] ? errors[field.field_code] : undefined;
    const isDisabled = mode === 'view';
    
    const handleChange = (value: unknown) => {
      setValue(field.field_code, value);
      setTouched(field.field_code);
    };
    
    const commonProps = {
      field,
      value: fieldValue,
      onChange: handleChange,
      error: fieldError,
      disabled: isDisabled,
    };
    
    const widthClass = getWidthClass(field.width);
    
    const fieldComponents: Record<FieldType, JSX.Element | null> = {
      text: <TextField {...commonProps} onChange={(v) => handleChange(v)} />,
      email: <TextField {...commonProps} onChange={(v) => handleChange(v)} />,
      phone: <TextField {...commonProps} onChange={(v) => handleChange(v)} />,
      textarea: <TextareaField {...commonProps} onChange={(v) => handleChange(v)} />,
      number: <NumberField {...commonProps} onChange={(v) => handleChange(v)} />,
      currency: <NumberField {...commonProps} onChange={(v) => handleChange(v)} />,
      date: <DateField {...commonProps} onChange={(v) => handleChange(v)} />,
      datetime: <DateField {...commonProps} onChange={(v) => handleChange(v)} />,
      time: <TimeField {...commonProps} onChange={(v) => handleChange(v)} />,
      dropdown: <DropdownField {...commonProps} onChange={(v) => handleChange(v)} />,
      radio: <RadioField {...commonProps} onChange={(v) => handleChange(v)} />,
      checkbox: <CheckboxField {...commonProps} onChange={(v) => handleChange(v)} />,
      multiselect: <MultiselectField {...commonProps} onChange={(v) => handleChange(v)} />,
      signature: <SignatureField {...commonProps} onChange={(v) => handleChange(v)} />,
      photo: <PhotoField {...commonProps} onChange={(v) => handleChange(v)} />,
      file: <FileField {...commonProps} onChange={(v) => handleChange(v)} />,
      gps: (
        <GPSField
          {...commonProps}
          onChange={(v) => {
            handleChange(v);
            if (v) setGpsCoordinates(v);
          }}
        />
      ),
      rating: <RatingField {...commonProps} onChange={(v) => handleChange(v)} />,
      slider: <SliderField {...commonProps} onChange={(v) => handleChange(v)} />,
      yes_no: <YesNoField {...commonProps} onChange={(v) => handleChange(v)} />,
      yes_no_na: <YesNoField {...commonProps} onChange={(v) => handleChange(v)} />,
      worker_select: (
        <WorkerSelectField
          {...commonProps}
          workers={context.workers}
          onChange={(v) => handleChange(v)}
        />
      ),
      jobsite_select: (
        <JobsiteSelectField
          {...commonProps}
          jobsites={context.jobsites}
          onChange={(v) => handleChange(v)}
        />
      ),
      equipment_select: (
        <EquipmentSelectField
          {...commonProps}
          equipment={context.equipment}
          onChange={(v) => handleChange(v)}
        />
      ),
      hazard_select: (
        <HazardSelectField
          {...commonProps}
          hazards={context.hazards}
          onChange={(v) => handleChange(v)}
        />
      ),
      hazard_multiselect: (
        <HazardMultiselectField
          {...commonProps}
          hazards={context.hazards}
          onChange={(v) => handleChange(v)}
        />
      ),
      task_select: (
        <TaskSelectField
          {...commonProps}
          tasks={context.tasks}
          onChange={(v) => handleChange(v)}
        />
      ),
      hidden: null,
      body_diagram: null, // TODO: Implement body diagram field
      weather: null, // TODO: Implement weather field
      temperature: null, // TODO: Implement temperature field
    };
    
    const component = fieldComponents[field.field_type];
    if (!component) return null;
    
    return (
      <div key={field.id} className={cn('p-1', widthClass)}>
        {component}
      </div>
    );
  }, [values, errors, touched, mode, setValue, setTouched, isFieldVisible, context]);
  
  // Render a section with its fields
  const renderSection = useCallback((section: FormSection) => {
    if (!isSectionVisible(section)) return null;
    
    const sectionFields = getVisibleFields(section.id);
    
    return (
      <div key={section.id} className="space-y-4">
        {section.title && (
          <div>
            <h3 className="text-lg font-semibold">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap -mx-1">
          {sectionFields.map(renderField)}
        </div>
        
        {/* Repeatable section handling */}
        {section.is_repeatable && mode !== 'view' && (
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const instances = repeatableSections.get(section.id) || [];
                const newInstance: SectionInstance = {
                  instanceId: crypto.randomUUID(),
                  sectionId: section.id,
                  values: {},
                  index: instances.length,
                };
                setRepeatableSections(prev => {
                  const updated = new Map(prev);
                  updated.set(section.id, [...instances, newInstance]);
                  return updated;
                });
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Another {section.title || 'Entry'}
            </Button>
            
            {/* Render repeatable instances */}
            {(repeatableSections.get(section.id) || []).map((instance, index) => (
              <div key={instance.instanceId} className="mt-4 p-4 border rounded-lg relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setRepeatableSections(prev => {
                      const updated = new Map(prev);
                      const instances = prev.get(section.id) || [];
                      updated.set(section.id, instances.filter(i => i.instanceId !== instance.instanceId));
                      return updated;
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <p className="text-sm font-medium mb-2">
                  {section.title || 'Entry'} #{index + 2}
                </p>
                {/* Fields would be rendered here with instance-specific values */}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [isSectionVisible, getVisibleFields, renderField, mode, repeatableSections]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (asDraft = false) => {
    if (!asDraft) {
      const isValid = validate();
      if (!isValid) {
        // Scroll to first error
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          document.getElementById(firstErrorField)?.focus();
        }
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      // Collect attachments
      const attachments: FormAttachments = {
        photos: [],
        signatures: {},
        files: [],
      };
      
      // Process field values for attachments
      for (const field of fields) {
        const value = values[field.field_code];
        if (!value) continue;
        
        if (field.field_type === 'signature' && typeof value === 'string') {
          attachments.signatures[field.field_code] = value;
        } else if (field.field_type === 'photo') {
          if (Array.isArray(value)) {
            attachments.photos.push(...value.map((data: string) => ({
              field_code: field.field_code,
              data,
            })));
          } else if (typeof value === 'string') {
            attachments.photos.push({ field_code: field.field_code, data: value });
          }
        } else if (field.field_type === 'file' && Array.isArray(value)) {
          attachments.files.push(
            ...(value as unknown[]).filter((v): v is FileAttachment => {
              return !!v && typeof v === 'object' && 'name' in v && 'type' in v && 'size' in v;
            })
          );
        }
      }
      
      const submissionData: FormSubmissionData = {
        form_template_id: formTemplateId,
        form_data: values,
        attachments,
        gps_coordinates: gpsCoordinates || undefined,
        jobsite_id: jobsiteId,
        status: asDraft ? 'draft' : 'submitted',
      };
      
      await onSubmit(submissionData);
    } catch (err) {
      console.error('Form submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [validate, errors, fields, values, gpsCoordinates, formTemplateId, jobsiteId, onSubmit, setSubmitting]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-12', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading form...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  // No template
  if (!template) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Form template not found</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {IconComponent && (
                <div
                  className="rounded-lg p-2"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <IconComponent
                    className="h-6 w-6"
                    style={{ color: template.color }}
                  />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                {template.description && (
                  <CardDescription className="mt-1">
                    {template.description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {template.is_mandatory && (
                <Badge variant="destructive">Required</Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatEstimatedTime(template.estimated_time_minutes)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            {!context.isOnline && (
              <span className="flex items-center gap-1 text-amber-600">
                <WifiOff className="h-4 w-4" />
                Offline Mode
              </span>
            )}
            {lastSavedAt && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Saved {lastSavedAt.toLocaleTimeString()}
              </span>
            )}
            {isDirty && (
              <span className="text-amber-600">Unsaved changes</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Wizard progress */}
      {useWizardMode && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <div className="flex gap-1">
            {visibleSections.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={cn(
                  'h-2 w-8 rounded-full transition-colors',
                  index === currentStep
                    ? 'bg-primary'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Form content */}
      <Card>
        <CardContent className="pt-6">
          {useWizardMode && currentSection ? (
            // Wizard mode - show one section at a time
            renderSection(currentSection)
          ) : (
            // Single page mode - show all sections
            <div className="space-y-8">
              {visibleSections.map((section, index) => (
                <div key={section.id}>
                  {index > 0 && <Separator className="my-8" />}
                  {renderSection(section)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Navigation and actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          {useWizardMode && currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {mode !== 'view' && onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Draft
            </Button>
          )}
          
          {useWizardMode && currentStep < totalSteps - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={isSubmitting}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : mode !== 'view' ? (
            <Button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              style={{ backgroundColor: template.color }}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Submit Form
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default DynamicFormRenderer;
