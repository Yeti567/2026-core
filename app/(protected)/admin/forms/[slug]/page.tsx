'use client';

/**
 * Form Template Detail Page
 * 
 * View and edit form template details, schema, and settings.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { FormTemplate, FormTemplateStatus, FieldDefinition } from '@/lib/forms/types';

// =============================================================================
// MOCK DATA (Replace with Supabase queries)
// =============================================================================

const MOCK_TEMPLATE: FormTemplate = {
  id: 'a0000000-0000-0000-0000-000000000001',
  company_id: null,
  name: 'Pre-Task Hazard Assessment',
  slug: 'pre-task-hazard-assessment',
  description: 'Daily pre-task hazard identification and control planning',
  icon: '⚠️',
  color: '#f59e0b',
  cor_element: 'element_3',
  audit_category: 'Hazard Identification',
  schema: {
    fields: [
      { id: 'jobsite_id', type: 'jobsite_select', label: 'Jobsite', required: true, order: 1 },
      { id: 'date', type: 'date', label: 'Date', required: true, default: 'today', order: 2 },
      { id: 'time', type: 'time', label: 'Time', required: true, default: 'now', order: 3 },
      { id: 'weather', type: 'weather', label: 'Weather Conditions', required: true, order: 4 },
      { id: 'temperature', type: 'temperature', label: 'Temperature (°C)', required: false, order: 5 },
      { id: 'hazards', type: 'checkbox_group', label: 'Hazards Identified', required: true, order: 6 },
      { id: 'notes', type: 'textarea', label: 'Additional Notes', required: false, order: 9 },
      { id: 'worker_signature', type: 'signature', label: 'Worker Signature', required: true, order: 10 },
      { id: 'photos', type: 'photo', label: 'Photos', required: false, order: 12 },
      { id: 'gps', type: 'gps', label: 'Location', required: false, order: 13 },
    ],
    sections: [
      { id: 'location', title: 'Location & Conditions', fields: ['jobsite_id', 'date', 'time', 'weather', 'temperature'] },
      { id: 'hazards', title: 'Hazard Identification', fields: ['hazards'] },
      { id: 'controls', title: 'Notes', fields: ['notes'] },
      { id: 'signatures', title: 'Sign-Off', fields: ['worker_signature'] },
      { id: 'evidence', title: 'Evidence', fields: ['photos', 'gps'] },
    ],
  },
  settings: {
    require_signature: true,
    require_gps: true,
    allow_photos: true,
    max_photos: 5,
    auto_save_interval: 30000,
    allow_draft: true,
    require_supervisor_signature: false,
    offline_enabled: true,
    sync_priority: 2,
  },
  status: 'published',
  version: 1,
  published_at: '2025-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: FormTemplateStatus): string {
  switch (status) {
    case 'published':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    case 'draft':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'archived':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
  }
}

function getFieldTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    text: '📝',
    textarea: '📄',
    number: '🔢',
    email: '📧',
    phone: '📞',
    date: '📅',
    time: '🕐',
    select: '📋',
    multiselect: '☑️',
    radio: '🔘',
    checkbox: '✅',
    checkbox_group: '☑️',
    signature: '✍️',
    photo: '📷',
    gps: '📍',
    weather: '🌤️',
    temperature: '🌡️',
    yes_no: '👍',
    yes_no_na: '👍',
    checklist: '📋',
    rating: '⭐',
    jobsite_select: '🏗️',
    worker_select: '👤',
    instructions: 'ℹ️',
    section: '📑',
    repeater: '🔄',
  };
  // Safe: type is a controlled field type string from form schema, fallback provided
  // eslint-disable-next-line security/detect-object-injection
  return icons[type] || '📦';
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FormTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'fields' | 'settings' | 'preview'>('overview');

  // Load template
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // In production, fetch by slug from Supabase
      setTemplate(MOCK_TEMPLATE);
      setIsLoading(false);
    }, 500);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-[var(--muted)]">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold mb-2">Template Not Found</h1>
          <p className="text-[var(--muted)] mb-4">
            The form template &quot;{slug}&quot; could not be found.
          </p>
          <Link
            href="/admin/forms"
            className="text-[var(--primary)] hover:underline"
          >
            ← Back to Form Library
          </Link>
        </div>
      </div>
    );
  }

  const isEditable = template.company_id !== null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <div className="text-sm text-[var(--muted)] mb-2">
            <Link href="/admin/forms" className="hover:text-[var(--foreground)]">
              Form Library
            </Link>
            <span className="mx-2">/</span>
            <span>{template.name}</span>
          </div>

          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${template.color}20` }}
              >
                {template.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{template.name}</h1>
                <p className="text-[var(--muted)] mt-1">{template.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                  template.status
                )}`}
              >
                {template.status}
              </span>
              {isEditable ? (
                <button className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors">
                  Edit Template
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Clone template for company customization
                    alert('Clone template functionality coming soon!');
                  }}
                  className="h-10 px-4 bg-[var(--card)] border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--background)] transition-colors"
                >
                  Clone for My Company
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {(['overview', 'fields', 'settings', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] border-b-transparent'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <OverviewTab template={template} />
        )}
        {activeTab === 'fields' && (
          <FieldsTab template={template} isEditable={isEditable} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab template={template} isEditable={isEditable} />
        )}
        {activeTab === 'preview' && (
          <PreviewTab template={template} />
        )}
      </main>
    </div>
  );
}

// =============================================================================
// TAB COMPONENTS
// =============================================================================

function OverviewTab({ template }: { template: FormTemplate }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-sm text-[var(--muted)]">Total Fields</p>
            <p className="text-2xl font-bold mt-1">{template.schema.fields.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-sm text-[var(--muted)]">Required Fields</p>
            <p className="text-2xl font-bold mt-1">
              {template.schema.fields.filter((f) => f.required).length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-sm text-[var(--muted)]">Sections</p>
            <p className="text-2xl font-bold mt-1">{template.schema.sections?.length || 0}</p>
          </div>
        </div>

        {/* COR Audit Info */}
        {template.cor_element && (
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <h3 className="font-semibold mb-3">COR Audit Integration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--muted)]">COR Element</p>
                <p className="font-medium mt-1">
                  {template.cor_element.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Audit Category</p>
                <p className="font-medium mt-1">{template.audit_category || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sections Preview */}
        {template.schema.sections && template.schema.sections.length > 0 && (
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <h3 className="font-semibold mb-3">Form Sections</h3>
            <div className="space-y-2">
              {template.schema.sections.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background)]"
                >
                  <span className="w-6 h-6 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{section.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Meta Info */}
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <h3 className="font-semibold mb-3">Template Info</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Version</dt>
              <dd className="font-medium">{template.version}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Created</dt>
              <dd className="font-medium">{formatDate(template.created_at)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Last Updated</dt>
              <dd className="font-medium">{formatDate(template.updated_at)}</dd>
            </div>
            {template.published_at && (
              <div>
                <dt className="text-[var(--muted)]">Published</dt>
                <dd className="font-medium">{formatDate(template.published_at)}</dd>
              </div>
            )}
            <div>
              <dt className="text-[var(--muted)]">Type</dt>
              <dd className="font-medium">
                {template.company_id ? 'Company Template' : 'System Template'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              href={`/forms/${template.slug}`}
              className="flex items-center gap-2 p-3 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/10 transition-colors"
            >
              <span>📝</span>
              <span>Open Form</span>
            </Link>
            <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/10 transition-colors text-left">
              <span>📊</span>
              <span>View Submissions</span>
            </button>
            <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/10 transition-colors text-left">
              <span>📤</span>
              <span>Export Schema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldsTab({ template, isEditable }: { template: FormTemplate; isEditable: boolean }) {
  return (
    <div className="space-y-4">
      {/* Action Bar */}
      {isEditable && (
        <div className="flex justify-between items-center p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">
            {template.schema.fields.length} fields configured
          </p>
          <button className="h-9 px-4 bg-[var(--primary)] text-white text-sm rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors">
            + Add Field
          </button>
        </div>
      )}

      {/* Fields List */}
      <div className="space-y-2">
        {template.schema.fields
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((field, index) => (
            <div
              key={field.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
            >
              {/* Drag Handle */}
              {isEditable && (
                <span className="cursor-grab text-[var(--muted)]">⋮⋮</span>
              )}

              {/* Order Number */}
              <span className="w-6 h-6 rounded-full bg-[var(--background)] text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>

              {/* Type Icon */}
              <span className="text-xl">{getFieldTypeIcon(field.type)}</span>

              {/* Field Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{field.label}</p>
                  {field.required && (
                    <span className="text-red-400 text-xs">Required</span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {field.type} • ID: {field.id}
                </p>
              </div>

              {/* Actions */}
              {isEditable && (
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]">
                    ✏️
                  </button>
                  <button className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500">
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

function SettingsTab({ template, isEditable }: { template: FormTemplate; isEditable: boolean }) {
  const settings = template.settings;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Behavior Settings */}
      <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
        <h3 className="font-semibold mb-4">Form Behavior</h3>
        <div className="space-y-4">
          <SettingRow
            label="Allow Draft Saving"
            description="Users can save incomplete forms and return later"
            value={settings.allow_draft ?? false}
            type="boolean"
            disabled={!isEditable}
          />
          <SettingRow
            label="Auto-Save Interval"
            description="Automatically save drafts every X milliseconds"
            value={settings.auto_save_interval || 30000}
            suffix="ms"
            type="number"
            disabled={!isEditable}
          />
          <SettingRow
            label="Offline Enabled"
            description="Form can be filled out without internet connection"
            value={settings.offline_enabled ?? false}
            type="boolean"
            disabled={!isEditable}
          />
          <SettingRow
            label="Sync Priority"
            description="Priority in sync queue (1 = highest)"
            value={settings.sync_priority || 3}
            type="number"
            disabled={!isEditable}
          />
        </div>
      </div>

      {/* Required Elements */}
      <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
        <h3 className="font-semibold mb-4">Required Elements</h3>
        <div className="space-y-4">
          <SettingRow
            label="Require Signature"
            description="Worker must sign before submission"
            value={settings.require_signature ?? false}
            type="boolean"
            disabled={!isEditable}
          />
          <SettingRow
            label="Require Supervisor Signature"
            description="Supervisor must co-sign the form"
            value={settings.require_supervisor_signature ?? false}
            type="boolean"
            disabled={!isEditable}
          />
          <SettingRow
            label="Require GPS Location"
            description="Capture GPS coordinates automatically"
            value={settings.require_gps ?? false}
            type="boolean"
            disabled={!isEditable}
          />
        </div>
      </div>

      {/* Photo Settings */}
      <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
        <h3 className="font-semibold mb-4">Photo Settings</h3>
        <div className="space-y-4">
          <SettingRow
            label="Allow Photos"
            description="Users can attach photos to the form"
            value={settings.allow_photos ?? false}
            type="boolean"
            disabled={!isEditable}
          />
          <SettingRow
            label="Maximum Photos"
            description="Maximum number of photos allowed"
            value={settings.max_photos || 10}
            type="number"
            disabled={!isEditable}
          />
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  value,
  type,
  suffix,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean | number | string;
  type: 'boolean' | 'number' | 'string';
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>
      {type === 'boolean' ? (
        <button
          disabled={disabled}
          className={`w-12 h-6 rounded-full transition-colors ${
            value ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
              value ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value as number}
            disabled={disabled}
            className="w-24 h-9 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-right disabled:opacity-50"
          />
          {suffix && <span className="text-sm text-[var(--muted)]">{suffix}</span>}
        </div>
      )}
    </div>
  );
}

function PreviewTab({ template }: { template: FormTemplate }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="p-4 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 text-sm">
        <p className="font-medium">📱 Mobile Preview</p>
        <p className="mt-1">This is how the form will appear on mobile devices.</p>
      </div>

      {/* Mock Phone Frame */}
      <div className="border-8 border-[var(--foreground)]/20 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="bg-[var(--background)] min-h-[600px]">
          {/* Form Header */}
          <header className="bg-[var(--card)] border-b border-[var(--border)] px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{template.icon}</span>
              <div>
                <h1 className="text-lg font-bold">{template.name}</h1>
                <p className="text-xs text-[var(--muted)]">{template.description}</p>
              </div>
            </div>
          </header>

          {/* Form Fields Preview */}
          <div className="p-4 space-y-4">
            {template.schema.fields.slice(0, 5).map((field) => (
              <div key={field.id} className="space-y-1">
                <label className="block text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <div className="h-10 rounded-lg bg-[var(--card)] border border-[var(--border)]" />
              </div>
            ))}
            {template.schema.fields.length > 5 && (
              <p className="text-sm text-[var(--muted)] text-center py-2">
                +{template.schema.fields.length - 5} more fields...
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 p-4 bg-[var(--card)] border-t border-[var(--border)]">
            <button className="w-full h-12 bg-[var(--primary)] text-white rounded-xl font-semibold">
              ✅ Submit
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-[var(--muted)] mt-4">
        <Link
          href={`/forms/${template.slug}`}
          className="text-[var(--primary)] hover:underline"
        >
          Open full preview →
        </Link>
      </p>
    </div>
  );
}
