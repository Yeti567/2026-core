'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  X,
  Smartphone,
  Monitor,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { FormFieldMapping, FieldType } from '@/lib/forms/pdf-conversion-types';

// =============================================================================
// TYPES
// =============================================================================

interface FormPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  fields: FormFieldMapping[];
  onTestSubmit?: (data: Record<string, unknown>) => Promise<void>;
}

interface FormSection {
  name: string;
  fields: FormFieldMapping[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FormPreviewModal({
  open,
  onOpenChange,
  formName,
  fields,
  onTestSubmit
}: FormPreviewModalProps) {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Group fields by section
  const sections = React.useMemo(() => {
    const sectionMap = new Map<string, FormFieldMapping[]>();
    
    const sortedFields = [...fields].sort((a, b) => {
      if (a.section_order !== b.section_order) return a.section_order - b.section_order;
      return a.field_order - b.field_order;
    });
    
    for (const field of sortedFields) {
      const sectionName = field.section_name || 'Form Fields';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName)!.push(field);
    }
    
    return Array.from(sectionMap.entries()).map(([name, fields]) => ({
      name,
      fields
    }));
  }, [fields]);

  const handleFieldChange = (fieldCode: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldCode]: value }));
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!onTestSubmit) return;
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onTestSubmit(formData);
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({});
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <DialogTitle className="text-lg">Form Preview</DialogTitle>
            <DialogDescription>
              Preview how this form will appear to workers
            </DialogDescription>
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('mobile')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'mobile'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Smartphone className="w-4 h-4" />
              Mobile
            </button>
            <button
              onClick={() => setViewMode('desktop')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'desktop'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Monitor className="w-4 h-4" />
              Desktop
            </button>
          </div>
        </div>

        {/* Form Preview Area */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-100 p-6">
          <div
            className={cn(
              'bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300',
              viewMode === 'mobile'
                ? 'w-[375px] max-h-[667px]'
                : 'w-full max-w-2xl max-h-full'
            )}
          >
            {/* Form Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-6 text-white">
              <h2 className="text-xl font-bold">{formName}</h2>
              <p className="text-blue-100 text-sm mt-1">
                {fields.length} field{fields.length !== 1 ? 's' : ''} • {sections.length} section{sections.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Form Body */}
            <div className="overflow-y-auto" style={{ maxHeight: viewMode === 'mobile' ? '500px' : '600px' }}>
              {submitSuccess ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Test Submission Successful!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your form data was submitted successfully.
                  </p>
                  <Button onClick={resetForm}>
                    Submit Another
                  </Button>
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  {sections.map((section, sectionIndex) => (
                    <div key={section.name} className="space-y-4">
                      {/* Section Header */}
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {sectionIndex + 1}
                        </span>
                        <h3 className="font-semibold text-gray-900">{section.name}</h3>
                      </div>

                      {/* Section Fields */}
                      {section.fields.map(field => (
                        <FormField
                          key={field.field_id}
                          field={field}
                          value={formData[field.field_code]}
                          onChange={(value) => handleFieldChange(field.field_code, value)}
                          compact={viewMode === 'mobile'}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Submit Error */}
                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Form Footer */}
            {!submitSuccess && (
              <div className="px-4 py-3 bg-gray-50 border-t">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Form
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// FORM FIELD COMPONENT
// =============================================================================

interface FormFieldProps {
  field: FormFieldMapping;
  value: unknown;
  onChange: (value: unknown) => void;
  compact?: boolean;
}

function FormField({ field, value, onChange, compact }: FormFieldProps) {
  const renderField = () => {
    switch (field.field_type as FieldType) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <Input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'tel' ? 'tel' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className={compact ? 'h-10' : ''}
          />
        );

      case 'number':
      case 'currency':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
            placeholder={field.placeholder || 'Enter number'}
            className={compact ? 'h-10' : ''}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={compact ? 2 : 3}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={compact ? 'h-10' : ''}
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={compact ? 'h-10' : ''}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={compact ? 'h-10' : ''}
          />
        );

      case 'checkbox':
      case 'yes_no':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => onChange(checked)}
            />
            <span className="text-sm text-gray-600">
              {field.field_type === 'yes_no' ? (value ? 'Yes' : 'No') : 'Checked'}
            </span>
          </div>
        );

      case 'yes_no_na':
        return (
          <div className="flex gap-4">
            {['yes', 'no', 'na'].map(option => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.field_code}
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  className="w-4 h-4"
                />
                <span className="text-sm capitalize">{option === 'na' ? 'N/A' : option}</span>
              </label>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <Select value={(value as string) || ''} onValueChange={onChange}>
            <SelectTrigger className={compact ? 'h-10' : ''}>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {(field.options || []).map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.field_code}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => onChange(option.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            {(field.options || []).map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, option.value]);
                    } else {
                      onChange(selectedValues.filter(v => v !== option.value));
                    }
                  }}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'signature':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
            <p className="text-sm text-gray-500">
              {value ? '✓ Signature captured' : 'Tap to sign'}
            </p>
            <button
              type="button"
              onClick={() => onChange(value ? null : `sig_${Date.now()}`)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              {value ? 'Clear' : 'Add signature'}
            </button>
          </div>
        );

      case 'photo':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
            <p className="text-sm text-gray-500">
              {value ? '✓ Photo captured' : 'Tap to take photo'}
            </p>
            <button
              type="button"
              onClick={() => onChange(value ? null : `photo_${Date.now()}`)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              {value ? 'Remove' : 'Capture photo'}
            </button>
          </div>
        );

      case 'rating': {
        const currentRating = typeof value === 'number' ? value : 0;
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className={cn(
                  'text-2xl transition-colors',
                  currentRating >= star ? 'text-yellow-400' : 'text-gray-300'
                )}
              >
                ★
              </button>
            ))}
          </div>
        );
      }

      default:
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className={compact ? 'h-10' : ''}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">
        {field.label}
        {field.validation_rules?.required && (
          <span className="text-red-500 ml-0.5">*</span>
        )}
      </label>
      {renderField()}
      {field.help_text && (
        <p className="text-xs text-gray-500">{field.help_text}</p>
      )}
    </div>
  );
}

export default FormPreviewModal;
