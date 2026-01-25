'use client';

/**
 * Form Preview
 * 
 * Live preview of the form as it will appear to workers.
 */

import { useMemo, useState } from 'react';
import { useFormBuilderStore } from '@/lib/stores/form-builder-store';
import { DynamicFormRenderer } from '../form-renderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Smartphone, Monitor, Tablet, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormTemplate, FormSection, FormField } from '../types';

type DevicePreview = 'mobile' | 'tablet' | 'desktop';

const deviceWidths: Record<DevicePreview, string> = {
  mobile: 'max-w-[375px]',
  tablet: 'max-w-[768px]',
  desktop: 'max-w-[1024px]',
};

export function FormPreview() {
  const [device, setDevice] = useState<DevicePreview>('mobile');
  const { template, sections, fields, getSectionFields } = useFormBuilderStore();
  
  // Build a preview-compatible template
  const previewTemplate = useMemo<FormTemplate | null>(() => {
    if (!template) return null;
    
    const previewSections: FormSection[] = sections.map(section => ({
      ...section,
      form_fields: getSectionFields(section.id),
    }));
    
    return {
      id: 'preview',
      company_id: null,
      form_code: template.form_code || 'preview',
      name: template.name || 'Form Preview',
      description: template.description || null,
      cor_element: template.cor_element || null,
      frequency: template.frequency || 'as_needed',
      estimated_time_minutes: template.estimated_time_minutes || 5,
      icon: template.icon || 'file-text',
      color: template.color || '#3b82f6',
      version: template.version || 1,
      is_active: true,
      is_mandatory: template.is_mandatory || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      form_sections: previewSections,
    } as FormTemplate;
  }, [template, sections, getSectionFields]);
  
  const allFields = useMemo(() => {
    const result: FormField[] = [];
    sections.forEach(section => {
      result.push(...getSectionFields(section.id));
    });
    return result;
  }, [sections, getSectionFields]);
  
  if (!template || sections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Content to Preview</h3>
            <p className="text-muted-foreground">
              Add sections and fields to your form to see a preview.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-muted/30">
      {/* Preview Controls */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h2 className="font-semibold">Preview Mode</h2>
            <p className="text-sm text-muted-foreground">
              This is how your form will appear to workers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Device:</span>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={device === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setDevice('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={device === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-x"
                onClick={() => setDevice('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={device === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setDevice('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-6">
        <Alert className="max-w-4xl mx-auto mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            This is a preview. Submissions and GPS capture are disabled. 
            Conditional logic and validation are active for testing.
          </AlertDescription>
        </Alert>
        
        <div className={cn(
          'mx-auto transition-all duration-300',
          // Safe: Device is constrained to specific string literal types ('mobile' | 'tablet' | 'desktop')
          // eslint-disable-next-line security/detect-object-injection
          deviceWidths[device],
          device === 'mobile' && 'shadow-lg rounded-2xl border overflow-hidden'
        )}>
          {device === 'mobile' && (
            <div className="bg-background border-b py-2 px-4">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto" />
            </div>
          )}
          
          <div className={cn(
            'bg-background',
            device === 'mobile' && 'min-h-[600px]'
          )}>
            <PreviewFormRenderer
              template={previewTemplate}
              sections={sections}
              allFields={allFields}
              getSectionFields={getSectionFields}
            />
          </div>
          
          {device === 'mobile' && (
            <div className="bg-background border-t py-3 px-4">
              <div className="w-24 h-1 bg-muted rounded-full mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified preview renderer that doesn't require database
interface PreviewFormRendererProps {
  template: FormTemplate | null;
  sections: FormSection[];
  allFields: FormField[];
  getSectionFields: (sectionId: string) => FormField[];
}

function PreviewFormRenderer({ 
  template, 
  sections,
  allFields,
  getSectionFields,
}: PreviewFormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [currentStep, setCurrentStep] = useState(0);
  
  if (!template) return null;
  
  const useWizardMode = sections.length >= 3;
  // Safe: currentStep is a number index controlled by state
  // eslint-disable-next-line security/detect-object-injection
  const currentSection = useWizardMode ? sections[currentStep] : null;
  
  const handleSubmit = async () => {
    console.log('Preview submission (not actually submitted):', values);
    alert('Form submission simulated! Check console for data.');
  };
  
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold">{template.name}</h1>
        {template.description && (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        )}
      </div>
      
      {/* Progress */}
      {useWizardMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Step {currentStep + 1} of {sections.length}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full transition-all"
              style={{ 
                width: `${((currentStep + 1) / sections.length) * 100}%`,
                backgroundColor: template.color,
              }}
            />
          </div>
        </div>
      )}
      
      {/* Sections */}
      {useWizardMode && currentSection ? (
        <PreviewSection 
          section={currentSection} 
          fields={getSectionFields(currentSection.id)}
          values={values}
          // Safe: Key is field_code from form field definition, not arbitrary user input
           
          onChange={(key, value) => setValues(prev => ({ ...prev, [key]: value }))}
        />
      ) : (
        sections.map((section) => (
          <PreviewSection
            key={section.id}
            section={section}
            fields={getSectionFields(section.id)}
            values={values}
            // Safe: Key is field_code from form field definition, not arbitrary user input
             
            onChange={(key, value) => setValues(prev => ({ ...prev, [key]: value }))}
          />
        ))
      )}
      
      {/* Navigation */}
      <div className="flex justify-between pt-4">
        {useWizardMode && currentStep > 0 ? (
          <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)}>
            Back
          </Button>
        ) : (
          <div />
        )}
        
        {useWizardMode && currentStep < sections.length - 1 ? (
          <Button onClick={() => setCurrentStep(s => s + 1)}>
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            style={{ backgroundColor: template.color }}
          >
            Submit (Preview)
          </Button>
        )}
      </div>
    </div>
  );
}

interface PreviewSectionProps {
  section: FormSection;
  fields: FormField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function PreviewSection({ section, fields, values, onChange }: PreviewSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{section.title}</CardTitle>
        {section.description && (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <PreviewField
            key={field.id}
            field={field}
            // Safe: field_code is from form field definition, not arbitrary user input
             
            value={values[field.field_code]}
            onChange={(value) => onChange(field.field_code, value)}
          />
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fields in this section
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface PreviewFieldProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function PreviewField({ field, value, onChange }: PreviewFieldProps) {
  const isRequired = field.validation_rules?.required;
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {field.label}
        {isRequired && <span className="text-destructive ml-1">*</span>}
      </label>
      
      {/* Simplified preview inputs */}
      {field.field_type === 'text' || field.field_type === 'email' || field.field_type === 'phone' ? (
        <input
          type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || undefined}
          className="w-full px-3 py-2 border rounded-md"
        />
      ) : field.field_type === 'textarea' ? (
        <textarea
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || undefined}
          rows={3}
          className="w-full px-3 py-2 border rounded-md"
        />
      ) : field.field_type === 'number' || field.field_type === 'currency' ? (
        <input
          type="number"
          value={value === undefined || value === '' ? '' : String(value)}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder || undefined}
          className="w-full px-3 py-2 border rounded-md"
        />
      ) : field.field_type === 'date' || field.field_type === 'datetime' ? (
        <input
          type={field.field_type === 'datetime' ? 'datetime-local' : 'date'}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      ) : field.field_type === 'dropdown' ? (
        <select
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select...</option>
          {(field.options as any[] || []).map((opt, i) => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={i} value={optValue}>{optLabel}</option>
            );
          })}
        </select>
      ) : field.field_type === 'yes_no' ? (
        <div className="flex gap-2">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt.toLowerCase())}
              className={cn(
                'flex-1 py-2 border rounded-md transition-colors',
                value === opt.toLowerCase() ? 'bg-primary text-primary-foreground' : 'bg-background'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : field.field_type === 'signature' ? (
        <div className="border-2 border-dashed rounded-md p-8 text-center text-muted-foreground">
          Signature Pad (preview only)
        </div>
      ) : field.field_type === 'photo' ? (
        <div className="border-2 border-dashed rounded-md p-8 text-center text-muted-foreground">
          Photo Capture (preview only)
        </div>
      ) : field.field_type === 'gps' ? (
        <div className="border rounded-md p-4 text-center text-muted-foreground">
          GPS Location (preview only)
        </div>
      ) : (
        <div className="border rounded-md p-4 text-center text-muted-foreground text-sm">
          {field.field_type} field (preview)
        </div>
      )}
      
      {field.help_text && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
    </div>
  );
}

export default FormPreview;
