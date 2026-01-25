/**
 * Form Builder Utilities
 * 
 * Helper functions for validation, conditional logic, and form processing
 */

import {
  ConditionalLogic,
  FieldOption,
  FieldType,
  FormField,
  FormSection,
  FieldValue,
  FormValues,
  ValidationRules,
} from './types';

// =============================================================================
// CONDITIONAL LOGIC EVALUATION
// =============================================================================

/**
 * Evaluates conditional logic against current form values
 */
export function evaluateCondition(
  logic: ConditionalLogic | null,
  formValues: FormValues,
  fieldIdToCodeMap: Map<string, string>
): boolean {
  if (!logic) return true;

  // Get the field code from field_id
  const fieldCode = fieldIdToCodeMap.get(logic.field_id) || logic.field_id;
  // Safe: fieldCode is from fieldIdToCodeMap or logic.field_id
  // eslint-disable-next-line security/detect-object-injection
  const fieldValue = formValues[fieldCode];

  switch (logic.operator) {
    case 'equals':
      return fieldValue === logic.value;
    
    case 'not_equals':
      return fieldValue !== logic.value;
    
    case 'contains':
      if (typeof fieldValue === 'string') {
        return fieldValue.includes(String(logic.value));
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.map(String).includes(String(logic.value));
      }
      return false;
    
    case 'not_contains':
      if (typeof fieldValue === 'string') {
        return !fieldValue.includes(String(logic.value));
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.map(String).includes(String(logic.value));
      }
      return true;
    
    case 'greater_than':
      return Number(fieldValue) > Number(logic.value);
    
    case 'less_than':
      return Number(fieldValue) < Number(logic.value);
    
    case 'is_empty':
      return !fieldValue || 
        (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
        (Array.isArray(fieldValue) && fieldValue.length === 0);
    
    case 'is_not_empty':
      return !!fieldValue && 
        (typeof fieldValue !== 'string' || fieldValue.trim() !== '') &&
        (!Array.isArray(fieldValue) || fieldValue.length > 0);
    
    default:
      return true;
  }
}

/**
 * Get all visible fields based on conditional logic
 */
export function getVisibleFields(
  fields: FormField[],
  formValues: FormValues,
  fieldIdToCodeMap: Map<string, string>
): FormField[] {
  return fields.filter(field => 
    evaluateCondition(field.conditional_logic, formValues, fieldIdToCodeMap)
  );
}

/**
 * Get all visible sections based on conditional logic
 */
export function getVisibleSections(
  sections: FormSection[],
  formValues: FormValues,
  fieldIdToCodeMap: Map<string, string>
): FormSection[] {
  return sections.filter(section => 
    evaluateCondition(section.conditional_logic, formValues, fieldIdToCodeMap)
  );
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates a single field value against its rules
 */
export function validateField(
  field: FormField,
  value: unknown,
  formValues: FormValues
): string | null {
  const rules = field.validation_rules || {};

  // Required check
  if (rules.required) {
    if (value === null || value === undefined || value === '') {
      return rules.custom_message || `${field.label} is required`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return rules.custom_message || `${field.label} is required`;
    }
  }

  // Skip other validations if empty and not required
  if (!value && value !== 0 && value !== false) {
    return null;
  }

  const stringValue = String(value);

  // Min length
  if (rules.min_length !== undefined && stringValue.length < rules.min_length) {
    return rules.custom_message || `${field.label} must be at least ${rules.min_length} characters`;
  }

  // Max length
  if (rules.max_length !== undefined && stringValue.length > rules.max_length) {
    return rules.custom_message || `${field.label} must be no more than ${rules.max_length} characters`;
  }

  // Min value (for numbers)
  if (rules.min_value !== undefined) {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue < rules.min_value) {
      return rules.custom_message || `${field.label} must be at least ${rules.min_value}`;
    }
  }

  // Max value (for numbers)
  if (rules.max_value !== undefined) {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > rules.max_value) {
      return rules.custom_message || `${field.label} must be no more than ${rules.max_value}`;
    }
  }

  // Pattern (regex)
  if (rules.pattern) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(rules.pattern);
    if (!regex.test(stringValue)) {
      return rules.custom_message || `${field.label} format is invalid`;
    }
  }

  // Date validation
  if (field.field_type === 'date' || field.field_type === 'datetime') {
    const dateValue = new Date(stringValue);
    
    if (rules.min_date) {
      const minDate = new Date(rules.min_date);
      if (dateValue < minDate) {
        return rules.custom_message || `${field.label} must be on or after ${rules.min_date}`;
      }
    }
    
    if (rules.max_date) {
      const maxDate = new Date(rules.max_date);
      if (dateValue > maxDate) {
        return rules.custom_message || `${field.label} must be on or before ${rules.max_date}`;
      }
    }
  }

  // Email validation
  if (field.field_type === 'email' && stringValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stringValue)) {
      return rules.custom_message || 'Please enter a valid email address';
    }
  }

  // Phone validation
  if (field.field_type === 'phone' && stringValue) {
    const phoneRegex = /^[\d\s\-+()]{10,}$/;
    if (!phoneRegex.test(stringValue)) {
      return rules.custom_message || 'Please enter a valid phone number';
    }
  }

  return null;
}

/**
 * Validates all visible fields in a form
 */
export function validateForm(
  fields: FormField[],
  formValues: FormValues,
  fieldIdToCodeMap: Map<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  const visibleFields = getVisibleFields(fields, formValues, fieldIdToCodeMap);
  
  for (const field of visibleFields) {
    const value = formValues[field.field_code];
    const error = validateField(field, value, formValues);
    if (error) {
      errors[field.field_code] = error;
    }
  }
  
  return errors;
}

/**
 * Check if form is valid (no errors on visible required fields)
 */
export function isFormValid(
  fields: FormField[],
  formValues: FormValues,
  fieldIdToCodeMap: Map<string, string>
): boolean {
  const errors = validateForm(fields, formValues, fieldIdToCodeMap);
  return Object.keys(errors).length === 0;
}

// =============================================================================
// FIELD PROCESSING
// =============================================================================

/**
 * Normalize field options to consistent format
 */
export function normalizeOptions(options: unknown): FieldOption[] {
  if (!options) return [];
  
  if (Array.isArray(options)) {
    return options.map((opt, index) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      if (typeof opt === 'object' && opt !== null) {
        const o = opt as Record<string, unknown>;
        return {
          value: String(o.value ?? o.label ?? index),
          label: String(o.label ?? o.value ?? index),
          icon: o.icon ? String(o.icon) : undefined,
          disabled: Boolean(o.disabled),
        };
      }
      return { value: String(index), label: String(opt) };
    });
  }
  
  return [];
}

/**
 * Get default value for a field
 */
export function getDefaultValue(field: FormField): FieldValue {
  if (field.default_value !== null && field.default_value !== undefined) {
    // Parse default value based on field type
    switch (field.field_type) {
      case 'number':
      case 'rating':
      case 'slider':
      case 'currency':
        return Number(field.default_value);
      
      case 'checkbox':
        return field.default_value === 'true';
      
      case 'multiselect':
        try {
          return JSON.parse(field.default_value);
        } catch {
          return [];
        }
      
      default:
        return field.default_value;
    }
  }
  
  // Type-specific defaults
  switch (field.field_type) {
    case 'checkbox':
      return false;
    case 'multiselect':
      return [];
    case 'rating':
      return 0;
    case 'yes_no':
    case 'yes_no_na':
      return null;
    default:
      return '';
  }
}

/**
 * Initialize form values with defaults
 */
export function initializeFormValues(fields: FormField[]): FormValues {
  const values: FormValues = {};
  
  for (const field of fields) {
    values[field.field_code] = getDefaultValue(field);
  }
  
  return values;
}

/**
 * Create a map from field ID to field code
 */
export function createFieldIdToCodeMap(fields: FormField[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of fields) {
    map.set(field.id, field.field_code);
  }
  return map;
}

// =============================================================================
// PROGRESS CALCULATION
// =============================================================================

/**
 * Calculate completion percentage for visible required fields
 */
export function calculateCompletionPercentage(
  fields: FormField[],
  formValues: FormValues,
  fieldIdToCodeMap: Map<string, string>
): number {
  const visibleFields = getVisibleFields(fields, formValues, fieldIdToCodeMap);
  const requiredFields = visibleFields.filter(f => f.validation_rules?.required);
  
  if (requiredFields.length === 0) return 100;
  
  let completedCount = 0;
  for (const field of requiredFields) {
    const value = formValues[field.field_code];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length === 0) continue;
      completedCount++;
    }
  }
  
  return Math.round((completedCount / requiredFields.length) * 100);
}

/**
 * Get count of completed required fields
 */
export function getCompletedFieldsCount(
  fields: FormField[],
  formValues: FormValues,
  fieldIdToCodeMap: Map<string, string>
): { completed: number; total: number } {
  const visibleFields = getVisibleFields(fields, formValues, fieldIdToCodeMap);
  const requiredFields = visibleFields.filter(f => f.validation_rules?.required);
  
  let completed = 0;
  for (const field of requiredFields) {
    const value = formValues[field.field_code];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length === 0) continue;
      completed++;
    }
  }
  
  return { completed, total: requiredFields.length };
}

// =============================================================================
// WIDTH HELPERS
// =============================================================================

/**
 * Get Tailwind width class for field width
 */
export function getWidthClass(width: FormField['width']): string {
  switch (width) {
    case 'quarter':
      return 'w-full sm:w-1/4';
    case 'third':
      return 'w-full sm:w-1/3';
    case 'half':
      return 'w-full sm:w-1/2';
    case 'full':
    default:
      return 'w-full';
  }
}

// =============================================================================
// FORM NUMBER FORMATTING
// =============================================================================

/**
 * Format frequency display
 */
export function formatFrequency(frequency: string): string {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
    as_needed: 'As Needed',
    per_shift: 'Per Shift',
  };
  // Safe: frequency is a known string key from form template
  // eslint-disable-next-line security/detect-object-injection
  return labels[frequency] || frequency;
}

/**
 * Format estimated time
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `~${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `~${hours} hr`;
  }
  return `~${hours} hr ${remainingMinutes} min`;
}

// =============================================================================
// SORT HELPERS
// =============================================================================

/**
 * Sort sections by order_index
 */
export function sortSections(sections: FormSection[]): FormSection[] {
  return [...sections].sort((a, b) => a.order_index - b.order_index);
}

/**
 * Sort fields by order_index
 */
export function sortFields(fields: FormField[]): FormField[] {
  return [...fields].sort((a, b) => a.order_index - b.order_index);
}

// =============================================================================
// FIELD TYPE HELPERS
// =============================================================================

/**
 * Check if field type requires special handling (attachments)
 */
export function isAttachmentField(fieldType: FieldType): boolean {
  return ['photo', 'file', 'signature'].includes(fieldType);
}

/**
 * Check if field type is a selection type
 */
export function isSelectionField(fieldType: FieldType): boolean {
  return ['dropdown', 'radio', 'checkbox', 'multiselect', 'yes_no', 'yes_no_na'].includes(fieldType);
}

/**
 * Get input type for HTML input element
 */
export function getInputType(fieldType: FieldType): string {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'number':
    case 'currency':
    case 'rating':
    case 'slider':
      return 'number';
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    case 'datetime':
      return 'datetime-local';
    default:
      return 'text';
  }
}
