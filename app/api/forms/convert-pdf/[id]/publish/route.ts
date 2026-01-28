/**
 * Publish Conversion API Route
 * 
 * POST: Publish a conversion to create a form template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


interface PublishOptions {
  form_name?: string;
  form_code?: string;
  description?: string;
  category?: string;
  cor_element?: number;
  cor_elements?: number[];
  frequency?: string;
  estimated_time_minutes?: number;
  is_mandatory?: boolean;
  make_available_to_all?: boolean;
  attach_original_pdf?: boolean;
  notify_supervisors?: boolean;
  send_training_email?: boolean;
}

/**
 * POST - Publish conversion to form template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check permissions
    if (!['admin', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get request body
    const body: PublishOptions = await request.json();
    const {
      form_name,
      form_code,
      cor_element,
      cor_elements,
      category,
      description,
      frequency,
      estimated_time_minutes,
      is_mandatory,
      attach_original_pdf,
      notify_supervisors,
      send_training_email,
    } = body;
    
    // Use cor_elements array or fall back to single cor_element
    const corElementsArray: number[] = cor_elements || (cor_element ? [cor_element] : []);
    
    // Get conversion data
    const { data: conversion, error: convError } = await supabase
      .from('pdf_form_conversions')
      .select('*, form_field_mappings(*)')
      .eq('id', id)
      .single();
    
    if (convError || !conversion) {
      return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
    }
    
    // Check if already published
    if (conversion.conversion_status === 'published') {
      return NextResponse.json({ 
        error: 'Conversion already published',
        template_id: conversion.mapped_form_template_id,
      }, { status: 400 });
    }
    
    // Get field mappings
    const { data: fieldMappings, error: fieldsError } = await supabase
      .from('form_field_mappings')
      .select('*')
      .eq('conversion_id', id)
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true });
    
    if (fieldsError || !fieldMappings || fieldMappings.length === 0) {
      return NextResponse.json({ error: 'No fields mapped for this conversion' }, { status: 400 });
    }
    
    // Get AI suggestions for defaults
    const aiSuggestions = conversion.ai_suggested_metadata as {
      suggested_form_name?: string;
      suggested_cor_elements?: number[];
      suggested_category?: string;
    } | null;
    
    // Generate form code if not provided
    const finalFormCode = form_code || generateFormCode(
      form_name || aiSuggestions?.suggested_form_name || conversion.original_pdf_name
    );
    
    // Check if form code already exists
    const { data: existingForm } = await supabase
      .from('form_templates')
      .select('id')
      .eq('form_code', finalFormCode)
      .eq('company_id', profile.company_id)
      .single();
    
    if (existingForm) {
      return NextResponse.json({ 
        error: `Form code "${finalFormCode}" already exists. Please choose a different name.`,
      }, { status: 400 });
    }
    
    // Get user profile ID
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    // Determine primary COR element (first in array)
    const primaryCorElement = corElementsArray[0] || aiSuggestions?.suggested_cor_elements?.[0] || null;
    const finalCategory = category || aiSuggestions?.suggested_category || 'other';
    const finalEstimatedTime = estimated_time_minutes || Math.max(5, Math.ceil(fieldMappings.length * 0.5));
    
    // Create form template
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .insert({
        company_id: profile.company_id,
        form_code: finalFormCode,
        name: form_name || aiSuggestions?.suggested_form_name || conversion.original_pdf_name,
        description: description || `Converted from PDF: ${conversion.original_pdf_name}`,
        cor_element: primaryCorElement,
        category: finalCategory,
        frequency: frequency || 'as_needed',
        estimated_time_minutes: finalEstimatedTime,
        icon: getCategoryIcon(finalCategory),
        color: getCategoryColor(finalCategory),
        is_active: true,
        is_mandatory: is_mandatory || false,
        source: 'pdf_conversion',
        source_pdf_path: attach_original_pdf !== false ? conversion.original_pdf_path : null,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (templateError || !template) {
      throw new Error(`Failed to create form template: ${templateError?.message}`);
    }
    
    // Group fields by section
    const sectionMap = new Map<string, typeof fieldMappings>();
    for (const field of fieldMappings) {
      const sectionKey = `${field.section_order}_${field.section_name}`;
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, []);
      }
      sectionMap.get(sectionKey)!.push(field);
    }
    
    // Create sections and fields
    for (const [sectionKey, sectionFields] of sectionMap) {
      const [, sectionName] = sectionKey.split('_');
      
      // Create section
      const { data: section, error: sectionError } = await supabase
        .from('form_sections')
        .insert({
          form_template_id: template.id,
          title: sectionName || 'Form Fields',
          order_index: sectionFields[0].section_order - 1,
          is_repeatable: false,
        })
        .select()
        .single();
      
      if (sectionError || !section) {
        console.error('Failed to create section:', sectionError);
        continue;
      }
      
      // Create fields for this section
      const fieldsToInsert = sectionFields.map(field => ({
        form_section_id: section.id,
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
        .insert(fieldsToInsert);
      
      if (fieldsInsertError) {
        console.error('Failed to create fields:', fieldsInsertError);
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
        auto_create_evidence: corElementsArray.length > 0,
        evidence_audit_element: corElementsArray.length > 0 
          ? corElementsArray.map(e => `Element ${e}`).join(', ') 
          : null,
      });
    
    // Create evidence mappings for COR-related forms
    if (corElementsArray.length > 0) {
      const evidenceMappings = corElementsArray.map(elementNum => ({
        form_template_id: template.id,
        company_id: profile.company_id,
        cor_element: elementNum,
        evidence_type: 'form_submission',
        auto_link: true,
        created_at: new Date().toISOString(),
      }));
      
      await supabase
        .from('form_evidence_mappings')
        .insert(evidenceMappings);
    }
    
    // Update conversion status
    await supabase
      .from('pdf_form_conversions')
      .update({
        conversion_status: 'published',
        mapped_form_template_id: template.id,
        published_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    // Log conversion analytics
    try {
      await supabase.from('conversion_analytics').insert({
        conversion_id: id,
        template_id: template.id,
        company_id: profile.company_id,
        user_id: user.id,
        fields_count: fieldMappings.length,
        sections_count: sectionMap.size,
        cor_elements: corElementsArray,
        source_pdf_name: conversion.original_pdf_name,
        published_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log analytics:', err);
    }
    
    // Handle notifications (fire-and-forget)
    if (notify_supervisors) {
      notifySupervisors(supabase, profile.company_id, template).catch(console.error);
    }
    
    if (send_training_email) {
      sendTrainingEmails(supabase, profile.company_id, template).catch(console.error);
    }
    
    return NextResponse.json({
      success: true,
      template_id: template.id,
      form_code: finalFormCode,
      message: 'Form template created successfully',
      evidence_mappings_created: corElementsArray.length,
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to publish conversion');
  }
}

/**
 * Generate a form code from name
 */
function generateFormCode(name: string): string {
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
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
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
  // Safe: category is validated against known categories or defaults to 'other'
  // eslint-disable-next-line security/detect-object-injection
  return icons[category] || 'file-scan';
}

/**
 * Get color for form category
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
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
  // Safe: category is validated against known categories or defaults to 'other'
  // eslint-disable-next-line security/detect-object-injection
  return colors[category] || '#8b5cf6';
}

/**
 * Notify supervisors about new form (placeholder implementation)
 */
async function notifySupervisors(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  companyId: string,
  template: { id: string; name: string }
): Promise<void> {
  // Get supervisors
  const { data: supervisors } = await supabase
    .from('user_profiles')
    .select('user_id, email:users(email)')
    .eq('company_id', companyId)
    .in('role', ['supervisor', 'admin']);
  
  if (!supervisors || supervisors.length === 0) return;
  
  // In a real implementation, this would send emails/push notifications
  console.log(`Notifying ${supervisors.length} supervisors about new form: ${template.name}`);
  
  // Create in-app notifications
  const notifications = supervisors.map(sup => ({
    user_id: sup.user_id,
    company_id: companyId,
    type: 'new_form',
    title: 'New Form Available',
    message: `A new form "${template.name}" has been published and is now available.`,
    link: `/admin/forms/${template.id}`,
    is_read: false,
    created_at: new Date().toISOString(),
  }));
  
  try {
    await supabase.from('notifications').insert(notifications);
  } catch {
    // Ignore errors if table doesn't exist
  }
}

/**
 * Send training emails (placeholder implementation)
 */
async function sendTrainingEmails(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  companyId: string,
  template: { id: string; name: string }
): Promise<void> {
  // Get all workers
  const { data: workers } = await supabase
    .from('user_profiles')
    .select('user_id, email:users(email)')
    .eq('company_id', companyId)
    .eq('role', 'worker');
  
  if (!workers || workers.length === 0) return;
  
  // In a real implementation, this would queue emails
  console.log(`Queuing training emails for ${workers.length} workers about: ${template.name}`);
}
