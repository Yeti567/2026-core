'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Eye, 
  Play,
  FolderPlus,
  Sparkles,
  CheckCircle2,
  Info
} from 'lucide-react';
import { FieldItem } from './field-item';
import type { 
  PDFFormConversion, 
  FormFieldMapping, 
  FormCategory,
  COR_ELEMENT_NAMES,
  FORM_CATEGORIES 
} from '@/lib/forms/pdf-conversion-types';

interface ConversionFormBuilderProps {
  conversion: PDFFormConversion;
  fields: FormFieldMapping[];
  onFieldUpdate: (field: FormFieldMapping) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldReorder: (fieldId: string, direction: 'up' | 'down') => void;
  onFieldSelect: (field: FormFieldMapping) => void;
  selectedFieldId?: string;
  onFormNameChange: (name: string) => void;
  onCategoryChange: (category: FormCategory) => void;
  onCorElementsChange: (elements: number[]) => void;
  onAddSection: () => void;
  onPreviewForm: () => void;
  onTestSubmit: () => void;
  formName: string;
  category: FormCategory;
  corElements: number[];
}

interface Section {
  name: string;
  fields: FormFieldMapping[];
}

const COR_ELEMENTS: Record<number, string> = {
  1: 'Health & Safety Policy',
  2: 'Hazard Assessment',
  3: 'Safe Work Practices',
  4: 'Safe Job Procedures',
  5: 'Company Safety Rules',
  6: 'Personal Protective Equipment',
  7: 'Preventative Maintenance',
  8: 'Training & Communication',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Preparedness',
  12: 'Statistics & Records',
  13: 'Legislation & Compliance',
  14: 'Management Review',
};

const CATEGORIES: { value: FormCategory; label: string }[] = [
  { value: 'hazard_assessment', label: 'Hazard Assessment' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'incident_report', label: 'Incident Report' },
  { value: 'toolbox_talk', label: 'Toolbox Talk' },
  { value: 'training_record', label: 'Training Record' },
  { value: 'ppe_inspection', label: 'PPE Inspection' },
  { value: 'equipment_inspection', label: 'Equipment Inspection' },
  { value: 'emergency_drill', label: 'Emergency Drill' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'other', label: 'Other (Not COR)' },
];

function groupFieldsBySections(fields: FormFieldMapping[]): Section[] {
  const sections = new Map<string, FormFieldMapping[]>();
  
  // Sort fields by section_order, then field_order
  const sortedFields = [...fields].sort((a, b) => {
    if (a.section_order !== b.section_order) {
      return a.section_order - b.section_order;
    }
    return a.field_order - b.field_order;
  });
  
  for (const field of sortedFields) {
    const sectionName = field.section_name || 'Uncategorized';
    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }
    sections.get(sectionName)!.push(field);
  }
  
  return Array.from(sections.entries()).map(([name, fields]) => ({
    name,
    fields
  }));
}

export function ConversionFormBuilder({
  conversion,
  fields,
  onFieldUpdate,
  onFieldDelete,
  onFieldReorder,
  onFieldSelect,
  selectedFieldId,
  onFormNameChange,
  onCategoryChange,
  onCorElementsChange,
  onAddSection,
  onPreviewForm,
  onTestSubmit,
  formName,
  category,
  corElements
}: ConversionFormBuilderProps) {
  const sections = useMemo(() => groupFieldsBySections(fields), [fields]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.name))
  );

  const toggleCorElement = (element: number) => {
    onCorElementsChange(
      corElements.includes(element)
        ? corElements.filter(e => e !== element)
        : [...corElements, element].sort((a, b) => a - b)
    );
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  // Get all unique section names for the Add Field dialog
  const sectionNames = useMemo(() => {
    const names = new Set<string>();
    fields.forEach(f => names.add(f.section_name || 'Section 1'));
    return Array.from(names);
  }, [fields]);

  // Summary stats
  const autoDetectedCount = fields.filter(f => f.auto_detected).length;
  const manualCount = fields.filter(f => f.manually_added).length;
  const requiredCount = fields.filter(f => f.validation_rules?.required).length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Digital Form Builder</h2>
        <p className="text-sm text-gray-500">Configure your form fields and metadata</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Form Metadata */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Form Details
          </h3>
          
          {/* Form Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">Form Name</label>
            <Input
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              placeholder="e.g., Daily Hazard Assessment"
              className="mt-1"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <Select value={category} onValueChange={(v) => onCategoryChange(v as FormCategory)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* COR Elements */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              COR Elements <span className="text-gray-400 text-xs">(select all that apply)</span>
            </label>
            <div className="grid grid-cols-7 gap-1.5 mt-2">
              {Array.from({ length: 14 }, (_, i) => i + 1).map(element => {
                const isSelected = corElements.includes(element);
                return (
                  <button
                    key={element}
                    type="button"
                    onClick={() => toggleCorElement(element)}
                    className={cn(
                      'relative px-2 py-2 rounded text-sm font-medium transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                    title={COR_ELEMENTS[element]}
                  >
                    {element}
                    {isSelected && (
                      <CheckCircle2 className="absolute -top-1 -right-1 w-3.5 h-3.5 text-white bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected: {corElements.length === 0 ? 'None (Custom tracking form)' : corElements.join(', ')}
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => onCorElementsChange([])}
              className="text-xs text-gray-500 p-0 h-auto mt-1"
            >
              Clear all / Mark as non-COR form
            </Button>
          </div>
        </div>

        {/* AI Suggestions (if available) */}
        {conversion.ai_suggested_metadata && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-purple-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI Suggestions
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ai = conversion.ai_suggested_metadata!;
                  if (ai.suggested_form_name) onFormNameChange(ai.suggested_form_name);
                  if (ai.suggested_category) onCategoryChange(ai.suggested_category);
                  if (ai.suggested_cor_elements) onCorElementsChange(ai.suggested_cor_elements);
                }}
                className="text-purple-700 border-purple-300 hover:bg-purple-100"
              >
                Accept All
              </Button>
            </div>
            <ul className="space-y-2 text-sm">
              {conversion.ai_suggested_metadata.suggested_form_name && (
                <li className="flex items-center gap-2">
                  <span className="text-purple-600">•</span>
                  <span className="text-gray-700">
                    Form Name: <strong>{conversion.ai_suggested_metadata.suggested_form_name}</strong>
                    {conversion.ai_suggested_metadata.confidence && (
                      <span className="text-purple-500 ml-2">
                        ({Math.round(conversion.ai_suggested_metadata.confidence * 100)}% confidence)
                      </span>
                    )}
                  </span>
                </li>
              )}
              {conversion.ai_suggested_metadata.suggested_cor_elements?.length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-purple-600">•</span>
                  <span className="text-gray-700">
                    COR Elements: <strong>{conversion.ai_suggested_metadata.suggested_cor_elements.join(', ')}</strong>
                  </span>
                </li>
              )}
              {conversion.ai_suggested_metadata.reasoning && (
                <li className="flex items-start gap-2 mt-2 pt-2 border-t border-purple-200">
                  <span className="text-purple-600 mt-0.5">💡</span>
                  <span className="text-gray-600 text-xs italic">
                    {conversion.ai_suggested_metadata.reasoning}
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Field Sections */}
        {sections.map((section, sectionIndex) => (
          <div key={section.name} className="bg-white rounded-lg border overflow-hidden">
            {/* Section Header */}
            <button
              type="button"
              onClick={() => toggleSection(section.name)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded',
                  'bg-blue-100 text-blue-700'
                )}>
                  {sectionIndex + 1}
                </span>
                <h3 className="font-semibold text-gray-900">{section.name}</h3>
                <span className="text-xs text-gray-500">
                  ({section.fields.length} field{section.fields.length !== 1 ? 's' : ''})
                </span>
              </div>
              <span className={cn(
                'transform transition-transform',
                expandedSections.has(section.name) ? 'rotate-180' : ''
              )}>
                ▼
              </span>
            </button>

            {/* Section Fields */}
            {expandedSections.has(section.name) && (
              <div className="p-4 space-y-2">
                {section.fields.map((field, fieldIndex) => (
                  <FieldItem
                    key={field.field_id}
                    field={field}
                    index={fieldIndex}
                    onUpdate={onFieldUpdate}
                    onDelete={onFieldDelete}
                    onMoveUp={() => onFieldReorder(field.field_id, 'up')}
                    onMoveDown={() => onFieldReorder(field.field_id, 'down')}
                    onSelect={() => onFieldSelect(field)}
                    isSelected={field.field_id === selectedFieldId}
                    isFirst={fieldIndex === 0}
                    isLast={fieldIndex === section.fields.length - 1}
                  />
                ))}
                
                {section.fields.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No fields in this section yet
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add Section Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddSection}
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Add New Section
        </Button>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 bg-white border-t space-y-3">
        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Fields: {fields.length}</span>
          <span>Sections: {sections.length}</span>
          <span>Required: {requiredCount}</span>
          <span className="text-green-600">Auto: {autoDetectedCount}</span>
          <span className="text-blue-600">Manual: {manualCount}</span>
        </div>
        
        {/* Preview & Test buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onPreviewForm}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Form
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onTestSubmit}
          >
            <Play className="w-4 h-4 mr-2" />
            Test Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConversionFormBuilder;
