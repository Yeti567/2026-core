'use client';

/**
 * Form Preview Component
 * 
 * Shows a preview of the converted form in both mobile and desktop views.
 */

import { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  FileText,
  Calendar,
  Clock,
  CheckSquare,
  PenTool,
  Camera,
  MapPin,
  ChevronDown,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import type { 
  DetectedField, 
  SectionConfig,
  ConversionSession,
  DetectedFieldType,
} from '@/lib/pdf-converter/types';

// =============================================================================
// TYPES
// =============================================================================

interface FormPreviewProps {
  session: ConversionSession;
  fields: DetectedField[];
  sections: SectionConfig[];
}

type ViewMode = 'mobile' | 'desktop';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FormPreview({ session, fields, sections }: FormPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');

  // Filter out excluded fields
  const activeFields = fields.filter(f => !f.is_excluded);

  // Group fields by section
  const fieldsBySection: Record<string, DetectedField[]> = {};
  for (const section of sections) {
    fieldsBySection[section.id] = activeFields.filter(f =>
      section.field_ids?.includes(f.id) || section.field_ids?.includes(f.field_code)
    );
  }

  // Get ungrouped fields
  const groupedFieldIds = new Set(
    sections.flatMap(s => [...(s.field_ids || [])])
  );
  const ungroupedFields = activeFields.filter(
    f => !groupedFieldIds.has(f.id) && !groupedFieldIds.has(f.field_code)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Preview Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <FileText className="w-4 h-4" />
          <span>{session.form_name || 'Untitled Form'}</span>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-700/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === 'mobile'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Mobile
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === 'desktop'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Desktop
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-slate-900/50">
        <div className={`
          bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300
          ${viewMode === 'mobile' 
            ? 'w-[375px] min-h-[667px]' 
            : 'w-full max-w-3xl min-h-[600px]'
          }
        `}>
          {/* Form Header */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white">
            <h2 className="text-xl font-bold mb-1">
              {session.form_name || 'Untitled Form'}
            </h2>
            {session.form_description && (
              <p className="text-indigo-100 text-sm">
                {session.form_description}
              </p>
            )}
            {session.cor_element && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                <span>COR Element {session.cor_element}</span>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* Sections with fields */}
            {sections.map((section) => (
              <PreviewSection
                key={section.id}
                section={section}
                fields={fieldsBySection[section.id] || []}
                viewMode={viewMode}
              />
            ))}

            {/* Ungrouped fields */}
            {ungroupedFields.length > 0 && (
              <PreviewSection
                section={{ id: 'ungrouped', title: 'Additional Fields', order: 999, field_ids: [] }}
                fields={ungroupedFields}
                viewMode={viewMode}
              />
            )}

            {/* No fields message */}
            {activeFields.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No fields to preview</p>
                <p className="text-sm mt-1">Add or restore fields in the mapping step</p>
              </div>
            )}
          </div>

          {/* Form Footer */}
          <div className="border-t border-gray-200 p-6">
            <button
              disabled
              className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl opacity-50 cursor-not-allowed"
            >
              Submit Form
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              This is a preview. The form is not submittable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PREVIEW SECTION
// =============================================================================

interface PreviewSectionProps {
  section: SectionConfig;
  fields: DetectedField[];
  viewMode: ViewMode;
}

function PreviewSection({ section, fields, viewMode }: PreviewSectionProps) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="font-semibold text-gray-900">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-gray-500">{section.description}</p>
        )}
      </div>

      <div className={`
        grid gap-4
        ${viewMode === 'desktop' ? 'grid-cols-2' : 'grid-cols-1'}
      `}>
        {fields.map((field) => (
          <PreviewField
            key={field.id}
            field={field}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PREVIEW FIELD
// =============================================================================

interface PreviewFieldProps {
  field: DetectedField;
  viewMode: ViewMode;
}

function PreviewField({ field, viewMode }: PreviewFieldProps) {
  const label = field.user_label || field.detected_label;
  const type = field.user_type || field.suggested_type;
  const isRequired = field.user_validation?.required || field.suggested_validation?.required;

  return (
    <div className={`${viewMode === 'desktop' && type === 'textarea' ? 'col-span-2' : ''}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <FieldPreviewInput type={type} options={field.user_options || field.suggested_options} />
    </div>
  );
}

// =============================================================================
// FIELD PREVIEW INPUT
// =============================================================================

interface FieldPreviewInputProps {
  type: DetectedFieldType;
  options?: { value: string; label: string }[] | null;
}

function FieldPreviewInput({ type, options }: FieldPreviewInputProps) {
  switch (type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'currency':
      return (
        <input
          type="text"
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400"
          placeholder={type === 'email' ? 'email@example.com' : type === 'phone' ? '(555) 555-5555' : 'Enter text...'}
        />
      );

    case 'textarea':
      return (
        <textarea
          disabled
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 resize-none"
          placeholder="Enter details..."
        />
      );

    case 'number':
      return (
        <input
          type="number"
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400"
          placeholder="0"
        />
      );

    case 'date':
      return (
        <div className="relative">
          <input
            type="text"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 pr-10"
            placeholder="Select date..."
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      );

    case 'time':
      return (
        <div className="relative">
          <input
            type="text"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 pr-10"
            placeholder="Select time..."
          />
          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      );

    case 'dropdown':
      return (
        <div className="relative">
          <select
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 appearance-none"
          >
            <option>Select option...</option>
            {options?.map((opt) => (
              <option key={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {(options || [{ value: 'opt1', label: 'Option 1' }, { value: 'opt2', label: 'Option 2' }]).map((opt, i) => (
            <label key={opt.value} className="flex items-center gap-2 text-gray-500">
              <div className={`w-4 h-4 rounded-full border-2 ${i === 0 ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'} flex items-center justify-center`}>
                {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center">
            <Check className="w-3 h-3 text-transparent" />
          </div>
          <span className="text-sm">Yes</span>
        </label>
      );

    case 'yes_no':
      return (
        <div className="flex gap-2">
          <button disabled className="flex-1 py-2 px-4 rounded-lg border-2 border-gray-300 text-gray-400 text-sm font-medium">
            Yes
          </button>
          <button disabled className="flex-1 py-2 px-4 rounded-lg border-2 border-gray-300 text-gray-400 text-sm font-medium">
            No
          </button>
        </div>
      );

    case 'yes_no_na':
      return (
        <div className="flex gap-2">
          <button disabled className="flex-1 py-2 px-3 rounded-lg border-2 border-gray-300 text-gray-400 text-sm font-medium">
            Yes
          </button>
          <button disabled className="flex-1 py-2 px-3 rounded-lg border-2 border-gray-300 text-gray-400 text-sm font-medium">
            No
          </button>
          <button disabled className="flex-1 py-2 px-3 rounded-lg border-2 border-gray-300 text-gray-400 text-sm font-medium">
            N/A
          </button>
        </div>
      );

    case 'signature':
      return (
        <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center">
            <PenTool className="w-6 h-6 mx-auto mb-1" />
            <span className="text-sm">Sign here</span>
          </div>
        </div>
      );

    case 'photo':
      return (
        <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center">
            <Camera className="w-6 h-6 mx-auto mb-1" />
            <span className="text-sm">Take photo</span>
          </div>
        </div>
      );

    case 'gps':
      return (
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Capture GPS location</span>
        </div>
      );

    case 'rating':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="w-8 h-8 text-gray-300">
              ★
            </div>
          ))}
        </div>
      );

    default:
      return (
        <input
          type="text"
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400"
          placeholder="Enter value..."
        />
      );
  }
}

export default FormPreview;
