/**
 * Form Builder Import System
 * 
 * Provides functions to import forms from JSON configurations.
 * Supports bulk importing of form templates, sections, fields, and workflows.
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Conditional logic for showing/hiding fields or sections
 */
export interface ConditionalLogic {
  field_code: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean | string[];
}

/**
 * Validation rules for form fields
 */
export interface ValidationRules {
  required?: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  custom_message?: string;
}

/**
 * Option for dropdown, radio, checkbox, and multiselect fields
 */
export interface FieldOption {
  value: string;
  label: string;
}

/**
 * Field configuration for JSON import
 */
export interface FieldConfig {
  code: string;
  label: string;
  field_type: 
    | 'text' 
    | 'textarea' 
    | 'number' 
    | 'date' 
    | 'time' 
    | 'dropdown'
    | 'radio' 
    | 'checkbox' 
    | 'multiselect' 
    | 'signature' 
    | 'photo'
    | 'file' 
    | 'gps' 
    | 'worker_select' 
    | 'jobsite_select' 
    | 'equipment_select';
  placeholder?: string;
  help_text?: string;
  default_value?: string;
  options?: string[] | FieldOption[];
  validation_rules?: ValidationRules;
  conditional_logic?: ConditionalLogic;
  order_index: number;
  width?: 'full' | 'half' | 'third' | 'quarter';
}

/**
 * Section configuration for JSON import
 */
export interface SectionConfig {
  title: string;
  description?: string;
  order_index: number;
  is_repeatable?: boolean;
  conditional_logic?: ConditionalLogic;
  fields: FieldConfig[];
}

/**
 * Workflow configuration for JSON import
 */
export interface WorkflowConfig {
  submit_to_role: string;
  notify_roles: string[];
  creates_task?: boolean;
  task_template?: Record<string, unknown>;
  sync_priority: 1 | 2 | 3 | 4 | 5;
  requires_approval?: boolean;
}

/**
 * Form frequency options
 */
export type FormFrequency = 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annual' 
  | 'as_needed';

/**
 * Complete form configuration for JSON import
 */
export interface FormConfig {
  /** Unique identifier code for the form */
  code: string;
  /** Display name of the form */
  name: string;
  /** Description of the form's purpose */
  description: string;
  /** COR element number (2-14) */
  cor_element: number;
  /** How often this form should be completed */
  frequency: FormFrequency;
  /** Estimated time to complete in minutes */
  estimated_time_minutes: number;
  /** Lucide-react icon name */
  icon: string;
  /** Hex color code */
  color: string;
  /** Whether this form is mandatory */
  is_mandatory: boolean;
  /** Form sections configuration */
  sections: SectionConfig[];
  /** Workflow configuration */
  workflow: WorkflowConfig;
}

/**
 * Result of a bulk import operation
 */
export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ form: string; error: string }>;
  imported_ids: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalizes field options to a consistent format
 */
function normalizeOptions(
  options?: string[] | FieldOption[]
): FieldOption[] | null {
  if (!options || options.length === 0) {
    return null;
  }

  // Check if it's already an array of objects
  if (typeof options[0] === 'object') {
    return options as FieldOption[];
  }

  // Convert string array to option objects
  return (options as string[]).map(opt => ({
    value: opt,
    label: opt,
  }));
}

/**
 * Validates form configuration before import
 */
function validateFormConfig(config: FormConfig): string[] {
  const errors: string[] = [];

  if (!config.code || config.code.trim() === '') {
    errors.push('Form code is required');
  }

  if (!config.name || config.name.trim() === '') {
    errors.push('Form name is required');
  }

  if (config.cor_element < 2 || config.cor_element > 14) {
    errors.push('COR element must be between 2 and 14');
  }

  if (!config.sections || config.sections.length === 0) {
    errors.push('At least one section is required');
  }

  if (!config.workflow) {
    errors.push('Workflow configuration is required');
  }

  // Validate sections and fields
  config.sections?.forEach((section, sectionIndex) => {
    if (!section.title || section.title.trim() === '') {
      errors.push(`Section ${sectionIndex + 1}: Title is required`);
    }

    if (!section.fields || section.fields.length === 0) {
      errors.push(`Section "${section.title}": At least one field is required`);
    }

    section.fields?.forEach((field, fieldIndex) => {
      if (!field.code || field.code.trim() === '') {
        errors.push(`Section "${section.title}", Field ${fieldIndex + 1}: Code is required`);
      }

      if (!field.label || field.label.trim() === '') {
        errors.push(`Section "${section.title}", Field ${fieldIndex + 1}: Label is required`);
      }

      // Validate that select-type fields have options
      const selectTypes = ['dropdown', 'radio', 'checkbox', 'multiselect'];
      if (selectTypes.includes(field.field_type) && (!field.options || field.options.length === 0)) {
        errors.push(`Field "${field.code}": Options are required for ${field.field_type} fields`);
      }
    });
  });

  return errors;
}

// =============================================================================
// IMPORT FUNCTIONS
// =============================================================================

/**
 * Imports a single form from JSON configuration
 * 
 * @param config - The form configuration to import
 * @param companyId - Optional company ID. If null, creates a global template
 * @returns The created template ID
 * @throws Error if import fails
 * 
 * @example
 * ```ts
 * const templateId = await importFormFromJSON(
 *   dailyInspectionConfig,
 *   'company-uuid' // or null for global
 * );
 * ```
 */
export async function importFormFromJSON(
  config: FormConfig,
  companyId: string | null = null
): Promise<string> {
  const supabase = createRouteHandlerClient();

  // Validate configuration
  const validationErrors = validateFormConfig(config);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
  }

  // Step 1: Create form template
  const { data: template, error: templateError } = await supabase
    .from('form_templates')
    .insert({
      company_id: companyId,
      form_code: config.code,
      name: config.name,
      description: config.description,
      cor_element: config.cor_element,
      frequency: config.frequency,
      estimated_time_minutes: config.estimated_time_minutes,
      icon: config.icon,
      color: config.color,
      is_mandatory: config.is_mandatory,
      is_active: true,
    })
    .select('id')
    .single();

  if (templateError) {
    throw new Error(`Failed to create form template: ${templateError.message}`);
  }

  if (!template) {
    throw new Error('Failed to create form template: No data returned');
  }

  const templateId = template.id;

  try {
    // Step 2: Create sections and fields
    for (const sectionConfig of config.sections) {
      const { data: section, error: sectionError } = await supabase
        .from('form_sections')
        .insert({
          form_template_id: templateId,
          title: sectionConfig.title,
          description: sectionConfig.description || null,
          order_index: sectionConfig.order_index,
          is_repeatable: sectionConfig.is_repeatable || false,
          conditional_logic: sectionConfig.conditional_logic || null,
        })
        .select('id')
        .single();

      if (sectionError) {
        throw new Error(`Failed to create section "${sectionConfig.title}": ${sectionError.message}`);
      }

      if (!section) {
        throw new Error(`Failed to create section "${sectionConfig.title}": No data returned`);
      }

      // Step 3: Create fields for this section
      if (sectionConfig.fields && sectionConfig.fields.length > 0) {
        const fieldsToInsert = sectionConfig.fields.map(fieldConfig => ({
          form_section_id: section.id,
          field_code: fieldConfig.code,
          label: fieldConfig.label,
          field_type: fieldConfig.field_type,
          placeholder: fieldConfig.placeholder || null,
          help_text: fieldConfig.help_text || null,
          default_value: fieldConfig.default_value || null,
          options: normalizeOptions(fieldConfig.options),
          validation_rules: fieldConfig.validation_rules || {},
          conditional_logic: fieldConfig.conditional_logic || null,
          order_index: fieldConfig.order_index,
          width: fieldConfig.width || 'full',
        }));

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) {
          throw new Error(`Failed to create fields for section "${sectionConfig.title}": ${fieldsError.message}`);
        }
      }
    }

    // Step 4: Create workflow
    const { error: workflowError } = await supabase
      .from('form_workflows')
      .insert({
        form_template_id: templateId,
        submit_to_role: config.workflow.submit_to_role,
        notify_roles: config.workflow.notify_roles,
        creates_task: config.workflow.creates_task || false,
        task_template: config.workflow.task_template || null,
        sync_priority: config.workflow.sync_priority,
        requires_approval: config.workflow.requires_approval || false,
      });

    if (workflowError) {
      throw new Error(`Failed to create workflow: ${workflowError.message}`);
    }

    return templateId;
  } catch (error) {
    // Cleanup on failure: delete the template (cascades to sections, fields, workflow)
    await supabase
      .from('form_templates')
      .delete()
      .eq('id', templateId);

    throw error;
  }
}

/**
 * Imports multiple forms from JSON configurations
 * 
 * @param configs - Array of form configurations to import
 * @param companyId - Optional company ID. If null, creates global templates
 * @returns Import result with success/failure counts
 * 
 * @example
 * ```ts
 * const result = await bulkImportForms(
 *   [config1, config2, config3],
 *   null // Global templates
 * );
 * 
 * console.log(`Imported ${result.successful}/${result.total} forms`);
 * ```
 */
export async function bulkImportForms(
  configs: FormConfig[],
  companyId: string | null = null
): Promise<ImportResult> {
  const results: ImportResult = {
    total: configs.length,
    successful: 0,
    failed: 0,
    errors: [],
    imported_ids: [],
  };

  for (const config of configs) {
    try {
      const templateId = await importFormFromJSON(config, companyId);
      results.successful++;
      results.imported_ids.push(templateId);
      console.log(`✅ Imported: ${config.name} (${config.code})`);
    } catch (error) {
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push({
        form: config.name,
        error: errorMessage,
      });
      console.error(`❌ Failed to import ${config.name}:`, errorMessage);
    }
  }

  return results;
}

/**
 * Checks if a form with the given code already exists
 * 
 * @param formCode - The form code to check
 * @param companyId - Optional company ID to check within
 * @returns True if form exists, false otherwise
 */
export async function formExists(
  formCode: string,
  companyId: string | null = null
): Promise<boolean> {
  const supabase = createRouteHandlerClient();

  let query = supabase
    .from('form_templates')
    .select('id', { count: 'exact', head: true })
    .eq('form_code', formCode);

  if (companyId) {
    query = query.eq('company_id', companyId);
  } else {
    query = query.is('company_id', null);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error checking form existence:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Imports forms only if they don't already exist
 * 
 * @param configs - Array of form configurations to import
 * @param companyId - Optional company ID. If null, creates global templates
 * @param skipExisting - If true, skip forms that already exist (default: true)
 * @returns Import result with success/failure counts
 */
export async function bulkImportFormsIfNotExists(
  configs: FormConfig[],
  companyId: string | null = null,
  skipExisting: boolean = true
): Promise<ImportResult> {
  const results: ImportResult = {
    total: configs.length,
    successful: 0,
    failed: 0,
    errors: [],
    imported_ids: [],
  };

  for (const config of configs) {
    try {
      // Check if form already exists
      if (skipExisting) {
        const exists = await formExists(config.code, companyId);
        if (exists) {
          console.log(`⏭️  Skipped (exists): ${config.name} (${config.code})`);
          continue;
        }
      }

      const templateId = await importFormFromJSON(config, companyId);
      results.successful++;
      results.imported_ids.push(templateId);
      console.log(`✅ Imported: ${config.name} (${config.code})`);
    } catch (error) {
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push({
        form: config.name,
        error: errorMessage,
      });
      console.error(`❌ Failed to import ${config.name}:`, errorMessage);
    }
  }

  return results;
}

/**
 * Deletes a form template and all related records
 * 
 * @param templateId - The template ID to delete
 * @returns True if deleted successfully
 */
export async function deleteFormTemplate(templateId: string): Promise<boolean> {
  const supabase = createRouteHandlerClient();

  const { error } = await supabase
    .from('form_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting form template:', error);
    return false;
  }

  return true;
}

/**
 * Deletes all forms matching the given codes
 * 
 * @param formCodes - Array of form codes to delete
 * @param companyId - Optional company ID to delete within
 * @returns Number of forms deleted
 */
export async function deleteFormsByCode(
  formCodes: string[],
  companyId: string | null = null
): Promise<number> {
  const supabase = createRouteHandlerClient();

  let query = supabase
    .from('form_templates')
    .delete()
    .in('form_code', formCodes);

  if (companyId) {
    query = query.eq('company_id', companyId);
  } else {
    query = query.is('company_id', null);
  }

  const { data, error } = await query.select('id');

  if (error) {
    console.error('Error deleting forms:', error);
    return 0;
  }

  return data?.length ?? 0;
}


