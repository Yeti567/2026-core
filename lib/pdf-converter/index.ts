/**
 * PDF Form Converter Module
 * 
 * AI-powered conversion of PDF forms to digital form templates.
 */

// Types
export type {
  PDFUploadStatus,
  ConversionStep,
  DetectedFieldType,
  PDFUpload,
  AIAnalysisResult,
  DetectedSection,
  DetectedField,
  ConversionSession,
  PDFFormReference,
  FieldOption,
  ValidationRules,
  SectionConfig,
  WorkflowConfig,
  CORElementSuggestion,
  AuditQuestionSuggestion,
  PDFUploadRequest,
  PDFUploadResponse,
  ProcessPDFRequest,
  ProcessPDFResponse,
  UpdateFieldRequest,
  UpdateSessionRequest,
  ConvertToFormRequest,
  ConvertToFormResponse,
  PDFConverterProps,
  PDFUploaderProps,
  FieldMappingEditorProps,
  CORMappingPanelProps,
  FormPreviewProps,
} from './types';

export {
  CONVERSION_STEPS,
  FIELD_TYPE_OPTIONS,
} from './types';

// OCR Service
export {
  extractTextFromPDF,
  detectFieldType,
  isSectionHeader,
  analyzePDFContent,
} from './ocr-service';

// COR Mapper
export {
  suggestCORElements,
  getAllCORElements,
  getAuditQuestionsForElement,
  getRequiredFormsForElement,
  matchesElement,
  NON_COR_CATEGORIES,
} from './cor-mapper';
