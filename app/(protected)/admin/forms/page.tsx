'use client';

/**
 * Form Library - Admin Interface
 * 
 * Browse, create, edit, and manage form templates.
 * Layer 4 of the Form Builder system.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { FormTemplate, FormTemplateStatus } from '@/lib/forms/types';

// =============================================================================
// MOCK DATA (Replace with Supabase queries)
// =============================================================================

const MOCK_TEMPLATES: FormTemplate[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    company_id: null,
    name: 'Pre-Task Hazard Assessment',
    slug: 'pre-task-hazard-assessment',
    description: 'Daily pre-task hazard identification and control planning',
    icon: '⚠️',
    color: '#f59e0b',
    cor_element: 'element_3',
    audit_category: 'Hazard Identification',
    schema: { fields: [], sections: [] },
    settings: { require_signature: true, require_gps: true, allow_photos: true, offline_enabled: true },
    status: 'published',
    version: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    company_id: null,
    name: 'Site Safety Inspection',
    slug: 'site-inspection',
    description: 'Weekly site safety inspection checklist',
    icon: '🔍',
    color: '#3b82f6',
    cor_element: 'element_7',
    audit_category: 'Inspections',
    schema: { fields: [], sections: [] },
    settings: { require_signature: true, require_gps: true, allow_photos: true, offline_enabled: true },
    status: 'published',
    version: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    company_id: null,
    name: 'Incident Report',
    slug: 'incident-report',
    description: 'Report workplace incidents, injuries, and near misses',
    icon: '🚨',
    color: '#ef4444',
    cor_element: 'element_10',
    audit_category: 'Incident Investigation',
    schema: { fields: [], sections: [] },
    settings: { require_signature: true, require_gps: true, allow_photos: true, offline_enabled: true, sync_priority: 1 },
    status: 'published',
    version: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-05T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    company_id: null,
    name: 'Toolbox Talk',
    slug: 'toolbox-talk',
    description: 'Document safety toolbox talks and worker attendance',
    icon: '🗣️',
    color: '#10b981',
    cor_element: 'element_8',
    audit_category: 'Training & Communication',
    schema: { fields: [], sections: [] },
    settings: { require_signature: true, allow_photos: true, offline_enabled: true },
    status: 'published',
    version: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    company_id: 'company-123',
    name: 'Custom Equipment Check',
    slug: 'custom-equipment-check',
    description: 'Company-specific equipment inspection form',
    icon: '🔧',
    color: '#8b5cf6',
    cor_element: 'element_13',
    audit_category: 'Equipment',
    schema: { fields: [], sections: [] },
    settings: { require_signature: true, offline_enabled: true },
    status: 'draft',
    version: 1,
    created_at: '2025-01-12T00:00:00Z',
    updated_at: '2025-01-12T00:00:00Z',
  },
];

const COR_ELEMENTS = [
  { id: 'element_1', name: 'Health & Safety Policy' },
  { id: 'element_2', name: 'Hazard Assessment' },
  { id: 'element_3', name: 'Hazard Control' },
  { id: 'element_4', name: 'Ongoing Inspections' },
  { id: 'element_5', name: 'Qualifications & Training' },
  { id: 'element_6', name: 'Emergency Response' },
  { id: 'element_7', name: 'Incident Investigation' },
  { id: 'element_8', name: 'Program Administration' },
  { id: 'element_9', name: 'Management Review' },
  { id: 'element_10', name: 'Incident Investigation' },
  { id: 'element_11', name: 'Emergency Preparedness' },
  { id: 'element_12', name: 'Statistics & Records' },
  { id: 'element_13', name: 'Legislation' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FormLibraryPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormTemplateStatus | 'all'>('all');
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load templates
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTemplates(MOCK_TEMPLATES);
      setIsLoading(false);
    }, 500);
  }, []);

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || template.status === statusFilter;

    const matchesElement =
      elementFilter === 'all' || template.cor_element === elementFilter;

    return matchesSearch && matchesStatus && matchesElement;
  });

  // Separate system vs company templates
  const systemTemplates = filteredTemplates.filter((t) => t.company_id === null);
  const companyTemplates = filteredTemplates.filter((t) => t.company_id !== null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-[var(--muted)]">Loading form library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Form Library</h1>
              <p className="text-sm text-[var(--muted)] mt-1">
                {templates.length} form templates available
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/forms/import"
                className="h-10 px-4 bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-purple-500 transition-colors"
              >
                <span>📄</span>
                <span>Import PDF</span>
              </Link>
              <Link
                href="/admin/forms/new"
                className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg font-medium flex items-center gap-2 hover:bg-[var(--primary-hover)] transition-colors"
              >
                <span>+</span>
                <span>New Template</span>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="search"
                placeholder="Search forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 px-4 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FormTemplateStatus | 'all')}
              className="h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* COR Element Filter */}
            <select
              value={elementFilter}
              onChange={(e) => setElementFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm appearance-none cursor-pointer"
            >
              <option value="all">All COR Elements</option>
              {COR_ELEMENTS.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`h-10 px-3 text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--background)] hover:bg-[var(--card)]'
                }`}
              >
                ▦ Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`h-10 px-3 text-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--background)] hover:bg-[var(--card)]'
                }`}
              >
                ≡ List
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* System Templates Section */}
        {systemTemplates.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🏢</span>
              <span>System Templates</span>
              <span className="text-sm font-normal text-[var(--muted)]">
                (Available to all companies)
              </span>
            </h2>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {systemTemplates.map((template) => (
                  <TemplateListItem key={template.id} template={template} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Company Templates Section */}
        {companyTemplates.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>Company Templates</span>
              <span className="text-sm font-normal text-[var(--muted)]">
                (Custom forms for your organization)
              </span>
            </h2>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {companyTemplates.map((template) => (
                  <TemplateListItem key={template.id} template={template} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-[var(--muted)] mb-4">
              {searchQuery || statusFilter !== 'all' || elementFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first custom form template'}
            </p>
            <Link
              href="/admin/forms/new"
              className="inline-flex items-center gap-2 h-10 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              <span>+</span>
              <span>Create Template</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

// =============================================================================
// TEMPLATE CARD COMPONENT
// =============================================================================

function TemplateCard({ template }: { template: FormTemplate }) {
  return (
    <Link
      href={`/admin/forms/${template.slug}`}
      className="block p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 hover:shadow-lg transition-all group"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${template.color}20` }}
        >
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate group-hover:text-[var(--primary)] transition-colors">
            {template.name}
          </h3>
          <p className="text-sm text-[var(--muted)] truncate">
            {template.description}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
            template.status
          )}`}
        >
          {template.status}
        </span>
        {template.cor_element && (
          <span className="px-2 py-0.5 text-xs bg-[var(--background)] text-[var(--muted)] rounded-full">
            {template.cor_element.replace('_', ' ').toUpperCase()}
          </span>
        )}
        <span className="text-xs text-[var(--muted)]">v{template.version}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
        <span>Updated {formatDate(template.updated_at)}</span>
        <span className="text-[var(--primary)] font-medium group-hover:underline">
          {template.company_id ? 'Edit →' : 'View →'}
        </span>
      </div>
    </Link>
  );
}

// =============================================================================
// TEMPLATE LIST ITEM COMPONENT
// =============================================================================

function TemplateListItem({ template }: { template: FormTemplate }) {
  return (
    <Link
      href={`/admin/forms/${template.slug}`}
      className="flex items-center gap-4 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all group"
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: `${template.color}20` }}
      >
        {template.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate group-hover:text-[var(--primary)] transition-colors">
            {template.name}
          </h3>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
              template.status
            )}`}
          >
            {template.status}
          </span>
        </div>
        <p className="text-sm text-[var(--muted)] truncate">
          {template.description}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-sm text-[var(--muted)] flex-shrink-0">
        {template.cor_element && (
          <span className="hidden md:block">
            {template.cor_element.replace('_', ' ').toUpperCase()}
          </span>
        )}
        <span className="hidden sm:block">v{template.version}</span>
        <span className="hidden lg:block">{formatDate(template.updated_at)}</span>
        <span className="text-[var(--primary)]">→</span>
      </div>
    </Link>
  );
}
