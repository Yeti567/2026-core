/**
 * PDF Form Conversion Details API Route
 * 
 * GET: Get conversion details with fields
 * PATCH: Update conversion metadata
 * DELETE: Delete a conversion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


/**
 * GET - Get conversion details
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
    
    // Get conversion with field mappings
    const { data: conversion, error: convError } = await supabase
      .from('pdf_form_conversions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (convError || !conversion) {
      return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
    }
    
    // Get field mappings
    const { data: fieldMappings, error: fieldsError } = await supabase
      .from('form_field_mappings')
      .select('*')
      .eq('conversion_id', id)
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true });
    
    if (fieldsError) {
      console.error('Error fetching field mappings:', fieldsError);
    }
    
    // Get PDF download URL
    let pdfUrl = null;
    if (conversion.original_pdf_path) {
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(conversion.original_pdf_path, 3600); // 1 hour
      pdfUrl = urlData?.signedUrl;
    }
    
    return NextResponse.json({
      conversion,
      field_mappings: fieldMappings || [],
      pdf_url: pdfUrl,
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get conversion details');
  }
}

/**
 * PATCH - Update conversion metadata
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
    const { conversion_status, ai_suggested_metadata } = body;
    
    // Build update object
    const updates: Record<string, unknown> = {};
    
    if (conversion_status !== undefined) {
      updates.conversion_status = conversion_status;
    }
    
    if (ai_suggested_metadata !== undefined) {
      updates.ai_suggested_metadata = ai_suggested_metadata;
    }
    
    // Update conversion
    const { data: conversion, error: updateError } = await supabase
      .from('pdf_form_conversions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      throw new Error(`Failed to update conversion: ${updateError.message}`);
    }
    
    return NextResponse.json({ success: true, conversion });
    
  } catch (error) {
    return handleApiError(error, 'Failed to update conversion');
  }
}

/**
 * DELETE - Delete a conversion
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
    
    // Get conversion to find PDF path
    const { data: conversion } = await supabase
      .from('pdf_form_conversions')
      .select('original_pdf_path')
      .eq('id', id)
      .single();
    
    // Delete conversion (cascades to field_mappings)
    const { error: deleteError } = await supabase
      .from('pdf_form_conversions')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      throw new Error(`Failed to delete conversion: ${deleteError.message}`);
    }
    
    // Delete PDF from storage
    if (conversion?.original_pdf_path) {
      await supabase.storage
        .from('documents')
        .remove([conversion.original_pdf_path]);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return handleApiError(error, 'Failed to delete conversion');
  }
}
