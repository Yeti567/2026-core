/**
 * Field Mappings API Route
 * 
 * GET: Get field mappings for a conversion
 * POST: Add a new field mapping
 * PUT: Batch update field mappings
 * PATCH: Update a single field mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


/**
 * GET - Get all field mappings for a conversion
 */
export async function GET(
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
    
    // Get field mappings
    const { data: fieldMappings, error: fieldsError } = await supabase
      .from('form_field_mappings')
      .select('*')
      .eq('conversion_id', id)
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true });
    
    if (fieldsError) {
      throw new Error(`Failed to fetch field mappings: ${fieldsError.message}`);
    }
    
    return NextResponse.json({ field_mappings: fieldMappings || [] });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get field mappings');
  }
}

/**
 * POST - Add a new field mapping (manually added field)
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
    
    const body = await request.json();
    const {
      field_code,
      label,
      field_type,
      position_page,
      position_x,
      position_y,
      position_width,
      position_height,
      validation_rules,
      options,
      placeholder,
      help_text,
      section_name,
      section_order,
      field_order,
    } = body;
    
    // Generate unique field_id
    const fieldId = `field_manual_${Date.now()}`;
    
    // Insert new field mapping
    const { data: fieldMapping, error: insertError } = await supabase
      .from('form_field_mappings')
      .insert({
        conversion_id: id,
        field_id: fieldId,
        field_code: field_code || fieldId,
        label: label || 'New Field',
        field_type: field_type || 'text',
        position_page: position_page || 1,
        position_x: position_x || 50,
        position_y: position_y || 50,
        position_width: position_width || 200,
        position_height: position_height || 30,
        validation_rules: validation_rules || {},
        options: options || null,
        placeholder: placeholder || null,
        help_text: help_text || null,
        section_name: section_name || 'Section 1',
        section_order: section_order || 1,
        field_order: field_order || 999,
        auto_detected: false,
        manually_added: true,
        edited_by_user: true,
      })
      .select()
      .single();
    
    if (insertError) {
      throw new Error(`Failed to add field mapping: ${insertError.message}`);
    }
    
    return NextResponse.json({ success: true, field_mapping: fieldMapping });
    
  } catch (error) {
    return handleApiError(error, 'Failed to add field mapping');
  }
}

/**
 * PUT - Save all fields and metadata (replaces existing fields)
 */
export async function PUT(
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
    
    const body = await request.json();
    const { fields, metadata } = body;
    
    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'fields must be an array' }, { status: 400 });
    }
    
    // Update metadata if provided
    if (metadata) {
      const metadataUpdate: Record<string, unknown> = {};
      
      if (metadata.form_name || metadata.category || metadata.cor_elements) {
        metadataUpdate.ai_suggested_metadata = {
          suggested_form_name: metadata.form_name,
          suggested_category: metadata.category,
          suggested_cor_elements: metadata.cor_elements,
        };
      }
      
      if (Object.keys(metadataUpdate).length > 0) {
        const { error: metaError } = await supabase
          .from('pdf_form_conversions')
          .update(metadataUpdate)
          .eq('id', id);
        
        if (metaError) {
          console.error('Error updating metadata:', metaError);
        }
      }
    }
    
    // Separate new fields (with temp- prefix) from existing fields
    const newFields = fields.filter(f => f.id?.startsWith('temp-') || f.field_id?.startsWith('field-'));
    const existingFields = fields.filter(f => !f.id?.startsWith('temp-') && !f.field_id?.startsWith('field-'));
    
    const results = [];
    const errors = [];
    
    // Update existing fields
    for (const field of existingFields) {
      const { id: fieldDbId, field_id, created_at, updated_at, ...updates } = field;
      
      if (!field_id) {
        errors.push({ error: 'field_id is required', field });
        continue;
      }
      
      const { data, error } = await supabase
        .from('form_field_mappings')
        .update({
          ...updates,
          edited_by_user: true,
        })
        .eq('conversion_id', id)
        .eq('field_id', field_id)
        .select()
        .single();
      
      if (error) {
        errors.push({ field_id, error: error.message });
      } else if (data) {
        results.push(data);
      }
    }
    
    // Insert new fields
    for (const field of newFields) {
      const { id: tempId, created_at, updated_at, ...fieldData } = field;
      
      const { data, error } = await supabase
        .from('form_field_mappings')
        .insert({
          ...fieldData,
          conversion_id: id,
          auto_detected: false,
          manually_added: true,
          edited_by_user: true,
        })
        .select()
        .single();
      
      if (error) {
        errors.push({ field_id: field.field_id, error: error.message });
      } else if (data) {
        results.push(data);
      }
    }
    
    // Delete fields that are no longer in the list
    const currentFieldIds = fields.map(f => f.field_id).filter(Boolean);
    if (currentFieldIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('form_field_mappings')
        .delete()
        .eq('conversion_id', id)
        .not('field_id', 'in', `(${currentFieldIds.map(id => `'${id}'`).join(',')})`);
      
      if (deleteError) {
        console.error('Error deleting removed fields:', deleteError);
      }
    }
    
    return NextResponse.json({
      success: errors.length === 0,
      saved_count: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to save fields');
  }
}

/**
 * PATCH - Update a single field mapping
 */
export async function PATCH(
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
    
    const body = await request.json();
    const { mapping_id, ...updates } = body;
    
    if (!mapping_id) {
      return NextResponse.json({ error: 'mapping_id is required' }, { status: 400 });
    }
    
    // Mark as edited by user
    updates.edited_by_user = true;
    
    const { data: fieldMapping, error: updateError } = await supabase
      .from('form_field_mappings')
      .update(updates)
      .eq('id', mapping_id)
      .eq('conversion_id', id)
      .select()
      .single();
    
    if (updateError) {
      throw new Error(`Failed to update field mapping: ${updateError.message}`);
    }
    
    return NextResponse.json({ success: true, field_mapping: fieldMapping });
    
  } catch (error) {
    return handleApiError(error, 'Failed to update field mapping');
  }
}

/**
 * DELETE - Delete a field mapping
 */
export async function DELETE(
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
    
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mapping_id');
    
    if (!mappingId) {
      return NextResponse.json({ error: 'mapping_id is required' }, { status: 400 });
    }
    
    const { error: deleteError } = await supabase
      .from('form_field_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('conversion_id', id);
    
    if (deleteError) {
      throw new Error(`Failed to delete field mapping: ${deleteError.message}`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return handleApiError(error, 'Failed to delete field mapping');
  }
}
