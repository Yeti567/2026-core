'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import type { FormFieldMapping, FieldType, FieldOption } from '@/lib/forms/pdf-conversion-types';

interface FieldEditorProps {
  field: FormFieldMapping;
  onSave: (field: FormFieldMapping) => void;
  onCancel: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text Input', description: 'Single line text' },
  { value: 'textarea', label: 'Textarea', description: 'Multi-line text' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'time', label: 'Time', description: 'Time picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Combined date/time' },
  { value: 'dropdown', label: 'Dropdown', description: 'Select from list' },
  { value: 'radio', label: 'Radio Buttons', description: 'Single choice' },
  { value: 'checkbox', label: 'Checkbox', description: 'Yes/No toggle' },
  { value: 'multiselect', label: 'Multi-select', description: 'Multiple choices' },
  { value: 'signature', label: 'Signature', description: 'Signature capture' },
  { value: 'photo', label: 'Photo', description: 'Camera/upload' },
  { value: 'file', label: 'File Upload', description: 'File attachment' },
  { value: 'gps', label: 'GPS Location', description: 'Auto-capture location' },
  { value: 'worker_select', label: 'Worker Select', description: 'Pick from workers' },
  { value: 'jobsite_select', label: 'Jobsite Select', description: 'Pick from jobsites' },
  { value: 'equipment_select', label: 'Equipment Select', description: 'Pick equipment' },
  { value: 'rating', label: 'Rating', description: '1-5 star rating' },
  { value: 'yes_no', label: 'Yes/No', description: 'Binary choice' },
  { value: 'yes_no_na', label: 'Yes/No/N/A', description: 'With N/A option' },
  { value: 'email', label: 'Email', description: 'Email validation' },
  { value: 'tel', label: 'Phone', description: 'Phone number' },
  { value: 'currency', label: 'Currency', description: 'Money input' },
  { value: 'weather', label: 'Weather', description: 'Weather conditions' },
  { value: 'temperature', label: 'Temperature', description: 'Temperature input' },
];

export function FieldEditor({ field, onSave, onCancel }: FieldEditorProps) {
  const [editedField, setEditedField] = useState<FormFieldMapping>({ ...field });
  const [options, setOptions] = useState<FieldOption[]>(field.options || []);
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const updateField = <K extends keyof FormFieldMapping>(key: K, value: FormFieldMapping[K]) => {
    setEditedField(prev => ({ ...prev, [key]: value }));
  };

  const updateValidation = (key: string, value: boolean | number | string | undefined) => {
    setEditedField(prev => ({
      ...prev,
      validation_rules: {
        ...prev.validation_rules,
        [key]: value
      }
    }));
  };

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    
    const newOption: FieldOption = {
      value: newOptionLabel.toLowerCase().replace(/\s+/g, '_'),
      label: newOptionLabel.trim()
    };
    
    setOptions(prev => [...prev, newOption]);
    setNewOptionLabel('');
  };

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updatedField: FormFieldMapping = {
      ...editedField,
      options: ['dropdown', 'radio', 'multiselect'].includes(editedField.field_type) 
        ? options 
        : null
    };
    onSave(updatedField);
  };

  const needsOptions = ['dropdown', 'radio', 'multiselect'].includes(editedField.field_type);

  return (
    <div className="p-4 bg-white border rounded-lg shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Edit Field</h4>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Field Label */}
      <div>
        <label className="text-sm font-medium text-gray-700">Field Label</label>
        <Input
          value={editedField.label}
          onChange={(e) => updateField('label', e.target.value)}
          placeholder="Enter field label"
          className="mt-1"
        />
      </div>

      {/* Field Type */}
      <div>
        <label className="text-sm font-medium text-gray-700">Field Type</label>
        <Select
          value={editedField.field_type}
          onValueChange={(value) => updateField('field_type', value as FieldType)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {FIELD_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex flex-col">
                  <span>{type.label}</span>
                  <span className="text-xs text-gray-500">{type.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Options for dropdown/radio/multiselect */}
      {needsOptions && (
        <div>
          <label className="text-sm font-medium text-gray-700">Options</label>
          <div className="mt-2 space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index] = {
                      ...option,
                      label: e.target.value,
                      value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                    };
                    setOptions(newOptions);
                  }}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder="Add new option..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addOption();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={!newOptionLabel.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder */}
      <div>
        <label className="text-sm font-medium text-gray-700">Placeholder Text</label>
        <Input
          value={editedField.placeholder || ''}
          onChange={(e) => updateField('placeholder', e.target.value || null)}
          placeholder="Enter placeholder..."
          className="mt-1"
        />
      </div>

      {/* Help Text */}
      <div>
        <label className="text-sm font-medium text-gray-700">Help Text</label>
        <Input
          value={editedField.help_text || ''}
          onChange={(e) => updateField('help_text', e.target.value || null)}
          placeholder="Additional instructions for the user..."
          className="mt-1"
        />
      </div>

      {/* Validation Rules */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Validation</label>
        <div className="space-y-3 pl-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="required"
              checked={editedField.validation_rules?.required || false}
              onCheckedChange={(checked) => updateValidation('required', !!checked)}
            />
            <label htmlFor="required" className="text-sm text-gray-600 cursor-pointer">
              Required field
            </label>
          </div>

          {editedField.field_type === 'text' || editedField.field_type === 'textarea' ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">Min length:</label>
                <Input
                  type="number"
                  value={editedField.validation_rules?.min_length || ''}
                  onChange={(e) => updateValidation('min_length', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-24"
                  min={0}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">Max length:</label>
                <Input
                  type="number"
                  value={editedField.validation_rules?.max_length || ''}
                  onChange={(e) => updateValidation('max_length', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-24"
                  min={0}
                />
              </div>
            </>
          ) : null}

          {editedField.field_type === 'number' || editedField.field_type === 'currency' ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">Min value:</label>
                <Input
                  type="number"
                  value={editedField.validation_rules?.min_value ?? ''}
                  onChange={(e) => updateValidation('min_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">Max value:</label>
                <Input
                  type="number"
                  value={editedField.validation_rules?.max_value ?? ''}
                  onChange={(e) => updateValidation('max_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-24"
                />
              </div>
            </>
          ) : null}

          {editedField.field_type === 'email' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="email-validation"
                checked={editedField.validation_rules?.email || false}
                onCheckedChange={(checked) => updateValidation('email', !!checked)}
              />
              <label htmlFor="email-validation" className="text-sm text-gray-600 cursor-pointer">
                Validate email format
              </label>
            </div>
          )}

          {editedField.field_type === 'tel' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="phone-validation"
                checked={editedField.validation_rules?.phone || false}
                onCheckedChange={(checked) => updateValidation('phone', !!checked)}
              />
              <label htmlFor="phone-validation" className="text-sm text-gray-600 cursor-pointer">
                Validate phone format
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Section Assignment */}
      <div>
        <label className="text-sm font-medium text-gray-700">Section</label>
        <Input
          value={editedField.section_name}
          onChange={(e) => updateField('section_name', e.target.value)}
          placeholder="Enter section name"
          className="mt-1"
        />
      </div>
    </div>
  );
}

export default FieldEditor;
