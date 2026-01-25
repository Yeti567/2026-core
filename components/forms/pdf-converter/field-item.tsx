'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Edit2, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import type { FormFieldMapping, FieldType } from '@/lib/forms/pdf-conversion-types';
import { FieldEditor } from './field-editor';

interface FieldItemProps {
  field: FormFieldMapping;
  index: number;
  onUpdate: (field: FormFieldMapping) => void;
  onDelete: (fieldId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSelect: () => void;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
}

const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: '📝',
  textarea: '📄',
  number: '#',
  date: '📅',
  time: '🕐',
  datetime: '📆',
  dropdown: '▼',
  radio: '⦿',
  checkbox: '☑',
  multiselect: '☐☐',
  signature: '✍️',
  photo: '📷',
  file: '📎',
  gps: '📍',
  worker_select: '👤',
  jobsite_select: '🏗️',
  equipment_select: '🔧',
  rating: '⭐',
  slider: '↔️',
  yes_no: '✓✗',
  yes_no_na: '✓✗○',
  email: '📧',
  tel: '📞',
  currency: '💲',
  body_diagram: '🧍',
  weather: '🌤️',
  temperature: '🌡️',
  hidden: '👁️‍🗨️',
};

export function FieldItem({
  field,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSelect,
  isSelected,
  isFirst,
  isLast
}: FieldItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSave = (updatedField: FormFieldMapping) => {
    onUpdate({
      ...updatedField,
      edited_by_user: true
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (showConfirmDelete) {
      onDelete(field.field_id);
      setShowConfirmDelete(false);
    } else {
      setShowConfirmDelete(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setShowConfirmDelete(false), 3000);
    }
  };

  if (isEditing) {
    return (
      <FieldEditor
        field={field}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-50 cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Field number */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
        {index + 1}
      </div>

      {/* Field type icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg">
        {FIELD_TYPE_ICONS[field.field_type as FieldType] || '📝'}
      </div>

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 truncate">
            {field.label}
          </span>
          {field.validation_rules?.required && (
            <span className="text-red-500 text-xs">*</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span className="capitalize">{field.field_type.replace('_', ' ')}</span>
          {field.auto_detected && field.confidence !== null && (
            <span className="inline-flex items-center gap-1 text-green-600">
              <Check className="w-3 h-3" />
              {Math.round(field.confidence * 100)}%
            </span>
          )}
          {field.manually_added && (
            <span className="text-blue-600">Manual</span>
          )}
          {field.edited_by_user && (
            <span className="text-purple-600">Edited</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
          title="Edit field"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={isFirst}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 disabled:opacity-30"
          title="Move up"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={isLast}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 disabled:opacity-30"
          title="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className={cn(
            'h-8 w-8 p-0',
            showConfirmDelete
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-gray-500 hover:text-red-600'
          )}
          title={showConfirmDelete ? 'Click again to confirm' : 'Delete field'}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default FieldItem;
