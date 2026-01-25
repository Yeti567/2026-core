/**
 * PDF Detected Fields API Route
 * 
 * Handles CRUD operations for detected fields during conversion.
 * GET: List fields for an upload
 * PATCH: Update field properties
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get upload_id from query params
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('upload_id');
    
    if (!uploadId) {
      return NextResponse.json({ error: 'upload_id is required' }, { status: 400 });
    }
    
    // Fetch fields
    const { data: fields, error: fieldsError } = await supabase
      .from('pdf_detected_fields')
      .select('*')
      .eq('pdf_upload_id', uploadId)
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true });
    
    if (fieldsError) {
      console.error('Error fetching fields:', fieldsError);
      return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
    }
    
    return NextResponse.json({ fields: fields || [] });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get detected fields');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { 
      field_id, 
      user_label, 
      user_type, 
      user_options, 
      user_validation,
      is_confirmed,
      is_excluded,
    } = body;
    
    if (!field_id) {
      return NextResponse.json({ error: 'field_id is required' }, { status: 400 });
    }
    
    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (user_label !== undefined) updates.user_label = user_label;
    if (user_type !== undefined) updates.user_type = user_type;
    if (user_options !== undefined) updates.user_options = user_options;
    if (user_validation !== undefined) updates.user_validation = user_validation;
    if (is_confirmed !== undefined) updates.is_confirmed = is_confirmed;
    if (is_excluded !== undefined) updates.is_excluded = is_excluded;
    
    // Update field
    const { data: field, error: updateError } = await supabase
      .from('pdf_detected_fields')
      .update(updates)
      .eq('id', field_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating field:', updateError);
      return NextResponse.json({ error: 'Failed to update field' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, field });
    
  } catch (error) {
    return handleApiError(error, 'Failed to update detected field');
  }
}

// Batch update multiple fields
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { fields } = body;
    
    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'fields array is required' }, { status: 400 });
    }
    
    // Update fields in a transaction-like manner
    const results = [];
    const errors = [];
    
    for (const fieldUpdate of fields) {
      const { id, ...updates } = fieldUpdate;
      
      if (!id) {
        errors.push({ error: 'Field update missing id' });
        continue;
      }
      
      const { data, error } = await supabase
        .from('pdf_detected_fields')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        errors.push({ id, error: error.message });
      } else {
        results.push(data);
      }
    }
    
    return NextResponse.json({
      success: errors.length === 0,
      updated: results,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to batch update detected fields');
  }
}
