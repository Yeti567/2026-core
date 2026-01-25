'use client';

/**
 * Field Mapping Editor Component
 * 
 * Visual editor for mapping and configuring detected PDF fields.
 * Shows side-by-side PDF preview and field list.
 */

import { useState, useMemo } from 'react';
import { 
  ChevronDown,
  ChevronRight,
  GripVertical,
  Eye,
  EyeOff,
  Check,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Type,
  AlignLeft,
  Hash,
  Calendar,
  Clock,
  CircleDot,
  CheckSquare,
  PenTool,
  Camera,
  MapPin,
  Star,
  ToggleLeft,
  Mail,
  Phone,
  Settings,
} from 'lucide-react';
import type { 
  DetectedField, 
  DetectedFieldType,
  SectionConfig,
  FieldOption,
  ValidationRules,
} from '@/lib/pdf-converter/types';
import { FIELD_TYPE_OPTIONS } from '@/lib/pdf-converter/types';

// =============================================================================
// TYPES
// =============================================================================

interface FieldMappingEditorProps {
  fields: DetectedField[];
  sections: SectionConfig[];
  onFieldUpdate: (fieldId: string, updates: Partial<DetectedField>) => void;
  onFieldExclude: (fieldId: string, exclude: boolean) => void;
  onSectionUpdate: (sections: SectionConfig[]) => void;
  onAddField: () => void;
}

// =============================================================================
// FIELD TYPE ICONS
// =============================================================================

const FIELD_ICONS: Record<DetectedFieldType, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  textarea: <AlignLeft className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  time: <Clock className="w-4 h-4" />,
  datetime: <Calendar className="w-4 h-4" />,
  dropdown: <ChevronDown className="w-4 h-4" />,
  radio: <CircleDot className="w-4 h-4" />,
  checkbox: <CheckSquare className="w-4 h-4" />,
  multiselect: <CheckSquare className="w-4 h-4" />,
  signature: <PenTool className="w-4 h-4" />,
  photo: <Camera className="w-4 h-4" />,
  file: <Type className="w-4 h-4" />,
  gps: <MapPin className="w-4 h-4" />,
  worker_select: <Type className="w-4 h-4" />,
  jobsite_select: <Type className="w-4 h-4" />,
  equipment_select: <Type className="w-4 h-4" />,
  rating: <Star className="w-4 h-4" />,
  slider: <Type className="w-4 h-4" />,
  yes_no: <ToggleLeft className="w-4 h-4" />,
  yes_no_na: <ToggleLeft className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  currency: <Type className="w-4 h-4" />,
  body_diagram: <Type className="w-4 h-4" />,
  weather: <Type className="w-4 h-4" />,
  temperature: <Type className="w-4 h-4" />,
  hidden: <EyeOff className="w-4 h-4" />,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FieldMappingEditor({
  fields,
  sections,
  onFieldUpdate,
  onFieldExclude,
  onSectionUpdate,
  onAddField,
}: FieldMappingEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // Group fields by section
  const fieldsBySection = useMemo(() => {
    const grouped: Record<string, DetectedField[]> = {};
    
    for (const section of sections) {
      // Safe: section.id is from sections array
       
      grouped[section.id] = [];
    }
    
    // Default section for ungrouped
     
    grouped['__ungrouped__'] = [];
    
    for (const field of fields) {
      const sectionId = sections.find(s => 
        s.field_ids?.includes(field.id) || s.field_ids?.includes(field.field_code)
      )?.id || '__ungrouped__';
      
      // Safe: sectionId is from sections array or '__ungrouped__'
      // eslint-disable-next-line security/detect-object-injection
      if (!grouped[sectionId]) {
        // eslint-disable-next-line security/detect-object-injection
        grouped[sectionId] = [];
      }
      // eslint-disable-next-line security/detect-object-injection
      grouped[sectionId].push(field);
    }
    
    return grouped;
  }, [fields, sections]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const activeFields = fields.filter(f => !f.is_excluded);
  const excludedFields = fields.filter(f => f.is_excluded);
  const confirmedFields = activeFields.filter(f => f.is_confirmed);

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm text-slate-300">
            {confirmedFields.length} confirmed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm text-slate-300">
            {activeFields.length - confirmedFields.length} pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-sm text-slate-300">
            {excludedFields.length} excluded
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={onAddField}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            fields={fieldsBySection[section.id] || []}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            onFieldUpdate={onFieldUpdate}
            onFieldExclude={onFieldExclude}
            editingFieldId={editingFieldId}
            onEditField={setEditingFieldId}
          />
        ))}

        {/* Ungrouped Fields */}
        {fieldsBySection['__ungrouped__']?.length > 0 && (
          <SectionCard
            section={{
              id: '__ungrouped__',
              title: 'Ungrouped Fields',
              order: 999,
              field_ids: [],
            }}
            fields={fieldsBySection['__ungrouped__']}
            isExpanded={expandedSections.has('__ungrouped__')}
            onToggle={() => toggleSection('__ungrouped__')}
            onFieldUpdate={onFieldUpdate}
            onFieldExclude={onFieldExclude}
            editingFieldId={editingFieldId}
            onEditField={setEditingFieldId}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SECTION CARD
// =============================================================================

interface SectionCardProps {
  section: SectionConfig;
  fields: DetectedField[];
  isExpanded: boolean;
  onToggle: () => void;
  onFieldUpdate: (fieldId: string, updates: Partial<DetectedField>) => void;
  onFieldExclude: (fieldId: string, exclude: boolean) => void;
  editingFieldId: string | null;
  onEditField: (fieldId: string | null) => void;
}

function SectionCard({
  section,
  fields,
  isExpanded,
  onToggle,
  onFieldUpdate,
  onFieldExclude,
  editingFieldId,
  onEditField,
}: SectionCardProps) {
  const activeCount = fields.filter(f => !f.is_excluded).length;
  
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
        <span className="font-medium text-slate-200">{section.title}</span>
        <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded-full">
          {activeCount} field{activeCount !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Fields List */}
      {isExpanded && (
        <div className="border-t border-slate-700">
          {fields.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              No fields in this section
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  isEditing={editingFieldId === field.id}
                  onEdit={() => onEditField(editingFieldId === field.id ? null : field.id)}
                  onUpdate={(updates) => onFieldUpdate(field.id, updates)}
                  onExclude={(exclude) => onFieldExclude(field.id, exclude)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FIELD ROW
// =============================================================================

interface FieldRowProps {
  field: DetectedField;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<DetectedField>) => void;
  onExclude: (exclude: boolean) => void;
}

function FieldRow({ field, isEditing, onEdit, onUpdate, onExclude }: FieldRowProps) {
  const effectiveLabel = field.user_label || field.detected_label;
  const effectiveType = field.user_type || field.suggested_type;
  // Safe: effectiveType is from field type definitions
  // eslint-disable-next-line security/detect-object-injection
  const icon = FIELD_ICONS[effectiveType] || <Type className="w-4 h-4" />;
  
  if (field.is_excluded) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/30 opacity-50">
        <EyeOff className="w-4 h-4 text-slate-500" />
        <span className="flex-1 text-slate-400 line-through">{effectiveLabel}</span>
        <button
          onClick={() => onExclude(false)}
          className="px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Restore
        </button>
      </div>
    );
  }
  
  return (
    <div className={`${isEditing ? 'bg-slate-700/30' : ''}`}>
      {/* Summary Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
        
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center
          ${field.is_confirmed 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-slate-700 text-slate-400'
          }
        `}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200 truncate">
              {effectiveLabel}
            </span>
            {field.is_confirmed && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-1.5 py-0.5 bg-slate-700/50 rounded">
              {effectiveType.replace(/_/g, ' ')}
            </span>
            <span>{Math.round(field.type_confidence)}% confidence</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onUpdate({ is_confirmed: !field.is_confirmed });
            }}
            className={`p-2 rounded-lg transition-colors ${
              field.is_confirmed
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:bg-slate-700'
            }`}
            title={field.is_confirmed ? 'Unconfirm' : 'Confirm'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExclude(true)}
            className="p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
            title="Exclude"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Edit Panel */}
      {isEditing && (
        <FieldEditPanel
          field={field}
          onUpdate={onUpdate}
          onClose={onEdit}
        />
      )}
    </div>
  );
}

// =============================================================================
// FIELD EDIT PANEL
// =============================================================================

interface FieldEditPanelProps {
  field: DetectedField;
  onUpdate: (updates: Partial<DetectedField>) => void;
  onClose: () => void;
}

function FieldEditPanel({ field, onUpdate, onClose }: FieldEditPanelProps) {
  const [label, setLabel] = useState(field.user_label || field.detected_label);
  const [fieldType, setFieldType] = useState<DetectedFieldType>(
    field.user_type || field.suggested_type
  );
  const [required, setRequired] = useState(
    field.user_validation?.required || field.suggested_validation?.required || false
  );
  
  const handleSave = () => {
    onUpdate({
      user_label: label !== field.detected_label ? label : null,
      user_type: fieldType !== field.suggested_type ? fieldType : null,
      user_validation: { required },
      is_confirmed: true,
    });
    onClose();
  };
  
  return (
    <div className="px-4 py-4 bg-slate-800/50 border-t border-slate-700 space-y-4">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Field Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        />
      </div>
      
      {/* Field Type */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Field Type
        </label>
        <select
          value={fieldType}
          onChange={(e) => setFieldType(e.target.value as DetectedFieldType)}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        >
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Required Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRequired(!required)}
          className={`w-10 h-6 rounded-full relative transition-colors ${
            required ? 'bg-indigo-600' : 'bg-slate-600'
          }`}
        >
          <div className={`
            absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
            ${required ? 'left-5' : 'left-1'}
          `} />
        </button>
        <span className="text-sm text-slate-300">Required field</span>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Save Changes
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default FieldMappingEditor;
