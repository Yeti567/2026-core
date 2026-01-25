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
import { Plus, Trash2 } from 'lucide-react';
import type { FieldType, ValidationRules, FieldOption } from '@/lib/forms/pdf-conversion-types';
import type { SelectedArea } from './area-selector';

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedArea: (SelectedArea & { page: number }) | null;
  sections: string[];
  onAddField: (field: NewFieldData) => void;
}

export interface NewFieldData {
  label: string;
  field_type: FieldType;
  section_name: string;
  position_page: number;
  position_x: number;
  position_y: number;
  position_width: number;
  position_height: number;
  validation_rules: ValidationRules;
  options: FieldOption[] | null;
  placeholder: string | null;
  help_text: string | null;
}

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'textarea', label: 'Textarea', icon: '📄' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'time', label: 'Time', icon: '🕐' },
  { value: 'dropdown', label: 'Dropdown', icon: '▼' },
  { value: 'radio', label: 'Radio Buttons', icon: '⦿' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑' },
  { value: 'multiselect', label: 'Multi-select', icon: '☐☐' },
  { value: 'signature', label: 'Signature', icon: '✍️' },
  { value: 'photo', label: 'Photo Capture', icon: '📷' },
  { value: 'file', label: 'File Upload', icon: '📎' },
  { value: 'gps', label: 'GPS Location', icon: '📍' },
  { value: 'worker_select', label: 'Worker Select', icon: '👤' },
  { value: 'yes_no', label: 'Yes/No', icon: '✓✗' },
  { value: 'yes_no_na', label: 'Yes/No/N/A', icon: '✓✗○' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'tel', label: 'Phone Number', icon: '📞' },
];

export function AddFieldDialog({
  open,
  onOpenChange,
  selectedArea,
  sections,
  onAddField
}: AddFieldDialogProps) {
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [sectionName, setSectionName] = useState(sections[0] || 'Section 1');
  const [isRequired, setIsRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const needsOptions = ['dropdown', 'radio', 'multiselect'].includes(fieldType);

  const resetForm = () => {
    setLabel('');
    setFieldType('text');
    setSectionName(sections[0] || 'Section 1');
    setIsRequired(false);
    setPlaceholder('');
    setOptions([]);
    setNewOptionLabel('');
  };

  const handleSubmit = () => {
    if (!label.trim() || !selectedArea) return;

    const newField: NewFieldData = {
      label: label.trim(),
      field_type: fieldType,
      section_name: sectionName,
      position_page: selectedArea.page,
      position_x: selectedArea.x,
      position_y: selectedArea.y,
      position_width: selectedArea.width,
      position_height: selectedArea.height,
      validation_rules: {
        required: isRequired,
        email: fieldType === 'email' ? true : undefined,
        phone: fieldType === 'tel' ? true : undefined,
      },
      options: needsOptions ? options : null,
      placeholder: placeholder.trim() || null,
      help_text: null,
    };

    onAddField(newField);
    resetForm();
    onOpenChange(false);
  };

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    setOptions(prev => [
      ...prev,
      {
        value: newOptionLabel.toLowerCase().replace(/\s+/g, '_'),
        label: newOptionLabel.trim()
      }
    ]);
    setNewOptionLabel('');
  };

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Field</DialogTitle>
          <DialogDescription>
            {selectedArea && (
              <span className="text-sm text-gray-500">
                Selected area on Page {selectedArea.page} 
                ({Math.round(selectedArea.x)}, {Math.round(selectedArea.y)})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Field Label */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Field Label <span className="text-red-500">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Worker Name, Date, Signature"
              className="mt-1"
              autoFocus
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Field Type <span className="text-red-500">*</span>
            </label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {FIELD_TYPE_OPTIONS.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options for select types */}
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
                    placeholder="Add option..."
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

          {/* Section */}
          <div>
            <label className="text-sm font-medium text-gray-700">Add to Section</label>
            <Select value={sectionName} onValueChange={setSectionName}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map(section => (
                  <SelectItem key={section} value={section}>{section}</SelectItem>
                ))}
                <SelectItem value="__new__">
                  <span className="text-blue-600">+ Create new section</span>
                </SelectItem>
              </SelectContent>
            </Select>
            {sectionName === '__new__' && (
              <Input
                className="mt-2"
                placeholder="New section name..."
                onChange={(e) => setSectionName(e.target.value)}
              />
            )}
          </div>

          {/* Validation */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Validation</label>
            <div className="flex items-center gap-2 pl-2">
              <Checkbox
                id="required"
                checked={isRequired}
                onCheckedChange={(checked) => setIsRequired(!!checked)}
              />
              <label htmlFor="required" className="text-sm text-gray-600 cursor-pointer">
                Required field
              </label>
            </div>
          </div>

          {/* Placeholder */}
          {['text', 'textarea', 'number', 'email', 'tel'].includes(fieldType) && (
            <div>
              <label className="text-sm font-medium text-gray-700">Placeholder</label>
              <Input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Optional placeholder text..."
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!label.trim() || (needsOptions && options.length === 0)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddFieldDialog;
