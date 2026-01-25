'use client';

/**
 * PDF Converter Wizard Component
 * 
 * Main orchestrator for the PDF-to-Digital Form conversion workflow.
 * Guides users through: Upload → Review → Map Fields → COR Mapping → Preview → Publish
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  Loader2,
  Upload,
  FileSearch,
  Layout,
  Shield,
  Eye,
  Rocket,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { PDFUploader } from './pdf-uploader';
import { FieldMappingEditor } from './field-mapping-editor';
import { CORMappingPanel } from './cor-mapping-panel';
import { FormPreview } from './form-preview';
import { CONVERSION_STEPS } from '@/lib/pdf-converter/types';
import type { 
  PDFUpload, 
  ConversionSession, 
  DetectedField,
  SectionConfig,
  CORElementSuggestion,
  ConversionStep,
} from '@/lib/pdf-converter/types';
import { suggestCORElements } from '@/lib/pdf-converter/cor-mapper';

// =============================================================================
// TYPES
// =============================================================================

interface PDFConverterWizardProps {
  companyId: string;
  onComplete?: (templateId: string) => void;
  onCancel?: () => void;
}

// =============================================================================
// STEP ICONS
// =============================================================================

const STEP_ICONS: Record<ConversionStep, React.ReactNode> = {
  upload: <Upload className="w-5 h-5" />,
  review_ocr: <FileSearch className="w-5 h-5" />,
  map_fields: <Layout className="w-5 h-5" />,
  cor_mapping: <Shield className="w-5 h-5" />,
  preview: <Eye className="w-5 h-5" />,
  publish: <Rocket className="w-5 h-5" />,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PDFConverterWizard({
  companyId,
  onComplete,
  onCancel,
}: PDFConverterWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState<ConversionStep>('upload');
  const [upload, setUpload] = useState<PDFUpload | null>(null);
  const [session, setSession] = useState<ConversionSession | null>(null);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [corSuggestions, setCorSuggestions] = useState<CORElementSuggestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<{ templateId: string; formCode: string } | null>(null);

  // Step index
  const currentStepIndex = CONVERSION_STEPS.findIndex(s => s.step === currentStep);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleUploadComplete = useCallback(async (uploadData: PDFUpload, sessionId: string) => {
    setUpload(uploadData);
    setIsProcessing(true);
    setError(null);

    try {
      // Process the PDF
      const response = await fetch('/api/pdf-converter/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: uploadData.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      // Update state with results
      setFields(data.detected_fields || []);
      setCorSuggestions(data.cor_suggestions || []);

      // Fetch session
      const sessionResponse = await fetch(`/api/pdf-converter/session?upload_id=${uploadData.id}`);
      const sessionData = await sessionResponse.json();

      if (sessionData.session) {
        setSession(sessionData.session);
        setSections(sessionData.session.sections_config || []);
      }

      // Move to review step
      setCurrentStep('review_ocr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFieldUpdate = useCallback(async (fieldId: string, updates: Partial<DetectedField>) => {
    // Optimistic update
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    ));

    // Persist to server
    try {
      await fetch('/api/pdf-converter/fields', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: fieldId, ...updates }),
      });
    } catch (err) {
      console.error('Failed to update field:', err);
    }
  }, []);

  const handleFieldExclude = useCallback(async (fieldId: string, exclude: boolean) => {
    handleFieldUpdate(fieldId, { is_excluded: exclude });
  }, [handleFieldUpdate]);

  const handleSectionUpdate = useCallback((newSections: SectionConfig[]) => {
    setSections(newSections);
  }, []);

  const handleAddField = useCallback(() => {
    // Create a new field
    const newField: DetectedField = {
      id: `new_${Date.now()}`,
      pdf_upload_id: upload?.id || '',
      field_code: `field_${fields.length + 1}`,
      detected_label: 'New Field',
      suggested_type: 'text',
      type_confidence: 100,
      page_number: 1,
      bbox_x: null,
      bbox_y: null,
      bbox_width: null,
      bbox_height: null,
      suggested_options: null,
      suggested_validation: { required: false },
      suggested_help_text: null,
      section_label: sections[0]?.title || null,
      section_order: 0,
      field_order: fields.length,
      user_label: null,
      user_type: null,
      user_options: null,
      user_validation: null,
      is_confirmed: false,
      is_excluded: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFields(prev => [...prev, newField]);
  }, [upload, fields, sections]);

  const handleCORElementSelect = useCallback(async (element: number | null) => {
    if (!session) return;

    setSession(prev => prev ? { ...prev, cor_element: element, is_cor_related: true } : null);

    await fetch('/api/pdf-converter/session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        cor_element: element,
        is_cor_related: true,
      }),
    });
  }, [session]);

  const handleQuestionsLink = useCallback(async (questionIds: string[]) => {
    if (!session) return;

    setSession(prev => prev ? { ...prev, linked_audit_questions: questionIds } : null);

    await fetch('/api/pdf-converter/session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        linked_audit_questions: questionIds,
      }),
    });
  }, [session]);

  const handleNotCORRelated = useCallback(async (category: string | null) => {
    if (!session) return;

    setSession(prev => prev ? { 
      ...prev, 
      is_cor_related: false, 
      cor_element: null,
      custom_category: category,
    } : null);

    await fetch('/api/pdf-converter/session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        is_cor_related: false,
        cor_element: null,
        custom_category: category,
      }),
    });
  }, [session]);

  const handleConvert = useCallback(async () => {
    if (!session) return;

    setIsConverting(true);
    setError(null);

    try {
      // Update sections config before conversion
      await fetch('/api/pdf-converter/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          sections_config: sections,
        }),
      });

      // Perform conversion
      const response = await fetch('/api/pdf-converter/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed');
      }

      setConversionResult({
        templateId: data.template_id,
        formCode: data.form_code,
      });

      setCurrentStep('publish');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setIsConverting(false);
    }
  }, [session, sections]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < CONVERSION_STEPS.length - 1) {
      const nextStep = CONVERSION_STEPS[currentStepIndex + 1].step;
      
      // Handle preview step - trigger conversion
      if (nextStep === 'publish' && currentStep === 'preview') {
        handleConvert();
        return;
      }
      
      setCurrentStep(nextStep);
    }
  }, [currentStepIndex, currentStep, handleConvert]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(CONVERSION_STEPS[currentStepIndex - 1].step);
    }
  }, [currentStepIndex]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header with Steps */}
      <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                PDF to Digital Form Converter
              </h1>
              <p className="text-sm text-slate-400">
                {upload ? upload.file_name : 'Convert any PDF form to a fillable digital form'}
              </p>
            </div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2">
          {CONVERSION_STEPS.map((step, index) => {
            const isActive = step.step === currentStep;
            const isCompleted = index < currentStepIndex;
            const isAccessible = index <= currentStepIndex;

            return (
              <div key={step.step} className="flex items-center">
                <button
                  onClick={() => isAccessible && setCurrentStep(step.step)}
                  disabled={!isAccessible}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-indigo-600 text-white' 
                      : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }
                    ${isAccessible ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    STEP_ICONS[step.step]
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < CONVERSION_STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    isCompleted ? 'bg-emerald-500/50' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {/* Step Content */}
        <div className="h-full overflow-auto">
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  Analyzing PDF...
                </h3>
                <p className="text-slate-400">
                  Extracting text and detecting form fields
                </p>
              </div>
            </div>
          )}

          {/* Upload Step */}
          {currentStep === 'upload' && (
            <div className="p-6 max-w-3xl mx-auto">
              <PDFUploader
                onUploadComplete={handleUploadComplete}
                onError={setError}
              />
            </div>
          )}

          {/* Review OCR Step */}
          {currentStep === 'review_ocr' && upload && (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="font-semibold text-slate-200 mb-4">Extracted Information</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Form Title</div>
                    <div className="font-medium text-slate-200">
                      {session?.form_name || 'Untitled Form'}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Detected Fields</div>
                    <div className="font-medium text-slate-200">
                      {fields.length} fields found
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Pages</div>
                    <div className="font-medium text-slate-200">
                      {upload.page_count} page{upload.page_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">OCR Confidence</div>
                    <div className="font-medium text-slate-200">
                      {upload.ocr_confidence}%
                    </div>
                  </div>
                </div>

                {upload.ocr_text && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Extracted Text Preview</div>
                    <div className="bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        {upload.ocr_text.substring(0, 2000)}
                        {upload.ocr_text.length > 2000 && '...'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Fields Step */}
          {currentStep === 'map_fields' && (
            <FieldMappingEditor
              fields={fields}
              sections={sections}
              onFieldUpdate={handleFieldUpdate}
              onFieldExclude={handleFieldExclude}
              onSectionUpdate={handleSectionUpdate}
              onAddField={handleAddField}
            />
          )}

          {/* COR Mapping Step */}
          {currentStep === 'cor_mapping' && session && (
            <div className="p-6 max-w-3xl mx-auto">
              <CORMappingPanel
                session={session}
                suggestions={corSuggestions}
                onElementSelect={handleCORElementSelect}
                onQuestionsLink={handleQuestionsLink}
                onNotCORRelated={handleNotCORRelated}
              />
            </div>
          )}

          {/* Preview Step */}
          {currentStep === 'preview' && session && (
            <FormPreview
              session={session}
              fields={fields}
              sections={sections}
            />
          )}

          {/* Publish Step */}
          {currentStep === 'publish' && (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
              {isConverting ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    Creating Form Template...
                  </h3>
                  <p className="text-slate-400">
                    This may take a few moments
                  </p>
                </div>
              ) : conversionResult ? (
                <div className="bg-slate-800/50 rounded-2xl p-8 max-w-md text-center border border-emerald-500/30">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-200 mb-2">
                    Form Created Successfully!
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Your PDF has been converted to a digital form template.
                  </p>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-indigo-400" />
                      <div className="text-left">
                        <div className="font-medium text-slate-200">
                          {session?.form_name || 'New Form'}
                        </div>
                        <div className="text-sm text-slate-400">
                          Code: {conversionResult.formCode}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => window.location.href = `/admin/forms/${conversionResult.templateId}`}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                    >
                      View Form
                    </button>
                    <button
                      onClick={() => onComplete?.(conversionResult.templateId)}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    Ready to publish?
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Review your form preview before creating the template.
                  </p>
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Back to Preview
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      {currentStep !== 'upload' && currentStep !== 'publish' && (
        <footer className="bg-slate-800/50 border-t border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-sm text-slate-400">
              Step {currentStepIndex + 1} of {CONVERSION_STEPS.length}
            </div>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === CONVERSION_STEPS.length - 1}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 'preview' ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Create Form
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default PDFConverterWizard;
