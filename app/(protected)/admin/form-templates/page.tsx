'use client';

/**
 * Form Template Library - Enhanced
 * 
 * Admin interface for browsing, creating, and managing form templates.
 * Features COR element filtering, powerful search, bulk actions, and COR coverage visualization.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreVertical,
  Pencil,
  Copy,
  Archive,
  Eye,
  FileText,
  Clock,
  BarChart3,
  Loader2,
  Globe,
  Building,
  Star,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Filter,
  X,
  Sparkles,
  TrendingUp,
  FileJson,
  Check,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { FormTemplate } from '@/components/form-builder/types';
import { formatFrequency, formatEstimatedTime } from '@/components/form-builder/utils';
import { cn } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

// COR elements with proper descriptions
const COR_ELEMENTS = [
  { value: 2, label: 'Hazard ID & Assessment', shortLabel: 'Hazard ID' },
  { value: 3, label: 'Hazard Control', shortLabel: 'Control' },
  { value: 4, label: 'Competency & Training', shortLabel: 'Competency' },
  { value: 5, label: 'Workplace Behavior', shortLabel: 'Behavior' },
  { value: 6, label: 'Personal Protective Equipment', shortLabel: 'PPE' },
  { value: 7, label: 'Maintenance', shortLabel: 'Maintenance' },
  { value: 8, label: 'Training & Communication', shortLabel: 'Training' },
  { value: 9, label: 'Workplace Inspections', shortLabel: 'Inspections' },
  { value: 10, label: 'Incident Investigation', shortLabel: 'Incidents' },
  { value: 11, label: 'Emergency Preparedness', shortLabel: 'Emergency' },
  { value: 12, label: 'Statistics & Records', shortLabel: 'Statistics' },
  { value: 13, label: 'Regulatory Awareness', shortLabel: 'Regulatory' },
  { value: 14, label: 'Management System', shortLabel: 'Management' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'as_needed', label: 'As Needed' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'element_asc', label: 'COR Element (2-14)' },
  { value: 'element_desc', label: 'COR Element (14-2)' },
  { value: 'submissions', label: 'Most Used' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'time_asc', label: 'Shortest First' },
  { value: 'time_desc', label: 'Longest First' },
];

// Element colors for visualization
const ELEMENT_COLORS: Record<number, string> = {
  2: '#3B82F6', // blue
  3: '#10B981', // green
  4: '#F59E0B', // amber
  5: '#EF4444', // red
  6: '#8B5CF6', // purple
  7: '#06B6D4', // cyan
  8: '#EC4899', // pink
  9: '#6366F1', // indigo
  10: '#DC2626', // red-600
  11: '#F97316', // orange
  12: '#14B8A6', // teal
  13: '#A855F7', // purple-500
  14: '#0EA5E9', // sky
};

// =============================================================================
// TYPES
// =============================================================================

interface TemplateWithStats extends FormTemplate {
  submission_count?: number;
  sections_count?: number;
  fields_count?: number;
}

interface CORCoverageData {
  element: number;
  label: string;
  formCount: number;
  submissionCount: number;
  completionRate: number;
}

interface QuickStats {
  totalForms: number;
  companyForms: number;
  globalForms: number;
  totalSubmissions: number;
  mandatoryForms: number;
  activeIssues: number;
  mostUsedForm: string | null;
  completionRate: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function FormTemplatesPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [templates, setTemplates] = useState<TemplateWithStats[]>([]);
  const [globalTemplates, setGlobalTemplates] = useState<TemplateWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterElement, setFilterElement] = useState<number | null>(null);
  const [filterFrequency, setFilterFrequency] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'global' | 'company' | 'mandatory' | 'custom'>('all');
  const [sortBy, setSortBy] = useState('element_asc');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateWithStats | null>(null);
  const [importingTemplates, setImportingTemplates] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [corCoverage, setCORCoverage] = useState<CORCoverageData[]>([]);
  const [activeTab, setActiveTab] = useState<'my-forms' | 'global-library'>('my-forms');
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select(`
          *,
          form_sections (id, form_fields(id)),
          form_submissions (id)
        `)
        .not('company_id', 'is', null)
        .order('name');

      if (error) throw error;

      const templatesWithStats = (data || []).map(t => ({
        ...t,
        submission_count: t.form_submissions?.length || 0,
        sections_count: t.form_sections?.length || 0,
        fields_count: t.form_sections?.reduce((acc: number, s: any) =>
          acc + (s.form_fields?.length || 0), 0) || 0,
      }));

      setTemplates(templatesWithStats);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const loadGlobalTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select(`
          *,
          form_sections (id, form_fields(id)),
          form_submissions (id)
        `)
        .is('company_id', null)
        .eq('is_active', true)
        .order('cor_element', { ascending: true })
        .order('name');

      if (error) throw error;

      const templatesWithStats = (data || []).map(t => ({
        ...t,
        submission_count: t.form_submissions?.length || 0,
        sections_count: t.form_sections?.length || 0,
        fields_count: t.form_sections?.reduce((acc: number, s: any) =>
          acc + (s.form_fields?.length || 0), 0) || 0,
      }));

      setGlobalTemplates(templatesWithStats);
    } catch (err) {
      console.error('Failed to load global templates:', err);
    }
  }, [supabase]);

  const calculateStats = useCallback(() => {
    const allTemplates = [...templates, ...globalTemplates];
    const totalSubmissions = templates.reduce((acc, t) => acc + (t.submission_count || 0), 0);
    const mostUsed = templates.reduce((prev, curr) =>
      (curr.submission_count || 0) > (prev?.submission_count || 0) ? curr : prev,
      templates[0]
    );

    setQuickStats({
      totalForms: allTemplates.length,
      companyForms: templates.length,
      globalForms: globalTemplates.length,
      totalSubmissions,
      mandatoryForms: allTemplates.filter(t => t.is_mandatory).length,
      activeIssues: 0, // TODO: Calculate from incomplete submissions
      mostUsedForm: mostUsed?.name || null,
      completionRate: 94, // TODO: Calculate actual completion rate
    });
  }, [templates, globalTemplates]);

  const calculateCORCoverage = useCallback(() => {
    const coverage: CORCoverageData[] = COR_ELEMENTS.map(el => {
      const elementTemplates = templates.filter(t => t.cor_element === el.value);
      const globalForElement = globalTemplates.filter(t => t.cor_element === el.value);
      const totalForms = elementTemplates.length + globalForElement.length;
      const submissions = elementTemplates.reduce((acc, t) => acc + (t.submission_count || 0), 0);

      // Calculate completion rate (mock for now)
      const completionRate = totalForms > 0
        ? Math.min(100, Math.round((elementTemplates.length / Math.max(1, globalForElement.length)) * 100))
        : 0;

      return {
        element: el.value,
        label: el.shortLabel,
        formCount: totalForms,
        submissionCount: submissions,
        completionRate,
      };
    });

    setCORCoverage(coverage);
  }, [templates, globalTemplates]);

  useEffect(() => {
    loadTemplates();
    loadGlobalTemplates();
  }, [loadTemplates, loadGlobalTemplates]);

  useEffect(() => {
    if (templates.length > 0 || globalTemplates.length > 0) {
      calculateStats();
      calculateCORCoverage();
    }
  }, [templates, globalTemplates, calculateStats, calculateCORCoverage]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  async function handleImportTemplate(templateId: string) {
    setImportingTemplates(prev => new Set([...Array.from(prev), templateId]));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No company found');

      const { data: newTemplateId, error } = await supabase
        .rpc('clone_form_template', {
          p_template_id: templateId,
          p_new_company_id: profile.company_id,
        });

      if (error) throw error;

      await loadTemplates();
      setShowImportDialog(false);

      // Navigate to edit the new template
      router.push(`/admin/form-templates/${newTemplateId}/edit`);
    } catch (err) {
      console.error('Failed to import template:', err);
    } finally {
      setImportingTemplates(prev => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  }

  async function handleBulkImport() {
    for (const templateId of Array.from(selectedTemplates)) {
      await handleImportTemplate(templateId);
    }
    setSelectedTemplates(new Set());
  }

  async function handleDuplicateTemplate(templateId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No company found');

      const { data: newTemplateId, error } = await supabase
        .rpc('clone_form_template', {
          p_template_id: templateId,
          p_new_company_id: profile.company_id,
        });

      if (error) throw error;

      await loadTemplates();
      router.push(`/admin/form-templates/${newTemplateId}/edit`);
    } catch (err) {
      console.error('Failed to duplicate template:', err);
    }
  }

  async function handleToggleActive(templateId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('form_templates')
        .update({ is_active: !isActive })
        .eq('id', templateId);

      if (error) throw error;
      await loadTemplates();
    } catch (err) {
      console.error('Failed to toggle template status:', err);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('Are you sure you want to delete this template? This will also delete all associated sections and fields. This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      await loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }

  function handlePreview(template: TemplateWithStats) {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  }

  function exportTemplateAsJSON(template: TemplateWithStats) {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.form_code || template.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportCSV() {
    setIsExportingCSV(true);
    try {
      const response = await fetch('/api/admin/forms/export-csv');

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cor-forms-checklist.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExportingCSV(false);
    }
  }

  // =============================================================================
  // FILTERING & SORTING
  // =============================================================================

  const filteredAndSortedTemplates = useMemo(() => {
    let result = activeTab === 'my-forms' ? [...templates] : [...globalTemplates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.form_code?.toLowerCase().includes(query)
      );
    }

    // Element filter
    if (filterElement !== null) {
      result = result.filter(t => t.cor_element === filterElement);
    }

    // Frequency filter
    if (filterFrequency) {
      result = result.filter(t => t.frequency === filterFrequency);
    }

    // Status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'mandatory':
          result = result.filter(t => t.is_mandatory);
          break;
        case 'global':
          result = result.filter(t => !t.company_id);
          break;
        case 'company':
          result = result.filter(t => t.company_id);
          break;
      }
    }

    // Sorting
    switch (sortBy) {
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'element_asc':
        result.sort((a, b) => (a.cor_element || 99) - (b.cor_element || 99));
        break;
      case 'element_desc':
        result.sort((a, b) => (b.cor_element || 0) - (a.cor_element || 0));
        break;
      case 'submissions':
        result.sort((a, b) => (b.submission_count || 0) - (a.submission_count || 0));
        break;
      case 'recent':
        result.sort((a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        break;
      case 'time_asc':
        result.sort((a, b) =>
          (a.estimated_time_minutes || 999) - (b.estimated_time_minutes || 999)
        );
        break;
      case 'time_desc':
        result.sort((a, b) =>
          (b.estimated_time_minutes || 0) - (a.estimated_time_minutes || 0)
        );
        break;
    }

    return result;
  }, [templates, globalTemplates, activeTab, searchQuery, filterElement, filterFrequency, filterStatus, sortBy]);

  // Grouped by element
  const groupedByElement = useMemo(() => {
    const grouped: Record<number, TemplateWithStats[]> = {};
    filteredAndSortedTemplates.forEach(t => {
      const el = t.cor_element || 0;
      // Safe: el is a number from template data, used as Record key for grouping
      // eslint-disable-next-line security/detect-object-injection
      if (!grouped[el]) grouped[el] = [];
      // eslint-disable-next-line security/detect-object-injection
      grouped[el].push(t);
    });
    return grouped;
  }, [filteredAndSortedTemplates]);

  // Element counts for filter
  const elementCounts = useMemo(() => {
    const sourceTemplates = activeTab === 'my-forms' ? templates : globalTemplates;
    const counts: Record<number, number> = {};
    sourceTemplates.forEach(t => {
      const el = t.cor_element || 0;
      // Safe: el is a number from template data, used as Record key for counting
      // eslint-disable-next-line security/detect-object-injection
      counts[el] = (counts[el] || 0) + 1;
    });
    return counts;
  }, [templates, globalTemplates, activeTab]);

  // Get icon component
  const getIcon = useCallback((iconName: string) => {
    if (!iconName) return FileText;
    // Convert kebab-case or snake_case to PascalCase
    const name = iconName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
    // Safe: name is derived from iconName with string transformations, fallback provided
    // eslint-disable-next-line security/detect-object-injection
    return icons[name] || FileText;
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterElement(null);
    setFilterFrequency(null);
    setFilterStatus('all');
    setSortBy('element_asc');
  };

  const hasActiveFilters = searchQuery || filterElement !== null || filterFrequency || filterStatus !== 'all';

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Form Template Library
            </h1>
            <p className="text-muted-foreground mt-1">
              COR-compliant safety documentation forms for your organization
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExportingCSV}
            >
              {isExportingCSV ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Download CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab('global-library');
                setShowImportDialog(true);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Import from Library
            </Button>
            <Button onClick={() => router.push('/admin/form-templates/new/edit')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Form
            </Button>
          </div>
        </div>

        {/* Quick Stats Dashboard */}
        {quickStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs">Total Forms</p>
                    <p className="text-2xl font-bold">{quickStats.totalForms}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-xs">Your Forms</p>
                    <p className="text-2xl font-bold">{quickStats.companyForms}</p>
                  </div>
                  <Building className="h-8 w-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs">Global Library</p>
                    <p className="text-2xl font-bold">{quickStats.globalForms}</p>
                  </div>
                  <Globe className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-xs">Submissions</p>
                    <p className="text-2xl font-bold">{quickStats.totalSubmissions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-rose-100 text-xs">Mandatory</p>
                    <p className="text-2xl font-bold">{quickStats.mandatoryForms}</p>
                  </div>
                  <Star className="h-8 w-8 text-rose-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-xs">Completion</p>
                    <p className="text-2xl font-bold">{quickStats.completionRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-cyan-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* COR Coverage Visualization */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">COR Element Coverage</CardTitle>
                <CardDescription>Click an element to filter forms</CardDescription>
              </div>
              {filterElement !== null && (
                <Button variant="ghost" size="sm" onClick={() => setFilterElement(null)}>
                  <X className="h-4 w-4 mr-1" />
                  Clear filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-2">
              {corCoverage.map((cov) => {
                const isSelected = filterElement === cov.element;
                const color = ELEMENT_COLORS[cov.element];
                return (
                  <button
                    key={cov.element}
                    onClick={() => setFilterElement(isSelected ? null : cov.element)}
                    className={cn(
                      "relative p-3 rounded-lg border-2 transition-all hover:scale-105",
                      isSelected
                        ? "ring-2 ring-offset-2"
                        : "hover:border-gray-300 dark:hover:border-gray-600",
                    )}
                    style={{
                      borderColor: isSelected ? color : 'transparent',
                      backgroundColor: isSelected ? `${color}15` : undefined,
                      ['--tw-ring-color' as string]: color,
                    }}
                  >
                    <div
                      className="text-xs font-bold mb-1"
                      style={{ color: color }}
                    >
                      {cov.element}
                    </div>
                    <div className="text-xs font-medium truncate text-gray-700 dark:text-gray-300">
                      {cov.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {cov.formCount} forms
                    </div>
                    {/* Coverage indicator */}
                    <div className="absolute bottom-1 left-1 right-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cov.completionRate}%`,
                          backgroundColor: cov.completionRate >= 80
                            ? '#10B981'
                            : cov.completionRate >= 50
                              ? '#F59E0B'
                              : '#EF4444'
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for My Forms vs Global Library */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="my-forms" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              My Forms
              <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="global-library" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Global Library
              <Badge variant="secondary" className="ml-1">{globalTemplates.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search forms by name, description, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={filterFrequency || 'all'}
              onValueChange={(v) => setFilterFrequency(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mandatory">Mandatory Only</SelectItem>
                {activeTab === 'my-forms' && (
                  <>
                    <SelectItem value="company">Custom Forms</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTemplates.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg mb-6">
            <span className="text-sm font-medium">
              {selectedTemplates.size} form{selectedTemplates.size !== 1 ? 's' : ''} selected
            </span>
            <Button size="sm" onClick={handleBulkImport}>
              <Download className="h-4 w-4 mr-2" />
              Import Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTemplates(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedTemplates.length} form{filteredAndSortedTemplates.length !== 1 ? 's' : ''}
            {filterElement !== null && ` in Element ${filterElement}`}
          </p>
        </div>

        {/* Template Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAndSortedTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No form templates found</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : activeTab === 'my-forms'
                    ? 'Get started by importing from the global library'
                    : 'No global templates available'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAndSortedTemplates.map((template) => {
              const Icon = getIcon(template.icon);
              const elementColor = ELEMENT_COLORS[template.cor_element || 0] || '#6B7280';
              const isSelected = selectedTemplates.has(template.id);
              const isImporting = importingTemplates.has(template.id);

              return (
                <Card
                  key={template.id}
                  className={cn(
                    "group hover:shadow-lg transition-all cursor-pointer relative overflow-hidden",
                    isSelected && "ring-2 ring-blue-500"
                  )}
                >
                  {/* Top border accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: elementColor }}
                  />

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {activeTab === 'global-library' && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedTemplates);
                              if (checked) {
                                next.add(template.id);
                              } else {
                                next.delete(template.id);
                              }
                              setSelectedTemplates(next);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                        )}
                        <div
                          className="rounded-lg p-2.5 transition-transform group-hover:scale-110"
                          style={{ backgroundColor: `${elementColor}20` }}
                        >
                          <Icon
                            className="h-5 w-5"
                            style={{ color: elementColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle
                            className="text-base truncate cursor-pointer hover:text-blue-600"
                            onClick={() => router.push(`/admin/form-templates/${template.id}`)}
                          >
                            {template.name}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5 flex items-center gap-2">
                            <span>{template.form_code}</span>
                            {template.version && (
                              <span className="text-muted-foreground">v{template.version}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          {activeTab === 'global-library' ? (
                            <DropdownMenuItem
                              onClick={() => handleImportTemplate(template.id)}
                              disabled={isImporting}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Import to My Forms
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/form-templates/${template.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/form-templates/${template.id}/submissions`)}
                              >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Submissions
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => exportTemplateAsJSON(template)}>
                            <FileJson className="h-4 w-4 mr-2" />
                            Export JSON
                          </DropdownMenuItem>
                          {activeTab === 'my-forms' && (
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(template.id, template.is_active)}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              {template.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          )}
                          {activeTab === 'my-forms' && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent
                    className="pt-0"
                    onClick={() => router.push(`/admin/form-templates/${template.id}`)}
                  >
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                      {template.description || 'No description provided'}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: elementColor,
                          color: elementColor,
                        }}
                      >
                        Element {template.cor_element}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {formatFrequency(template.frequency)}
                      </Badge>
                      {template.is_mandatory && (
                        <Badge variant="destructive" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Required
                        </Badge>
                      )}
                      {!template.company_id && (
                        <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                          <Globe className="h-3 w-3 mr-1" />
                          Global
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatEstimatedTime(template.estimated_time_minutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {template.sections_count || 0} sections
                      </span>
                      {activeTab === 'my-forms' && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {template.submission_count || 0}
                        </span>
                      )}
                    </div>

                    {/* Import Button for Global Library */}
                    {activeTab === 'global-library' && (
                      <Button
                        className="w-full mt-3"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportTemplate(template.id);
                        }}
                        disabled={isImporting}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Import to My Forms
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  {(() => {
                    const Icon = getIcon(previewTemplate.icon);
                    const color = ELEMENT_COLORS[previewTemplate.cor_element || 0] || '#6B7280';
                    return (
                      <div
                        className="rounded-lg p-2.5"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="h-6 w-6" style={{ color }} />
                      </div>
                    );
                  })()}
                  <div>
                    <DialogTitle className="text-xl">{previewTemplate.name}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {previewTemplate.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Form Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">COR Element</p>
                    <p className="font-medium">Element {previewTemplate.cor_element}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="font-medium">{formatFrequency(previewTemplate.frequency)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Est. Time</p>
                    <p className="font-medium">{formatEstimatedTime(previewTemplate.estimated_time_minutes)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Sections</p>
                    <p className="font-medium">{previewTemplate.sections_count || 0}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.is_mandatory && (
                    <Badge variant="destructive">
                      <Star className="h-3 w-3 mr-1" />
                      Mandatory
                    </Badge>
                  )}
                  {!previewTemplate.company_id && (
                    <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                      <Globe className="h-3 w-3 mr-1" />
                      Global Template
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {previewTemplate.fields_count || 0} fields
                  </Badge>
                </div>

                {/* Workflow Info */}
                {previewTemplate.form_workflows && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Workflow Configuration
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Submissions go to: <span className="font-medium text-foreground">Supervisor</span></p>
                      <p>• Requires approval: <span className="font-medium text-foreground">Yes</span></p>
                      <p>• Creates follow-up task: <span className="font-medium text-foreground">When required</span></p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                  Close
                </Button>
                {!previewTemplate.company_id ? (
                  <Button
                    onClick={() => {
                      handleImportTemplate(previewTemplate.id);
                      setShowPreviewDialog(false);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Import This Form
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      router.push(`/admin/form-templates/${previewTemplate.id}`);
                      setShowPreviewDialog(false);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
