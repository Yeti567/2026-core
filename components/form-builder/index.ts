/**
 * Form Builder Components
 * 
 * A dynamic form rendering system that reads JSON schemas from the database
 * and renders interactive forms with validation, conditional logic, and offline support.
 */

// Main component
export { default as DynamicFormRenderer } from './form-renderer';
export { DynamicFormRenderer as FormRenderer } from './form-renderer';

// Hook
export { useFormTemplate } from './use-form-template';

// Types
export type {
  FormTemplate,
  FormSection,
  FormField,
  FormWorkflow,
  FormSubmission,
  FieldType,
  FieldOption,
  ValidationRules,
  ConditionalLogic,
  TaskTemplate,
  ApprovalStep,
  ApprovalAction,
  FormAttachments,
  PhotoAttachment,
  FileAttachment,
  FormRendererProps,
  FormSubmissionData,
  FieldValue,
  FormValues,
  FormState,
  SectionInstance,
  Worker,
  Jobsite,
  Equipment,
  FormContext,
} from './types';

// Utilities
export {
  evaluateCondition,
  getVisibleFields,
  getVisibleSections,
  validateField,
  validateForm,
  isFormValid,
  normalizeOptions,
  getDefaultValue,
  initializeFormValues,
  createFieldIdToCodeMap,
  calculateCompletionPercentage,
  getCompletedFieldsCount,
  getWidthClass,
  formatFrequency,
  formatEstimatedTime,
  sortSections,
  sortFields,
  isAttachmentField,
  isSelectionField,
  getInputType,
} from './utils';

// Field components (for custom implementations)
export * from './fields';
