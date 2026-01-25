'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PDFFieldMapper,
  ConversionFormBuilder,
  AddFieldDialog,
  FormPreviewModal,
  type NewFieldData,
  type SelectedArea
} from '@/components/forms/pdf-converter';
import type {
  PDFFormConversion,
  FormFieldMapping,
  FormCategory,
  ConversionDetailsResponse
} from '@/lib/forms/pdf-conversion-types';
import {
  ArrowLeft,
  Save,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  FileText,
  Sparkles,
  RefreshCw
} from 'lucide-react';

// Auto-save interval in milliseconds (30 seconds)
const AUTO_SAVE_INTERVAL = 30000;

export default function PDFConvertPage() {
  const params = useParams();
  const router = useRouter();
  const conversionId = params.id as string;

  // Data state
  const [conversion, setConversion] = useState<PDFFormConversion | null>(null);
  const [fields, setFields] = useState<FormFieldMapping[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Form metadata state
  const [formName, setFormName] = useState('');
  const [category, setCategory] = useState<FormCategory>('other');
  const [corElements, setCorElements] = useState<number[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [isPublishing, setIsPublishing] = useState(false);

  // Dialog state
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [selectedArea, setSelectedArea] = useState<(SelectedArea & { page: number }) | null>(null);
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Refs for auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversion data
  useEffect(() => {
    async function fetchConversion() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/forms/convert-pdf/${conversionId}`);
        if (!response.ok) {
          throw new Error('Failed to load conversion');
        }

        const data: ConversionDetailsResponse = await response.json();
        
        setConversion(data.conversion);
        setFields(data.field_mappings);
        setPdfUrl(data.pdf_url);

        // Initialize form metadata from AI suggestions or defaults
        const ai = data.conversion.ai_suggested_metadata;
        setFormName(ai?.suggested_form_name || data.conversion.original_pdf_name || 'Unnamed Form');
        setCategory(ai?.suggested_category || 'other');
        setCorElements(ai?.suggested_cor_elements || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversion');
      } finally {
        setIsLoading(false);
      }
    }

    if (conversionId) {
      fetchConversion();
    }
  }, [conversionId]);

  // Mark unsaved changes when fields change
  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    if (!conversion) return;

    try {
      setIsSaving(true);

      // Save fields
      const response = await fetch(`/api/forms/convert-pdf/${conversionId}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          metadata: {
            form_name: formName,
            category,
            cor_elements: corElements
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [conversion, conversionId, fields, formName, category, corElements]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleSaveDraft();
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, isSaving, handleSaveDraft]);

  // Handle field selection from PDF
  const handleFieldClick = (field: FormFieldMapping) => {
    setSelectedFieldId(field.field_id);
  };

  // Handle area selection for new field
  const handleAreaSelect = (area: SelectedArea & { page: number }) => {
    setSelectedArea(area);
    setShowAddFieldDialog(true);
  };

  // Add new field
  const handleAddField = async (newFieldData: NewFieldData) => {
    const newField: FormFieldMapping = {
      id: `temp-${Date.now()}`,
      conversion_id: conversionId,
      field_id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      field_code: newFieldData.label.toLowerCase().replace(/\s+/g, '_'),
      label: newFieldData.label,
      field_type: newFieldData.field_type,
      position_page: newFieldData.position_page,
      position_x: newFieldData.position_x,
      position_y: newFieldData.position_y,
      position_width: newFieldData.position_width,
      position_height: newFieldData.position_height,
      validation_rules: newFieldData.validation_rules,
      options: newFieldData.options,
      conditional_logic: null,
      placeholder: newFieldData.placeholder,
      help_text: newFieldData.help_text,
      default_value: null,
      section_name: newFieldData.section_name,
      section_order: getSectionOrder(newFieldData.section_name),
      field_order: fields.filter(f => f.section_name === newFieldData.section_name).length,
      auto_detected: false,
      manually_added: true,
      edited_by_user: false,
      confidence: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.field_id);
    markUnsaved();
  };

  // Get section order
  const getSectionOrder = (sectionName: string): number => {
    const existingSections = [...new Set(fields.map(f => f.section_name))];
    const index = existingSections.indexOf(sectionName);
    return index >= 0 ? index : existingSections.length;
  };

  // Update field
  const handleFieldUpdate = (updatedField: FormFieldMapping) => {
    setFields(prev =>
      prev.map(f => f.field_id === updatedField.field_id ? updatedField : f)
    );
    markUnsaved();
  };

  // Delete field
  const handleFieldDelete = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.field_id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(undefined);
    }
    markUnsaved();
  };

  // Reorder field
  const handleFieldReorder = (fieldId: string, direction: 'up' | 'down') => {
    setFields(prev => {
      const field = prev.find(f => f.field_id === fieldId);
      if (!field) return prev;

      const sectionFields = prev
        .filter(f => f.section_name === field.section_name)
        .sort((a, b) => a.field_order - b.field_order);

      const currentIndex = sectionFields.findIndex(f => f.field_id === fieldId);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= sectionFields.length) return prev;

      // Safe: Array index is validated to be within bounds before access
      // eslint-disable-next-line security/detect-object-injection
      const otherField = sectionFields[newIndex];

      return prev.map(f => {
        if (f.field_id === fieldId) {
          return { ...f, field_order: otherField.field_order };
        }
        if (f.field_id === otherField.field_id) {
          return { ...f, field_order: field.field_order };
        }
        return f;
      });
    });
    markUnsaved();
  };

  // Add section
  const handleAddSection = () => {
    setShowAddSectionDialog(true);
  };

  const confirmAddSection = () => {
    if (!newSectionName.trim()) return;
    
    // Just set the section name, actual fields will be added later
    setNewSectionName('');
    setShowAddSectionDialog(false);
  };

  // Publish form
  const handlePublish = async () => {
    try {
      setIsPublishing(true);

      // Save first
      await handleSaveDraft();

      // Then publish
      const response = await fetch(`/api/forms/convert-pdf/${conversionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_name: formName,
          category,
          cor_elements: corElements
        })
      });

      if (!response.ok) {
        throw new Error('Failed to publish form');
      }

      const data = await response.json();
      
      setShowPublishDialog(false);
      
      // Redirect to form library
      router.push(`/admin/forms?published=${data.template_id}`);

    } catch (err) {
      console.error('Publish failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish form');
    } finally {
      setIsPublishing(false);
    }
  };

  // Get unique section names
  const sectionNames = [...new Set(fields.map(f => f.section_name || 'Section 1'))];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading conversion...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !conversion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Conversion</h2>
          <p className="text-gray-600 mb-4">{error || 'Conversion not found'}</p>
          <Button onClick={() => router.push('/admin/forms')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back button and title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/forms')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Convert PDF to Digital Form
              </h1>
            </div>
          </div>

          {/* Center: Status indicators */}
          <div className="flex items-center gap-4">
            {conversion.ocr_status === 'processing' && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing OCR...</span>
              </div>
            )}
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Unsaved changes
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPublishDialog(true)}
              disabled={fields.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Publish Form
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/forms')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: PDF Preview */}
        <div className="w-1/2 flex flex-col border-r bg-slate-900">
          <PDFFieldMapper
            conversion={conversion}
            fields={fields}
            pdfUrl={pdfUrl}
            onFieldClick={handleFieldClick}
            onAreaSelect={handleAreaSelect}
            selectedFieldId={selectedFieldId}
            isSelectMode={true}
          />
        </div>

        {/* Right Panel: Form Builder */}
        <div className="w-1/2 flex flex-col">
          <ConversionFormBuilder
            conversion={conversion}
            fields={fields}
            onFieldUpdate={handleFieldUpdate}
            onFieldDelete={handleFieldDelete}
            onFieldReorder={handleFieldReorder}
            onFieldSelect={(field) => setSelectedFieldId(field.field_id)}
            selectedFieldId={selectedFieldId}
            onFormNameChange={(name) => { setFormName(name); markUnsaved(); }}
            onCategoryChange={(cat) => { setCategory(cat); markUnsaved(); }}
            onCorElementsChange={(elements) => { setCorElements(elements); markUnsaved(); }}
            onAddSection={handleAddSection}
            onPreviewForm={() => setShowPreviewDialog(true)}
            onTestSubmit={() => {/* TODO */}}
            formName={formName}
            category={category}
            corElements={corElements}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-white border-t px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>File: {conversion.original_pdf_name}</span>
            <span>•</span>
            <span>{conversion.pdf_page_count || '?'} page(s)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{fields.length} fields</span>
            <span>•</span>
            <span>{sectionNames.length} sections</span>
          </div>
        </div>
      </footer>

      {/* Add Field Dialog */}
      <AddFieldDialog
        open={showAddFieldDialog}
        onOpenChange={setShowAddFieldDialog}
        selectedArea={selectedArea}
        sections={sectionNames}
        onAddField={handleAddField}
      />

      {/* Add Section Dialog */}
      <Dialog open={showAddSectionDialog} onOpenChange={setShowAddSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section to organize your form fields.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">Section Name</label>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., Employee Information, Hazards Identified"
              className="mt-1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddSection} disabled={!newSectionName.trim()}>
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Form</DialogTitle>
            <DialogDescription>
              This will create a new digital form template that can be used by workers.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Form Summary</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>Name:</strong> {formName}</li>
                <li><strong>Category:</strong> {category.replace('_', ' ')}</li>
                <li><strong>COR Elements:</strong> {corElements.length > 0 ? corElements.join(', ') : 'None'}</li>
                <li><strong>Fields:</strong> {fields.length}</li>
                <li><strong>Sections:</strong> {sectionNames.length}</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              Once published, this form will appear in your Forms Library and can be assigned to workers.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publish Form
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Preview Modal */}
      <FormPreviewModal
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        formName={formName}
        fields={fields}
        onTestSubmit={async (data) => {
          // Submit test data
          const response = await fetch(`/api/forms/convert-pdf/${conversionId}/test-submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              form_data: data,
              metadata: { form_name: formName }
            })
          });
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Test submission failed');
          }
        }}
      />
    </div>
  );
}
