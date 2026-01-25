/**
 * Publish Converted Form
 * 
 * Handles publishing PDF-converted forms to the form library
 * and creating audit evidence mappings.
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';
import type { FormFieldMapping, FormCategory } from './pdf-conversion-types';

// =============================================================================
// TYPES
// =============================================================================

export interface PublishOptions {
  form_name?: string;
  description?: string;
  category?: FormCategory;
  cor_elements?: number[];
  frequency?: FormFrequency;
  estimated_time_minutes?: number;
  is_mandatory?: boolean;
  make_available_to_all?: boolean;
  attach_original_pdf?: boolean;
  notify_supervisors?: boolean;
  send_training_email?: boolean;
}

export type FormFrequency = 
  | 'daily'
  | 'weekly' 
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'as_needed'
  | 'per_job'
  | 'per_shift';

export interface PublishedFormTemplate {
  id: string;
  company_id: string;
  form_code: string;
  name: string;
  description: string | null;
  category: string | null;
  cor_element: number | null;
  frequency: string;
  estimated_time_minutes: number;
  icon: string;
  color: string;
  is_active: boolean;
  is_mandatory: boolean;
  source: string;
  source_pdf_path: string | null;
  created_at: string;
}

export interface PublishResult {
  success: boolean;
  template: PublishedFormTemplate | null;
  form_code: string;
  sections_created: number;
  fields_created: number;
  evidence_mappings_created: number;
  error?: string;
}

interface FieldGroup {
  name: string;
  description: string | null;
  order: number;
  fields: FormFieldMapping[];
}

// =============================================================================
// MAIN PUBLISH FUNCTION
// =============================================================================

/**
 * Publish a converted PDF form to the form library
 */
export async function publishConvertedForm(
  conversionId: string,
  userId: string,
  options: PublishOptions = {}
): Promise<PublishResult> {
  const supabase = createRouteHandlerClient();
  
  try {
    // Get conversion with all field mappings
    const { data: conversion, error: convError } = await supabase
      .from('pdf_form_conversions')
      .select('*')
      .eq('id', conversionId)
      .single();
    
    if (convError || !conversion) {
      throw new Error('Conversion not found');
    }
    
    // Check if already published
    if (conversion.conversion_status === 'published') {
      throw new Error('Form has already been published');
    }
    
    // Get field mappings
    const { data: fieldMappings, error: fieldsError } = await supabase
      .from('form_field_mappings')
      .select('*')
      .eq('conversion_id', conversionId)
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true });
    
    if (fieldsError || !fieldMappings || fieldMappings.length === 0) {
      throw new Error('No fields found for this conversion');
    }
    
    // Get AI suggestions for defaults
    const aiSuggestions = conversion.ai_suggested_metadata as {
      suggested_form_name?: string;
      suggested_cor_elements?: number[];
      suggested_category?: FormCategory;
    } | null;
    
    // Determine final values
    const formName = options.form_name || aiSuggestions?.suggested_form_name || conversion.original_pdf_name;
    const formCode = generateFormCode(formName);
    const corElements = options.cor_elements || aiSuggestions?.suggested_cor_elements || [];
    const category = options.category || aiSuggestions?.suggested_category || 'other';
    const frequency = options.frequency || 'as_needed';
    const estimatedTime = options.estimated_time_minutes || Math.max(5, Math.ceil(fieldMappings.length * 0.5));
    
    // Check for duplicate form code
    const { data: existingForm } = await supabase
      .from('form_templates')
      .select('id')
      .eq('form_code', formCode)
      .eq('company_id', conversion.company_id)
      .single();
    
    if (existingForm) {
      throw new Error(`Form code "${formCode}" already exists`);
    }
    
    // Group fields into sections
    const sections = groupFieldsIntoSections(fieldMappings);
    
    // Create form template
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .insert({
        company_id: conversion.company_id,
        form_code: formCode,
        name: formName,
        description: options.description || `Converted from PDF: ${conversion.original_pdf_name}`,
        category: category,
        cor_element: corElements[0] || null,
        frequency: frequency,
        estimated_time_minutes: estimatedTime,
        icon: getCategoryIcon(category),
        color: getCategoryColor(category),
        is_active: true,
        is_mandatory: options.is_mandatory || false,
        source: 'pdf_conversion',
        source_pdf_path: options.attach_original_pdf ? conversion.original_pdf_path : null,
        created_by: userId,
      })
      .select()
      .single();
    
    if (templateError || !template) {
      throw new Error(`Failed to create form template: ${templateError?.message}`);
    }
    
    // Create sections and fields
    let totalFieldsCreated = 0;
    
    for (const section of sections) {
      const { data: sectionRecord, error: sectionError } = await supabase
        .from('form_sections')
        .insert({
          form_template_id: template.id,
          title: section.name,
          description: section.description,
          order_index: section.order,
          is_repeatable: false,
        })
        .select()
        .single();
      
      if (sectionError || !sectionRecord) {
        console.error('Failed to create section:', sectionError);
        continue;
      }
      
      // Create fields for this section
      const fieldInserts = section.fields.map(field => ({
        form_section_id: sectionRecord.id,
        field_code: field.field_code,
        label: field.label,
        field_type: field.field_type,
        placeholder: field.placeholder,
        help_text: field.help_text,
        default_value: field.default_value,
        options: field.options,
        validation_rules: field.validation_rules || {},
        conditional_logic: field.conditional_logic,
        order_index: field.field_order,
        width: 'full',
      }));
      
      const { error: fieldsInsertError } = await supabase
        .from('form_fields')
        .insert(fieldInserts);
      
      if (fieldsInsertError) {
        console.error('Failed to create fields:', fieldsInsertError);
      } else {
        totalFieldsCreated += fieldInserts.length;
      }
    }
    
    // Create workflow
    await supabase
      .from('form_workflows')
      .insert({
        form_template_id: template.id,
        submit_to_role: 'supervisor',
        notify_roles: ['admin'],
        creates_task: false,
        requires_approval: false,
        sync_priority: 3,
        auto_create_evidence: corElements.length > 0,
        evidence_audit_element: corElements.length > 0 
          ? corElements.map(e => `Element ${e}`).join(', ') 
          : null,
      });
    
    // Create evidence mappings for audit engine (COR-related forms only)
    let evidenceMappingsCreated = 0;
    if (corElements.length > 0) {
      evidenceMappingsCreated = await createEvidenceMappings(
        supabase,
        template.id,
        corElements,
        conversion.company_id
      );
    }
    
    // Update conversion status
    await supabase
      .from('pdf_form_conversions')
      .update({
        conversion_status: 'published',
        published_at: new Date().toISOString(),
        mapped_form_template_id: template.id,
      })
      .eq('id', conversionId);
    
    // Log conversion analytics
    await logConversionAnalytics(supabase, {
      conversion_id: conversionId,
      template_id: template.id,
      company_id: conversion.company_id,
      user_id: userId,
      fields_count: totalFieldsCreated,
      sections_count: sections.length,
      cor_elements: corElements,
      source_pdf_name: conversion.original_pdf_name,
    });
    
    return {
      success: true,
      template: template as PublishedFormTemplate,
      form_code: formCode,
      sections_created: sections.length,
      fields_created: totalFieldsCreated,
      evidence_mappings_created: evidenceMappingsCreated,
    };
    
  } catch (error) {
    console.error('Publish converted form error:', error);
    return {
      success: false,
      template: null,
      form_code: '',
      sections_created: 0,
      fields_created: 0,
      evidence_mappings_created: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Group field mappings into sections
 */
function groupFieldsIntoSections(fieldMappings: FormFieldMapping[]): FieldGroup[] {
  const sectionMap = new Map<string, FieldGroup>();
  
  for (const field of fieldMappings) {
    const sectionKey = `${field.section_order}_${field.section_name}`;
    
    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, {
        name: field.section_name || 'Form Fields',
        description: null,
        order: field.section_order,
        fields: [],
      });
    }
    
    sectionMap.get(sectionKey)!.fields.push(field);
  }
  
  // Sort sections by order and return
  return Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);
}

/**
 * Generate a unique form code from name
 */
export function generateFormCode(name: string): string {
  const timestamp = Date.now().toString(36).slice(-4);
  const baseName = name
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 25);
  
  return `pdf_${baseName}_${timestamp}`;
}

/**
 * Get icon for form category
 */
function getCategoryIcon(category: FormCategory): string {
  const icons: Record<FormCategory, string> = {
    hazard_assessment: 'alert-triangle',
    inspection: 'clipboard-check',
    incident_report: 'alert-circle',
    toolbox_talk: 'message-square',
    training_record: 'graduation-cap',
    ppe_inspection: 'hard-hat',
    equipment_inspection: 'wrench',
    emergency_drill: 'siren',
    meeting_minutes: 'file-text',
    other: 'file-scan',
  };
  // Safe: category is a typed FormCategory enum
  // eslint-disable-next-line security/detect-object-injection
  return icons[category] || 'file-scan';
}

/**
 * Get color for form category
 */
function getCategoryColor(category: FormCategory): string {
  const colors: Record<FormCategory, string> = {
    hazard_assessment: '#f59e0b',
    inspection: '#3b82f6',
    incident_report: '#ef4444',
    toolbox_talk: '#8b5cf6',
    training_record: '#10b981',
    ppe_inspection: '#6366f1',
    equipment_inspection: '#0ea5e9',
    emergency_drill: '#dc2626',
    meeting_minutes: '#64748b',
    other: '#8b5cf6',
  };
  // Safe: category is a typed FormCategory enum
  // eslint-disable-next-line security/detect-object-injection
  return colors[category] || '#8b5cf6';
}

/**
 * Create evidence mappings for COR audit elements
 */
async function createEvidenceMappings(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  formTemplateId: string,
  corElements: number[],
  companyId: string
): Promise<number> {
  const mappings = corElements.map(elementNum => ({
    form_template_id: formTemplateId,
    company_id: companyId,
    cor_element: elementNum,
    evidence_type: 'form_submission',
    auto_link: true,
    created_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from('form_evidence_mappings')
    .insert(mappings);
  
  if (error) {
    console.error('Failed to create evidence mappings:', error);
    return 0;
  }
  
  return mappings.length;
}

/**
 * Log conversion analytics
 */
async function logConversionAnalytics(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  data: {
    conversion_id: string;
    template_id: string;
    company_id: string;
    user_id: string;
    fields_count: number;
    sections_count: number;
    cor_elements: number[];
    source_pdf_name: string;
  }
): Promise<void> {
  try {
    await supabase
      .from('conversion_analytics')
      .insert({
        conversion_id: data.conversion_id,
        template_id: data.template_id,
        company_id: data.company_id,
        user_id: data.user_id,
        fields_count: data.fields_count,
        sections_count: data.sections_count,
        cor_elements: data.cor_elements,
        source_pdf_name: data.source_pdf_name,
        published_at: new Date().toISOString(),
      });
  } catch (error) {
    // Don't fail the publish if analytics fails
    console.error('Failed to log conversion analytics:', error);
  }
}

// =============================================================================
// RE-EDIT PUBLISHED FORM
// =============================================================================

/**
 * Allow re-editing a published form (creates a new draft version)
 */
export async function createEditableDraft(
  templateId: string,
  userId: string
): Promise<{ conversionId: string } | null> {
  const supabase = createRouteHandlerClient();
  
  try {
    // Get the original template
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError || !template) {
      throw new Error('Template not found');
    }
    
    // Find the original conversion if it exists
    const { data: originalConversion } = await supabase
      .from('pdf_form_conversions')
      .select('*')
      .eq('mapped_form_template_id', templateId)
      .single();
    
    // Create a new conversion record for editing
    const { data: newConversion, error: convError } = await supabase
      .from('pdf_form_conversions')
      .insert({
        company_id: template.company_id,
        original_pdf_path: originalConversion?.original_pdf_path || null,
        original_pdf_name: `${template.name} (Edit Draft)`,
        pdf_page_count: originalConversion?.pdf_page_count || 1,
        pdf_size_bytes: originalConversion?.pdf_size_bytes || 0,
        ocr_status: 'completed',
        conversion_status: 'mapping_fields',
        ai_suggested_metadata: {
          suggested_form_name: template.name,
          suggested_category: template.category,
          suggested_cor_elements: template.cor_element ? [template.cor_element] : [],
        },
        created_by: userId,
      })
      .select()
      .single();
    
    if (convError || !newConversion) {
      throw new Error('Failed to create edit draft');
    }
    
    // Copy fields from template to field mappings
    const { data: sections } = await supabase
      .from('form_sections')
      .select('*, form_fields(*)')
      .eq('form_template_id', templateId)
      .order('order_index', { ascending: true });
    
    if (sections) {
      for (const section of sections) {
        const fields = section.form_fields || [];
        
        for (const field of fields) {
          await supabase
            .from('form_field_mappings')
            .insert({
              conversion_id: newConversion.id,
              field_id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              field_code: field.field_code,
              label: field.label,
              field_type: field.field_type,
              validation_rules: field.validation_rules,
              options: field.options,
              conditional_logic: field.conditional_logic,
              placeholder: field.placeholder,
              help_text: field.help_text,
              default_value: field.default_value,
              section_name: section.title,
              section_order: section.order_index + 1,
              field_order: field.order_index,
              auto_detected: false,
              manually_added: true,
              edited_by_user: false,
            });
        }
      }
    }
    
    return { conversionId: newConversion.id };
    
  } catch (error) {
    console.error('Create editable draft error:', error);
    return null;
  }
}


