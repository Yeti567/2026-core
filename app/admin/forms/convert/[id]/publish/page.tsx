'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Upload,
  Loader2,
  CheckCircle2,
  FileText,
  Users,
  Mail,
  Shield,
  Clock,
  AlertCircle,
  Sparkles,
  Eye
} from 'lucide-react';
import type { 
  PDFFormConversion, 
  FormFieldMapping, 
  FormCategory 
} from '@/lib/forms/pdf-conversion-types';

// =============================================================================
// TYPES
// =============================================================================

interface PublishOptions {
  form_name: string;
  description: string;
  category: FormCategory;
  cor_elements: number[];
  frequency: string;
  estimated_time_minutes: number;
  is_mandatory: boolean;
  make_available_to_all: boolean;
  attach_original_pdf: boolean;
  notify_supervisors: boolean;
  send_training_email: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COR_ELEMENTS = [
  { num: 1, name: 'Health & Safety Policy' },
  { num: 2, name: 'Hazard Assessment' },
  { num: 3, name: 'Safe Work Practices' },
  { num: 4, name: 'Safe Job Procedures' },
  { num: 5, name: 'Company Safety Rules' },
  { num: 6, name: 'Personal Protective Equipment' },
  { num: 7, name: 'Preventative Maintenance' },
  { num: 8, name: 'Training & Communication' },
  { num: 9, name: 'Workplace Inspections' },
  { num: 10, name: 'Incident Investigation' },
  { num: 11, name: 'Emergency Preparedness' },
  { num: 12, name: 'Statistics & Records' },
  { num: 13, name: 'Legislation & Compliance' },
  { num: 14, name: 'Management Review' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'as_needed', label: 'As Needed' },
  { value: 'per_job', label: 'Per Job' },
  { value: 'per_shift', label: 'Per Shift' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function PublishFormPage() {
  const params = useParams();
  const router = useRouter();
  const conversionId = params.id as string;

  // Data state
  const [conversion, setConversion] = useState<PDFFormConversion | null>(null);
  const [fields, setFields] = useState<FormFieldMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishedTemplateId, setPublishedTemplateId] = useState<string | null>(null);

  // Publish options
  const [options, setOptions] = useState<PublishOptions>({
    form_name: '',
    description: '',
    category: 'other',
    cor_elements: [],
    frequency: 'as_needed',
    estimated_time_minutes: 15,
    is_mandatory: false,
    make_available_to_all: true,
    attach_original_pdf: true,
    notify_supervisors: true,
    send_training_email: false,
  });

  // Fetch conversion data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/forms/convert-pdf/${conversionId}`);
        if (!response.ok) throw new Error('Failed to load conversion');
        
        const data = await response.json();
        setConversion(data.conversion);
        setFields(data.field_mappings);

        // Initialize options from AI suggestions
        const ai = data.conversion.ai_suggested_metadata;
        setOptions(prev => ({
          ...prev,
          form_name: ai?.suggested_form_name || data.conversion.original_pdf_name || '',
          category: ai?.suggested_category || 'other',
          cor_elements: ai?.suggested_cor_elements || [],
          description: `Converted from PDF: ${data.conversion.original_pdf_name}`,
          estimated_time_minutes: Math.max(5, Math.ceil((data.field_mappings?.length || 10) * 0.5)),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [conversionId]);

  // Toggle COR element
  const toggleCorElement = (elementNum: number) => {
    setOptions(prev => ({
      ...prev,
      cor_elements: prev.cor_elements.includes(elementNum)
        ? prev.cor_elements.filter(e => e !== elementNum)
        : [...prev.cor_elements, elementNum].sort((a, b) => a - b),
    }));
  };

  // Publish form
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setError(null);

      const response = await fetch(`/api/forms/convert-pdf/${conversionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish');
      }

      const data = await response.json();
      setPublishSuccess(true);
      setPublishedTemplateId(data.template_id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  // Group fields by section for preview
  const sections = fields.reduce((acc, field) => {
    const section = field.section_name || 'Form Fields';
    // Safe: Section name is sanitized string from field data, not user input
    // eslint-disable-next-line security/detect-object-injection
    if (!acc[section]) acc[section] = [];
    // Safe: Section name is sanitized string from field data, not user input
    // eslint-disable-next-line security/detect-object-injection
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormFieldMapping[]>);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading conversion...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (publishSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Published!</h2>
            <p className="text-gray-600 mb-6">
              Your form "{options.form_name}" has been successfully published and is now available in the Forms Library.
            </p>
            
            {options.cor_elements.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Audit Evidence Created
                </h3>
                <p className="text-sm text-blue-800">
                  This form has been linked to COR Element{options.cor_elements.length > 1 ? 's' : ''}{' '}
                  <strong>{options.cor_elements.join(', ')}</strong>. 
                  Form submissions will automatically appear as audit evidence.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/admin/forms')}
              >
                View Forms Library
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push(`/admin/forms/${publishedTemplateId}`)}
              >
                View Published Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (!conversion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Conversion Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'Unable to load conversion data'}</p>
            <Button onClick={() => router.push('/admin/forms')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/forms/convert/${conversionId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Publish Form</h1>
          <p className="text-gray-600 mt-1">Review and publish your converted form</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Conversion Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Form Conversion Complete</h2>
                <p className="text-sm text-gray-500">Ready to publish to your Forms Library</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
              <div>
                <p className="text-2xl font-bold text-gray-900">{fields.length}</p>
                <p className="text-sm text-gray-500">Fields</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(sections).length}</p>
                <p className="text-sm text-gray-500">Sections</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{conversion.pdf_page_count || 1}</p>
                <p className="text-sm text-gray-500">PDF Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Form Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Form Name</label>
                <Input
                  value={options.form_name}
                  onChange={(e) => setOptions(p => ({ ...p, form_name: e.target.value }))}
                  placeholder="e.g., Daily Hazard Assessment"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Input
                  value={options.description}
                  onChange={(e) => setOptions(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this form"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Frequency</label>
                <Select
                  value={options.frequency}
                  onValueChange={(v) => setOptions(p => ({ ...p, frequency: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Estimated Time (minutes)</label>
                <Input
                  type="number"
                  value={options.estimated_time_minutes}
                  onChange={(e) => setOptions(p => ({ ...p, estimated_time_minutes: parseInt(e.target.value) || 15 }))}
                  min={1}
                  max={120}
                  className="mt-1 w-24"
                />
              </div>
            </CardContent>
          </Card>

          {/* COR Elements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                COR Audit Elements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Select which COR elements this form provides evidence for. 
                Form submissions will automatically link to your audit package.
              </p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {COR_ELEMENTS.map(element => {
                  const isSelected = options.cor_elements.includes(element.num);
                  return (
                    <button
                      key={element.num}
                      type="button"
                      onClick={() => toggleCorElement(element.num)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                        isSelected
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      )}>
                        {element.num}
                      </div>
                      <span className={cn(
                        'flex-1 text-sm',
                        isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'
                      )}>
                        {element.name}
                      </span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              {options.cor_elements.length === 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Non-COR Form:</strong> This form will be available for custom tracking 
                    but won't be linked to audit evidence.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Publishing Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Publishing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="available_all"
                  checked={options.make_available_to_all}
                  onCheckedChange={(c) => setOptions(p => ({ ...p, make_available_to_all: !!c }))}
                />
                <div>
                  <label htmlFor="available_all" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Make available to all workers
                  </label>
                  <p className="text-xs text-gray-500">Form will appear in every worker's form list</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="attach_pdf"
                  checked={options.attach_original_pdf}
                  onCheckedChange={(c) => setOptions(p => ({ ...p, attach_original_pdf: !!c }))}
                />
                <div>
                  <label htmlFor="attach_pdf" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Attach original PDF as reference
                  </label>
                  <p className="text-xs text-gray-500">Workers can view the original PDF</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="mandatory"
                  checked={options.is_mandatory}
                  onCheckedChange={(c) => setOptions(p => ({ ...p, is_mandatory: !!c }))}
                />
                <div>
                  <label htmlFor="mandatory" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Set as mandatory form
                  </label>
                  <p className="text-xs text-gray-500">Workers must complete this form at the required frequency</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="notify_supervisors"
                  checked={options.notify_supervisors}
                  onCheckedChange={(c) => setOptions(p => ({ ...p, notify_supervisors: !!c }))}
                />
                <div>
                  <label htmlFor="notify_supervisors" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Notify supervisors
                  </label>
                  <p className="text-xs text-gray-500">Send notification that new form is available</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="training_email"
                  checked={options.send_training_email}
                  onCheckedChange={(c) => setOptions(p => ({ ...p, send_training_email: !!c }))}
                />
                <div>
                  <label htmlFor="training_email" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Send training email to all workers
                  </label>
                  <p className="text-xs text-gray-500">Workers receive instructions on how to use this form</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Form Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white border rounded-lg p-6 max-h-[400px] overflow-y-auto">
              <div className="text-center border-b pb-4 mb-4">
                <h3 className="text-xl font-bold text-gray-900">{options.form_name || 'Unnamed Form'}</h3>
                <p className="text-sm text-gray-500 mt-1">{options.description}</p>
                {options.cor_elements.length > 0 && (
                  <div className="flex justify-center gap-2 mt-2">
                    {options.cor_elements.map(e => (
                      <span key={e} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Element {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {Object.entries(sections).map(([sectionName, sectionFields]) => (
                <div key={sectionName} className="mb-6">
                  <h4 className="font-semibold text-gray-800 border-b pb-2 mb-3">{sectionName}</h4>
                  <div className="space-y-3">
                    {sectionFields
                      .sort((a, b) => a.field_order - b.field_order)
                      .map(field => (
                        <div key={field.field_id} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 min-w-[140px]">
                            {field.label}
                            {field.validation_rules?.required && (
                              <span className="text-red-500 ml-0.5">*</span>
                            )}
                          </span>
                          <div className="flex-1 h-8 bg-gray-50 rounded border border-gray-200 px-2 flex items-center">
                            <span className="text-xs text-gray-400 capitalize">
                              {field.field_type.replace('_', ' ')} field
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/forms/convert/${conversionId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>

          <Button
            size="lg"
            onClick={handlePublish}
            disabled={isPublishing || !options.form_name.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Publish Form
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
