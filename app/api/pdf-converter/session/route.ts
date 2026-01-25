/**
 * PDF Conversion Session API Route
 * 
 * Handles session management for the PDF conversion workflow.
 * GET: Get session details
 * PATCH: Update session state
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
    
    // Get session_id or upload_id from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const uploadId = searchParams.get('upload_id');
    
    if (!sessionId && !uploadId) {
      return NextResponse.json({ error: 'session_id or upload_id is required' }, { status: 400 });
    }
    
    // Fetch session
    let query = supabase
      .from('pdf_conversion_sessions')
      .select(`
        *,
        pdf_form_uploads (*)
      `);
    
    if (sessionId) {
      query = query.eq('id', sessionId);
    } else {
      query = query.eq('pdf_upload_id', uploadId);
    }
    
    const { data: session, error: sessionError } = await query.single();
    
    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Also fetch detected fields
    const { data: fields } = await supabase
      .from('pdf_detected_fields')
      .select('*')
      .eq('pdf_upload_id', session.pdf_upload_id)
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true });
    
    return NextResponse.json({
      session,
      upload: session.pdf_form_uploads,
      fields: fields || [],
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get conversion session');
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
      session_id,
      current_step,
      form_name,
      form_description,
      form_code,
      cor_element,
      cor_element_confirmed,
      linked_audit_questions,
      is_cor_related,
      custom_category,
      sections_config,
      workflow_config,
    } = body;
    
    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }
    
    // Build update object
    const updates: Record<string, unknown> = {
      last_activity_at: new Date().toISOString(),
    };
    
    if (current_step !== undefined) updates.current_step = current_step;
    if (form_name !== undefined) updates.form_name = form_name;
    if (form_description !== undefined) updates.form_description = form_description;
    if (form_code !== undefined) updates.form_code = form_code;
    if (cor_element !== undefined) updates.cor_element = cor_element;
    if (cor_element_confirmed !== undefined) updates.cor_element_confirmed = cor_element_confirmed;
    if (linked_audit_questions !== undefined) updates.linked_audit_questions = linked_audit_questions;
    if (is_cor_related !== undefined) updates.is_cor_related = is_cor_related;
    if (custom_category !== undefined) updates.custom_category = custom_category;
    if (sections_config !== undefined) updates.sections_config = sections_config;
    if (workflow_config !== undefined) updates.workflow_config = workflow_config;
    
    // Also update upload status based on step
    if (current_step === 'map_fields') {
      await supabase
        .from('pdf_form_uploads')
        .update({ status: 'mapping' })
        .eq('id', (await supabase
          .from('pdf_conversion_sessions')
          .select('pdf_upload_id')
          .eq('id', session_id)
          .single()).data?.pdf_upload_id);
    }
    
    // Update session
    const { data: session, error: updateError } = await supabase
      .from('pdf_conversion_sessions')
      .update(updates)
      .eq('id', session_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, session });
    
  } catch (error) {
    return handleApiError(error, 'Failed to update conversion session');
  }
}
