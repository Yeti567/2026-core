'use client';

/**
 * Field Type Sidebar
 * 
 * Draggable field types for the form builder.
 */

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FieldType } from '../types';
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  Clock,
  CalendarClock,
  ChevronDown,
  Circle,
  CheckSquare,
  ListChecks,
  PenLine,
  Camera,
  Paperclip,
  MapPin,
  Users,
  Building2,
  Wrench,
  Star,
  SlidersHorizontal,
  ToggleLeft,
  Mail,
  Phone,
  DollarSign,
  PersonStanding,
  Cloud,
  Thermometer,
  EyeOff,
} from 'lucide-react';

interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'basic' | 'choice' | 'media' | 'special' | 'context';
}

const FIELD_TYPES: FieldTypeInfo[] = [
  // Basic fields
  { type: 'text', label: 'Text Input', icon: Type, category: 'basic' },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft, category: 'basic' },
  { type: 'number', label: 'Number', icon: Hash, category: 'basic' },
  { type: 'email', label: 'Email', icon: Mail, category: 'basic' },
  { type: 'phone', label: 'Phone', icon: Phone, category: 'basic' },
  { type: 'currency', label: 'Currency', icon: DollarSign, category: 'basic' },
  
  // Date & Time
  { type: 'date', label: 'Date', icon: Calendar, category: 'basic' },
  { type: 'time', label: 'Time', icon: Clock, category: 'basic' },
  { type: 'datetime', label: 'Date & Time', icon: CalendarClock, category: 'basic' },
  
  // Choice fields
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, category: 'choice' },
  { type: 'radio', label: 'Radio Buttons', icon: Circle, category: 'choice' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, category: 'choice' },
  { type: 'multiselect', label: 'Multi-select', icon: ListChecks, category: 'choice' },
  { type: 'yes_no', label: 'Yes / No', icon: ToggleLeft, category: 'choice' },
  { type: 'yes_no_na', label: 'Yes / No / N/A', icon: ToggleLeft, category: 'choice' },
  { type: 'rating', label: 'Rating', icon: Star, category: 'choice' },
  { type: 'slider', label: 'Slider', icon: SlidersHorizontal, category: 'choice' },
  
  // Media fields
  { type: 'signature', label: 'Signature', icon: PenLine, category: 'media' },
  { type: 'photo', label: 'Photo', icon: Camera, category: 'media' },
  { type: 'file', label: 'File Upload', icon: Paperclip, category: 'media' },
  
  // Context fields
  { type: 'gps', label: 'GPS Location', icon: MapPin, category: 'context' },
  { type: 'worker_select', label: 'Worker', icon: Users, category: 'context' },
  { type: 'jobsite_select', label: 'Jobsite', icon: Building2, category: 'context' },
  { type: 'equipment_select', label: 'Equipment', icon: Wrench, category: 'context' },
  
  // Special fields
  { type: 'body_diagram', label: 'Body Diagram', icon: PersonStanding, category: 'special' },
  { type: 'weather', label: 'Weather', icon: Cloud, category: 'special' },
  { type: 'temperature', label: 'Temperature', icon: Thermometer, category: 'special' },
  { type: 'hidden', label: 'Hidden Field', icon: EyeOff, category: 'special' },
];

const CATEGORIES = [
  { id: 'basic', label: 'Basic Fields' },
  { id: 'choice', label: 'Choice Fields' },
  { id: 'media', label: 'Media & Signatures' },
  { id: 'context', label: 'Context Data' },
  { id: 'special', label: 'Special Fields' },
];

interface DraggableFieldTypeProps {
  fieldType: FieldTypeInfo;
}

function DraggableFieldType({ fieldType }: DraggableFieldTypeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `fieldtype-${fieldType.type}`,
  });
  
  const Icon = fieldType.icon;
  
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border bg-background cursor-grab',
        'hover:bg-muted/50 hover:border-primary/50 transition-colors',
        isDragging && 'opacity-50 cursor-grabbing'
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate">{fieldType.label}</span>
    </div>
  );
}

export function FieldTypeSidebar() {
  return (
    <div className="p-4 space-y-6">
      <p className="text-xs text-muted-foreground">
        Drag fields onto the form canvas to add them
      </p>
      
      {CATEGORIES.map((category) => {
        const fields = FIELD_TYPES.filter(f => f.category === category.id);
        if (fields.length === 0) return null;
        
        return (
          <div key={category.id} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {category.label}
            </h3>
            <div className="grid gap-1">
              {fields.map((fieldType) => (
                <DraggableFieldType key={fieldType.type} fieldType={fieldType} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FieldTypeSidebar;
