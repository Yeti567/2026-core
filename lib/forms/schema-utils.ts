/**
 * Form Schema Utilities
 * 
 * Helper functions for working with form schemas.
 */

import type {
  FormSchema,
  FormSection,
  FieldDefinition,
  FieldCondition,
  FormValues,
  FormTemplateSettings,
} from './types';

// =============================================================================
// FIELD LOOKUP
// =============================================================================

/**
 * Gets a field definition by ID from the schema
 */
export function getFieldById(
  schema: FormSchema,
  fieldId: string
): FieldDefinition | undefined {
  return schema.fields.find((f) => f.id === fieldId);
}

/**
 * Gets all fields belonging to a section
 */
export function getFieldsInSection(
  schema: FormSchema,
  sectionId: string
): FieldDefinition[] {
  const section = schema.sections?.find((s) => s.id === sectionId);
  if (!section) return [];

  return section.fields
    .map((fieldId) => getFieldById(schema, fieldId))
    .filter((f): f is FieldDefinition => f !== undefined);
}

/**
 * Gets fields sorted by order
 */
export function getSortedFields(schema: FormSchema): FieldDefinition[] {
  return [...schema.fields].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Gets all required fields from the schema
 */
export function getRequiredFields(schema: FormSchema): FieldDefinition[] {
  return schema.fields.filter((f) => f.required);
}

// =============================================================================
// CONDITIONAL LOGIC
// =============================================================================

/**
 * Evaluates a field condition against the current form values
 */
export function evaluateCondition(
  condition: FieldCondition | undefined,
  values: FormValues
): boolean {
  if (!condition) return true;

  const fieldValue = values[condition.field];
  const operator = condition.operator || 'equals';

  switch (operator) {
    case 'equals':
      if (condition.equals !== undefined) {
        return fieldValue === condition.equals;
      }
      return fieldValue === condition.value;

    case 'not_equals':
      return fieldValue !== condition.value;

    case 'contains':
      if (condition.contains !== undefined) {
        if (Array.isArray(fieldValue)) {
          return (fieldValue as unknown[]).some((v) => String(v) === condition.contains);
        }
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(condition.contains);
        }
        return false;
      }
      if (Array.isArray(fieldValue) && condition.value !== undefined) {
        return (fieldValue as unknown[]).some((v) => String(v) === String(condition.value));
      }
      return false;

    case 'not_contains':
      if (Array.isArray(fieldValue) && condition.value !== undefined) {
        return !(fieldValue as unknown[]).some((v) => String(v) === String(condition.value));
      }
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return !fieldValue.includes(condition.value);
      }
      return true;

    case 'greater_than':
      if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
        return fieldValue > condition.value;
      }
      return false;

    case 'less_than':
      if (typeof fieldValue === 'number' && typeof condition.value === 'number') {
        return fieldValue < condition.value;
      }
      return false;

    case 'is_empty':
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case 'is_not_empty':
      return (
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldValue !== '' &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    default:
      return true;
  }
}

/**
 * Checks if a field should be visible based on its conditions
 */
export function isFieldVisible(
  field: FieldDefinition,
  values: FormValues
): boolean {
  // Check showWhen condition
  if (field.showWhen && !evaluateCondition(field.showWhen, values)) {
    return false;
  }

  // Check hideWhen condition
  if (field.hideWhen && evaluateCondition(field.hideWhen, values)) {
    return false;
  }

  // Check explicit hidden flag
  if (field.hidden) {
    return false;
  }

  return true;
}

/**
 * Gets all visible fields based on current form values
 */
export function getVisibleFields(
  schema: FormSchema,
  values: FormValues
): FieldDefinition[] {
  return getSortedFields(schema).filter((field) => isFieldVisible(field, values));
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Gets default values for all fields in the schema
 */
export function getDefaultValues(schema: FormSchema): FormValues {
  const defaults: FormValues = {};

  for (const field of schema.fields) {
    if (field.default !== undefined) {
      if (field.default === 'today') {
        defaults[field.id] = new Date().toISOString().split('T')[0];
      } else if (field.default === 'now') {
        defaults[field.id] = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } else {
        defaults[field.id] = field.default;
      }
    } else {
      // Set appropriate empty defaults based on field type
      switch (field.type) {
        case 'checkbox_group':
        case 'multiselect':
          defaults[field.id] = [];
          break;
        case 'checklist':
          defaults[field.id] = [];
          break;
        case 'repeater':
          defaults[field.id] = [];
          break;
        case 'photo':
          defaults[field.id] = [];
          break;
        case 'number':
        case 'temperature':
        case 'rating':
        case 'slider':
          defaults[field.id] = undefined;
          break;
        case 'checkbox':
          defaults[field.id] = false;
          break;
        default:
          defaults[field.id] = '';
      }
    }
  }

  return defaults;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates a single field value
 */
export function validateField(
  field: FieldDefinition,
  value: unknown,
  values: FormValues
): string | null {
  // Skip validation for hidden fields
  if (!isFieldVisible(field, values)) {
    return null;
  }

  // Required validation
  if (field.required) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return `${field.label} is required`;
    }
  }

  // Skip further validation if no value
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // Type-specific validation
  const validation = field.validation || {};

  // String length validation
  if (typeof value === 'string') {
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      return `${field.label} must be at least ${validation.minLength} characters`;
    }
    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      return `${field.label} must be no more than ${validation.maxLength} characters`;
    }
    if (validation.pattern) {
      // Safe: pattern comes from trusted schema definition, not user input
      // eslint-disable-next-line security/detect-non-literal-regexp
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return validation.patternMessage || `${field.label} is invalid`;
      }
    }
  }

  // Number validation
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return `${field.label} must be at least ${validation.min}`;
    }
    if (validation.max !== undefined && value > validation.max) {
      return `${field.label} must be no more than ${validation.max}`;
    }
  }

  // Field-specific validation based on type
  if (field.type === 'number' && 'min' in field) {
    const numField = field as { min?: number; max?: number };
    if (typeof value === 'number') {
      if (numField.min !== undefined && value < numField.min) {
        return `${field.label} must be at least ${numField.min}`;
      }
      if (numField.max !== undefined && value > numField.max) {
        return `${field.label} must be no more than ${numField.max}`;
      }
    }
  }

  // Email validation
  if (field.type === 'email' && typeof value === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
  }

  // Phone validation
  if (field.type === 'phone' && typeof value === 'string') {
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number';
    }
  }

  // Array min/max items validation
  if (Array.isArray(value)) {
    if (field.type === 'checkbox_group' || field.type === 'multiselect') {
      const arrField = field as { minSelections?: number; maxSelections?: number };
      if (arrField.minSelections !== undefined && value.length < arrField.minSelections) {
        return `Please select at least ${arrField.minSelections} options`;
      }
      if (arrField.maxSelections !== undefined && value.length > arrField.maxSelections) {
        return `Please select no more than ${arrField.maxSelections} options`;
      }
    }
    if (field.type === 'repeater') {
      const repField = field as { minItems?: number; maxItems?: number };
      if (repField.minItems !== undefined && value.length < repField.minItems) {
        return `Please add at least ${repField.minItems} items`;
      }
      if (repField.maxItems !== undefined && value.length > repField.maxItems) {
        return `Please add no more than ${repField.maxItems} items`;
      }
    }
  }

  return null;
}

/**
 * Validates all form values against the schema
 */
export function validateForm(
  schema: FormSchema,
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    const error = validateField(field, values[field.id], values);
    if (error) {
      errors[field.id] = error;
    }
  }

  return errors;
}

/**
 * Checks if the form has any validation errors
 */
export function isFormValid(
  schema: FormSchema,
  values: FormValues
): boolean {
  const errors = validateForm(schema, values);
  return Object.keys(errors).length === 0;
}

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

/**
 * Validates the schema structure itself
 */
export function validateSchema(schema: FormSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required structure
  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push('Schema must have a fields array');
    return { valid: false, errors };
  }

  // Check for duplicate field IDs
  const fieldIds = new Set<string>();
  for (const field of schema.fields) {
    const fieldId = field.id;
    if (!fieldId) {
      errors.push('All fields must have an id');
    } else if (fieldIds.has(fieldId)) {
      errors.push(`Duplicate field id: ${fieldId}`);
    } else {
      fieldIds.add(fieldId);
    }

    if (!field.type) {
      errors.push(`Field ${fieldId || 'unknown'} must have a type`);
    }

    if (!field.label) {
      errors.push(`Field ${fieldId || 'unknown'} must have a label`);
    }
  }

  // Validate sections reference valid field IDs
  if (schema.sections) {
    for (const section of schema.sections) {
      if (!section.id) {
        errors.push('All sections must have an id');
      }
      if (!section.title) {
        errors.push(`Section ${section.id || 'unknown'} must have a title`);
      }
      for (const fieldId of section.fields || []) {
        if (!fieldIds.has(fieldId)) {
          errors.push(`Section ${section.id} references non-existent field: ${fieldId}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// COMPLETION CALCULATION
// =============================================================================

/**
 * Calculates form completion percentage
 */
export function calculateCompletion(
  schema: FormSchema,
  values: FormValues
): number {
  const visibleFields = getVisibleFields(schema, values);
  const requiredFields = visibleFields.filter((f) => f.required);

  if (requiredFields.length === 0) {
    return 100;
  }

  const completedFields = requiredFields.filter((field) => {
    const value = values[field.id];
    return (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0)
    );
  });

  return Math.round((completedFields.length / requiredFields.length) * 100);
}


