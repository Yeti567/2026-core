/**
 * PDF Convert to Form API Route
 * 
 * Converts a PDF conversion session into a form template.
 * POST: Create form template from session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createNeonWrapper } from '@/lib/db/neon-wrapper';
import type { DetectedField, SectionConfig, WorkflowConfig } from '@/lib/pdf-converter/types';
import { rateLimitByUser, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { handleApiError } from '@/lib/utils/error-handling';

export async function POST(request: NextRequest) {
  try {
    const supabase = createNeonWrapper();
    
    // Check authentication
    // TODO: Implement user authentication without Supabase
      const { data: { user: authUser }, error: authError } = { data: { user: { id: 'placeholder' } }, error: new Error('Auth not implemented') };;
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting: 10 form conversions per hour per user
    const rateLimitResult = await rateLimitByUser(authUser.id, 10, '1h');
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }
    
    // Get user's company and role
    const profileResult = await supabase
      .from('user_profiles')
      .select('company_id, role, id')
      .eq('user_id', authUser.id)
      .single();
    
    const profile = profileResult.data;
    
    if (!profile || !['admin', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get request body
    const body = await request.json();
    const { session_id } = body;
    
    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }
    
    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('pdf_conversion_sessions')
      .select('*')
      .eq('id', session_id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Get upload data
    const { data: upload, error: uploadError } = await supabase
      .from('pdf_form_uploads')
      .select('*')
      .eq('id', session.pdf_upload_id)
      .single();
    
    if (uploadError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }
    
    // Update status to converting
    await supabase
      .from('pdf_form_uploads')
      .update({ status: 'converting' })
      .eq('id', upload.id);
    
    try {
      // Get detected fields
      const { data: fields } = await supabase
        .from('pdf_detected_fields')
        .select('*')
        .eq('pdf_upload_id', upload.id)
        .eq('is_excluded', false)
        .order('created_at', false)
        .order('updated_at', false);
      
      const detectedFields = (fields || []) as DetectedField[];
      const sectionsConfig = (session.sections_config || []) as SectionConfig[];
      const workflowConfig = (session.workflow_config || {}) as WorkflowConfig;
      
      // Generate form code if not provided
      const formCode = session.form_code || generateFormCode(upload.file_name, profile.company_id);
      
      // Check if form code already exists
      const { data: existingForm } = await supabase
        .from('form_templates')
        .select('id')
        .eq('form_code', formCode)
        .eq('company_id', profile.company_id)
        .single();
      
      if (existingForm) {
        return NextResponse.json({ error: 'Form code already exists' }, { status: 400 });
      }
      
      // Create form template
      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .insert({
          company_id: profile.company_id,
          form_code: formCode,
          name: session.form_name || upload.file_name.replace(/\.pdf$/i, ''),
          description: session.form_description || `Converted from ${upload.file_name}`,
          cor_element: session.is_cor_related ? session.cor_element : null,
          frequency: (upload.ai_analysis as { suggested_frequency?: string })?.suggested_frequency || 'as_needed',
          estimated_time_minutes: Math.ceil(detectedFields.length * 0.5) + 5,
          icon: 'file-scan',
          color: '#6366f1',
          is_active: true,
          is_mandatory: false,
          created_by: authUser.id,
        })
        .select()
        .single();
      
      if (templateError || !template) {
        throw new Error(`Failed to create template: ${templateError?.message}`);
      }
      
      // Organize fields by section
      const fieldsBySection = organizeFieldsBySection(detectedFields, sectionsConfig);
      
      // Create sections and fields
      let sectionOrder = 0;
      for (const sectionConfig of sectionsConfig) {
        // Create section
        const { data: section, error: sectionError } = await supabase
          .from('form_sections')
          .insert({
            form_template_id: template.id,
            title: sectionConfig.title,
            description: sectionConfig.description || null,
            order_index: sectionOrder,
            is_repeatable: sectionConfig.is_repeatable || false,
          })
          .select()
          .single();
        
        if (sectionError || !section) {
          console.error('Failed to create section:', sectionError);
          continue;
        }
        
        // Create fields for this section
        const sectionFields = fieldsBySection[sectionConfig.id] || [];
        let fieldOrder = 0;
        
        for (const field of sectionFields) {
          await supabase
            .from('form_fields')
            .insert({
              form_section_id: section.id,
              field_code: field.field_code,
              label: field.user_label || field.detected_label,
              field_type: field.user_type || field.suggested_type,
              placeholder: null,
              help_text: field.suggested_help_text,
              default_value: null,
              options: field.user_options || field.suggested_options,
              validation_rules: field.user_validation || field.suggested_validation || { required: false },
              order_index: fieldOrder,
              width: 'full',
            });
          
          fieldOrder++;
        }
        
        sectionOrder++;
      }
      
      // Create default section if no sections configured
      if (sectionsConfig.length === 0 && detectedFields.length > 0) {
        const { data: defaultSection } = await supabase
          .from('form_sections')
          .insert({
            form_template_id: template.id,
            title: 'Form Fields',
            order_index: 0,
            is_repeatable: false,
          })
          .select()
          .single();
        
        if (defaultSection) {
          let fieldOrder = 0;
          for (const field of detectedFields) {
            await supabase
              .from('form_fields')
              .insert({
                form_section_id: defaultSection.id,
                field_code: field.field_code,
                label: field.user_label || field.detected_label,
                field_type: field.user_type || field.suggested_type,
                help_text: field.suggested_help_text,
                options: field.user_options || field.suggested_options,
                validation_rules: field.user_validation || field.suggested_validation || { required: false },
                order_index: fieldOrder,
                width: 'full',
              });
            fieldOrder++;
          }
        }
      }
      
      // Create workflow
      await supabase
        .from('form_workflows')
        .insert({
          form_template_id: template.id,
          submit_to_role: workflowConfig.submit_to_role || 'supervisor',
          notify_roles: workflowConfig.notify_roles || ['admin'],
          creates_task: workflowConfig.creates_task || false,
          requires_approval: workflowConfig.requires_approval || false,
          sync_priority: workflowConfig.sync_priority || 3,
          auto_create_evidence: session.is_cor_related,
          evidence_audit_element: session.is_cor_related && session.cor_element 
            ? `Element ${session.cor_element}` 
            : null,
        });
      
      // Create PDF reference
      await supabase
        .from('pdf_form_references')
        .insert({
          form_template_id: template.id,
          pdf_upload_id: upload.id,
          original_file_name: upload.file_name,
          original_storage_path: upload.storage_path,
          converted_by: profile.id,
        });
      
      // Update upload status
      await supabase
        .from('pdf_form_uploads')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result_template_id: template.id,
        })
        .eq('id', upload.id);
      
      // Update session
      await supabase
        .from('pdf_conversion_sessions')
        .update({
          current_step: 'publish',
          completed_at: new Date().toISOString(),
        })
        .eq('id', session_id);
      
      return NextResponse.json({
        success: true,
        template_id: template.id,
        form_code: formCode,
        message: 'Form template created successfully',
      });
      
    } catch (conversionError) {
      // Revert upload status on failure
      await supabase
        .from('pdf_form_uploads')
        .update({
          status: 'failed',
          error_message: conversionError instanceof Error 
            ? 'Conversion failed' 
            : 'Conversion failed',
        })
        .eq('id', upload.id);
      
      throw conversionError;
    }
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert PDF to form. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Generate form code from filename
 */
function generateFormCode(filename: string, companyId: string): string {
  const timestamp = Date.now().toString(36).slice(-4);
  const baseName = filename
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .substring(0, 20);
  
  return `pdf_${baseName}_${timestamp}`;
}

/**
 * Organize fields by their section ID
 */
function organizeFieldsBySection(
  fields: DetectedField[],
  sections: SectionConfig[]
): Record<string, DetectedField[]> {
  const result: Record<string, DetectedField[]> = {};
  
  // Initialize sections
  for (const section of sections) {
    result[section.id] = [];
  }
  
  // Map fields to sections
  for (const field of fields) {
    // Find section by field_ids array
    for (const section of sections) {
      if (section.field_ids?.includes(field.id) || section.field_ids?.includes(field.field_code)) {
        result[section.id].push(field);
        break;
      }
    }
  }
  
  // Add ungrouped fields to first section or create default
  const ungroupedFields = fields.filter(f => {
    return !sections.some(s => 
      s.field_ids?.includes(f.id) || s.field_ids?.includes(f.field_code)
    );
  });
  
  if (ungroupedFields.length > 0 && sections.length > 0) {
    result[sections[0].id].push(...ungroupedFields);
  }
  
  return result;
}
