'use client';

/**
 * Form Canvas
 * 
 * Main area where sections and fields are arranged.
 */

import { useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFormBuilderStore } from '@/lib/stores/form-builder-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';
import { FormField, FormSection } from '../types';
import { getWidthClass } from '../utils';
import * as LucideIcons from 'lucide-react';

interface FormCanvasProps {
  activeId: string | null;
  overId: string | null;
}

export function FormCanvas({ activeId, overId }: FormCanvasProps) {
  const {
    sections,
    addSection,
    selectSection,
    selectedSectionId,
    getSectionFields,
  } = useFormBuilderStore();
  
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <SortableContext
        items={sections.map(s => `section-${s.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {sections.map((section) => (
          <SortableSection
            key={section.id}
            section={section}
            fields={getSectionFields(section.id)}
            isSelected={selectedSectionId === section.id}
            isOver={overId === `section-${section.id}`}
            onSelect={() => selectSection(section.id)}
          />
        ))}
      </SortableContext>
      
      {sections.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Your form is empty. Add a section to get started.
          </p>
          <Button onClick={() => addSection()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      )}
      
      {sections.length > 0 && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => addSection()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      )}
    </div>
  );
}

interface SortableSectionProps {
  section: FormSection;
  fields: FormField[];
  isSelected: boolean;
  isOver: boolean;
  onSelect: () => void;
}

function SortableSection({
  section,
  fields,
  isSelected,
  isOver,
  onSelect,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `section-${section.id}` });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const {
    deleteSection,
    duplicateSection,
    selectField,
    selectedFieldId,
    addField,
  } = useFormBuilderStore();
  
  const { setNodeRef: dropRef, isOver: isDropOver } = useDroppable({
    id: section.id,
  });
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all',
        isDragging && 'opacity-50 shadow-lg',
        isSelected && 'ring-2 ring-primary',
        isOver && 'ring-2 ring-primary/50'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return;
        onSelect();
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab p-1 -ml-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <CardTitle className="text-base">
              {section.title || 'Untitled Section'}
            </CardTitle>
            {section.is_repeatable && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                Repeatable
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                duplicateSection(section.id);
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteSection(section.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {section.description}
          </p>
        )}
      </CardHeader>
      <CardContent ref={dropRef}>
        <div className={cn(
          'min-h-[100px] rounded-lg transition-colors',
          isDropOver && 'bg-primary/5 border-2 border-dashed border-primary/30'
        )}>
          {fields.length > 0 ? (
            <SortableContext
              items={fields.map(f => `field-${f.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-wrap -mx-1">
                {fields.map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    isSelected={selectedFieldId === field.id}
                    onSelect={() => selectField(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              Drag fields here or click to add
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            addField(section.id, { field_type: 'text', label: 'New Field' });
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </CardContent>
    </Card>
  );
}

interface SortableFieldProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableField({ field, isSelected, onSelect }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `field-${field.id}` });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const { deleteField, duplicateField } = useFormBuilderStore();
  
  const widthClass = getWidthClass(field.width);
  const Icon = getFieldIcon(field.field_type);
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('p-1', widthClass)}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'border rounded-lg p-3 bg-background cursor-grab transition-all',
          'hover:border-primary/50 hover:shadow-sm',
          isSelected && 'border-primary ring-1 ring-primary',
          isDragging && 'opacity-50 shadow-lg cursor-grabbing'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div className="flex items-start gap-2">
          <div className="p-1 -ml-1 -mt-1 flex-shrink-0">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm truncate">
                {field.label}
                {field.validation_rules?.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {getFieldTypeLabel(field.field_type)}
              {field.width !== 'full' && ` • ${field.width}`}
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                duplicateField(field.id);
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteField(field.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFieldIcon(type: string): React.ComponentType<{ className?: string }> {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    text: LucideIcons.Type,
    textarea: LucideIcons.AlignLeft,
    number: LucideIcons.Hash,
    date: LucideIcons.Calendar,
    time: LucideIcons.Clock,
    datetime: LucideIcons.CalendarClock,
    dropdown: LucideIcons.ChevronDown,
    radio: LucideIcons.Circle,
    checkbox: LucideIcons.CheckSquare,
    multiselect: LucideIcons.ListChecks,
    signature: LucideIcons.PenLine,
    multi_signature: LucideIcons.Users,
    photo: LucideIcons.Camera,
    flagged_photo: LucideIcons.Flag,
    file: LucideIcons.Paperclip,
    gps: LucideIcons.MapPin,
    worker_select: LucideIcons.Users,
    jobsite_select: LucideIcons.Building2,
    equipment_select: LucideIcons.Wrench,
    rating: LucideIcons.Star,
    slider: LucideIcons.SlidersHorizontal,
    yes_no: LucideIcons.ToggleLeft,
    yes_no_na: LucideIcons.ToggleLeft,
    email: LucideIcons.Mail,
    phone: LucideIcons.Phone,
    currency: LucideIcons.DollarSign,
  };
  // Safe: type is field type string from form definition
  // eslint-disable-next-line security/detect-object-injection
  return icons[type] || LucideIcons.HelpCircle;
}

function getFieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: 'Text',
    textarea: 'Text Area',
    number: 'Number',
    date: 'Date',
    time: 'Time',
    datetime: 'Date & Time',
    dropdown: 'Dropdown',
    radio: 'Radio',
    checkbox: 'Checkbox',
    multiselect: 'Multi-select',
    signature: 'Signature',
    multi_signature: 'Multi-Signature',
    photo: 'Photo',
    flagged_photo: 'Photo + Flag',
    file: 'File',
    gps: 'GPS',
    worker_select: 'Worker',
    jobsite_select: 'Jobsite',
    equipment_select: 'Equipment',
    rating: 'Rating',
    slider: 'Slider',
    yes_no: 'Yes/No',
    yes_no_na: 'Yes/No/N/A',
    email: 'Email',
    phone: 'Phone',
    currency: 'Currency',
  };
  // Safe: type is field type string from form definition
  // eslint-disable-next-line security/detect-object-injection
  return labels[type] || type;
}

export default FormCanvas;
