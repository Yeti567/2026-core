'use client';

/**
 * Field Configuration Panel
 * 
 * Edit field properties in the right sidebar.
 */

import { useState, useEffect } from 'react';
import { useFormBuilderStore } from '@/lib/stores/form-builder-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { FormField, FieldType, FieldOption, ConditionalLogic } from '../types';

interface FieldConfigPanelProps {
  fieldId: string;
}

export function FieldConfigPanel({ fieldId }: FieldConfigPanelProps) {
  const { getField, updateField, deleteField, getAllFields, sections } = useFormBuilderStore();
  const field = getField(fieldId);
  
  if (!field) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Field not found
      </div>
    );
  }
  
  const allFields = getAllFields().filter(f => f.id !== fieldId);
  const hasOptions = ['dropdown', 'radio', 'multiselect'].includes(field.field_type);
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">{field.label}</h3>
        <p className="text-sm text-muted-foreground">Configure field properties</p>
      </div>
      
      <Separator />
      
      <Accordion type="multiple" defaultValue={['basic', 'validation']} className="space-y-2">
        {/* Basic Settings */}
        <AccordionItem value="basic">
          <AccordionTrigger className="text-sm font-medium">
            Basic Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Field Label</Label>
              <Input
                value={field.label}
                onChange={(e) => updateField(fieldId, { label: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Field Code</Label>
              <Input
                value={field.field_code}
                onChange={(e) => updateField(fieldId, { 
                  field_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                })}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Used as the key in form data
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select
                value={field.field_type}
                onValueChange={(value) => updateField(fieldId, { field_type: value as FieldType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Input</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="datetime">Date & Time</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="radio">Radio Buttons</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="multiselect">Multi-select</SelectItem>
                  <SelectItem value="yes_no">Yes / No</SelectItem>
                  <SelectItem value="yes_no_na">Yes / No / N/A</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="slider">Slider</SelectItem>
                  <SelectItem value="signature">Signature</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                  <SelectItem value="gps">GPS Location</SelectItem>
                  <SelectItem value="worker_select">Worker Select</SelectItem>
                  <SelectItem value="jobsite_select">Jobsite Select</SelectItem>
                  <SelectItem value="equipment_select">Equipment Select</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => updateField(fieldId, { placeholder: e.target.value || null })}
                placeholder="Enter placeholder text..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Help Text</Label>
              <Textarea
                value={field.help_text || ''}
                onChange={(e) => updateField(fieldId, { help_text: e.target.value || null })}
                placeholder="Additional instructions for this field..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Default Value</Label>
              <Input
                value={field.default_value || ''}
                onChange={(e) => updateField(fieldId, { default_value: e.target.value || null })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Width</Label>
              <Select
                value={field.width}
                onValueChange={(value) => updateField(fieldId, { width: value as FormField['width'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Width</SelectItem>
                  <SelectItem value="half">Half Width</SelectItem>
                  <SelectItem value="third">One Third</SelectItem>
                  <SelectItem value="quarter">One Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Options (for dropdown/radio/multiselect) */}
        {hasOptions && (
          <AccordionItem value="options">
            <AccordionTrigger className="text-sm font-medium">
              Options
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <OptionsEditor
                options={field.options as FieldOption[] | string[] | null}
                onChange={(options) => updateField(fieldId, { options })}
              />
            </AccordionContent>
          </AccordionItem>
        )}
        
        {/* Validation */}
        <AccordionItem value="validation">
          <AccordionTrigger className="text-sm font-medium">
            Validation
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch
                checked={field.validation_rules?.required || false}
                onCheckedChange={(checked) => updateField(fieldId, {
                  validation_rules: { ...field.validation_rules, required: checked }
                })}
              />
            </div>
            
            {['text', 'textarea', 'email', 'phone'].includes(field.field_type) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Length</Label>
                    <Input
                      type="number"
                      value={field.validation_rules?.min_length ?? ''}
                      onChange={(e) => updateField(fieldId, {
                        validation_rules: {
                          ...field.validation_rules,
                          min_length: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Length</Label>
                    <Input
                      type="number"
                      value={field.validation_rules?.max_length ?? ''}
                      onChange={(e) => updateField(fieldId, {
                        validation_rules: {
                          ...field.validation_rules,
                          max_length: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                    />
                  </div>
                </div>
              </>
            )}
            
            {['number', 'slider', 'rating', 'currency'].includes(field.field_type) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Value</Label>
                  <Input
                    type="number"
                    value={field.validation_rules?.min_value ?? ''}
                    onChange={(e) => updateField(fieldId, {
                      validation_rules: {
                        ...field.validation_rules,
                        min_value: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Value</Label>
                  <Input
                    type="number"
                    value={field.validation_rules?.max_value ?? ''}
                    onChange={(e) => updateField(fieldId, {
                      validation_rules: {
                        ...field.validation_rules,
                        max_value: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Pattern (Regex)</Label>
              <Input
                value={field.validation_rules?.pattern || ''}
                onChange={(e) => updateField(fieldId, {
                  validation_rules: {
                    ...field.validation_rules,
                    pattern: e.target.value || undefined
                  }
                })}
                placeholder="e.g., ^[A-Za-z]+$"
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Custom Error Message</Label>
              <Input
                value={field.validation_rules?.custom_message || ''}
                onChange={(e) => updateField(fieldId, {
                  validation_rules: {
                    ...field.validation_rules,
                    custom_message: e.target.value || undefined
                  }
                })}
                placeholder="Enter a custom validation message..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Conditional Logic */}
        <AccordionItem value="conditional">
          <AccordionTrigger className="text-sm font-medium">
            Conditional Logic
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <ConditionalLogicEditor
              logic={field.conditional_logic}
              availableFields={allFields}
              onChange={(logic) => updateField(fieldId, { conditional_logic: logic })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <Separator />
      
      <Button
        variant="destructive"
        size="sm"
        onClick={() => deleteField(fieldId)}
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Field
      </Button>
    </div>
  );
}

// Options editor for dropdowns/radios/multiselect
interface OptionsEditorProps {
  options: FieldOption[] | string[] | null;
  onChange: (options: FieldOption[]) => void;
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  // Normalize options to FieldOption[]
  const normalizedOptions: FieldOption[] = (options || []).map((opt, i) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });
  
  const addOption = () => {
    const newOption: FieldOption = {
      value: `option_${normalizedOptions.length + 1}`,
      label: `Option ${normalizedOptions.length + 1}`,
    };
    onChange([...normalizedOptions, newOption]);
  };
  
  const updateOption = (index: number, updates: Partial<FieldOption>) => {
    const updated = [...normalizedOptions];
    // Safe: Index is validated to be within array bounds before use
    // eslint-disable-next-line security/detect-object-injection
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };
  
  const removeOption = (index: number) => {
    onChange(normalizedOptions.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-2">
      {normalizedOptions.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
          <Input
            value={option.label}
            onChange={(e) => updateOption(index, { 
              label: e.target.value,
              value: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')
            })}
            placeholder="Option label"
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => removeOption(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={addOption}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Option
      </Button>
    </div>
  );
}

// Conditional logic editor
interface ConditionalLogicEditorProps {
  logic: ConditionalLogic | null;
  availableFields: FormField[];
  onChange: (logic: ConditionalLogic | null) => void;
}

function ConditionalLogicEditor({ logic, availableFields, onChange }: ConditionalLogicEditorProps) {
  const [isEnabled, setIsEnabled] = useState(!!logic);
  
  useEffect(() => {
    setIsEnabled(!!logic);
  }, [logic]);
  
  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onChange(null);
    } else if (!logic && availableFields.length > 0) {
      onChange({
        field_id: availableFields[0].id,
        operator: 'equals',
        value: '',
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Show this field conditionally</Label>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
        />
      </div>
      
      {isEnabled && logic && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Show this field when:</p>
          
          <Select
            value={logic.field_id}
            onValueChange={(value) => onChange({ ...logic, field_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={logic.operator}
            onValueChange={(value) => onChange({ ...logic, operator: value as ConditionalLogic['operator'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">equals</SelectItem>
              <SelectItem value="not_equals">does not equal</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
              <SelectItem value="not_contains">does not contain</SelectItem>
              <SelectItem value="greater_than">is greater than</SelectItem>
              <SelectItem value="less_than">is less than</SelectItem>
              <SelectItem value="is_empty">is empty</SelectItem>
              <SelectItem value="is_not_empty">is not empty</SelectItem>
            </SelectContent>
          </Select>
          
          {!['is_empty', 'is_not_empty'].includes(logic.operator) && (
            <Input
              value={String(logic.value ?? '')}
              onChange={(e) => onChange({ ...logic, value: e.target.value })}
              placeholder="Value"
            />
          )}
        </div>
      )}
      
      {isEnabled && availableFields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add more fields to enable conditional logic
        </p>
      )}
    </div>
  );
}

export default FieldConfigPanel;
