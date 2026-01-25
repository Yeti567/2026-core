/**
 * Form Builder Module
 * 
 * Provides utilities for building, importing, and managing dynamic forms.
 */

// Import functions
export {
  importFormFromJSON,
  bulkImportForms,
  bulkImportFormsIfNotExists,
  formExists,
  deleteFormTemplate,
  deleteFormsByCode,
} from './import-forms';

// Import types
export type {
  ConditionalLogic,
  ValidationRules,
  FieldOption,
  FieldConfig,
  SectionConfig,
  WorkflowConfig,
  FormFrequency,
  FormConfig,
  ImportResult,
} from './import-forms';
