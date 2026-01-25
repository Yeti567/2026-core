/**
 * PDF Form Conversion API Route
 * 
 * POST: Upload and process a PDF form
 * GET: Get conversion status/details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { processPDFForm, getConversionStatus } from '@/lib/forms/pdf-ocr-processor';
import { handleApiError } from '@/lib/utils/error-handling';

/**
 * POST - Upload and start PDF conversion
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's company and role
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
    
    // Parse form data
    const formData = await request.formData();
    const pdfFile = formData.get('file') as File | null;
    
    if (!pdfFile) {
      return NextResponse.json({ error: 'Please upload a file' }, { status: 400 });
    }
    
    // Validate file type
    if (pdfFile.type !== 'application/pdf' && !pdfFile.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 });
    }
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (pdfFile.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 });
    }
    
    // Process PDF
    const conversion = await processPDFForm(
      pdfFile,
      profile.company_id,
      user.id
    );
    
    return NextResponse.json({
      success: true,
      conversion_id: conversion.id,
      message: 'PDF uploaded successfully. Processing in background...',
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to process PDF conversion');
  }
}

/**
 * GET - Get conversion status or list conversions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const conversionId = searchParams.get('id');
    
    if (conversionId) {
      // Get specific conversion status
      const status = await getConversionStatus(conversionId);
      return NextResponse.json(status);
    }
    
    // List all conversions for user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { data: conversions, error: listError } = await supabase
      .from('pdf_form_conversions')
      .select(`
        id,
        original_pdf_name,
        pdf_page_count,
        pdf_size_bytes,
        ocr_status,
        conversion_status,
        ai_suggested_metadata,
        mapped_form_template_id,
        created_at,
        updated_at
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (listError) {
      throw new Error(`Failed to list conversions: ${listError.message}`);
    }
    
    return NextResponse.json({ conversions });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get conversion status');
  }
}

