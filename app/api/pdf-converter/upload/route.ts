/**
 * PDF Upload API Route
 * 
 * Handles PDF file uploads for form conversion.
 * POST: Upload a PDF file
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { handleFileError } from '@/lib/utils/error-handling';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Simple filename sanitization
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication using Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's company and profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', authUser.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const companyId = profile.company_id;
    if (!companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    // Check permissions - allow admin and safety roles
    if (!['admin', 'internal_auditor', 'safety_coordinator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB' }, { status: 400 });
    }
    
    // Generate secure filename
    const fileId = randomUUID();
    const originalFilename = sanitizeFilename(file.name);
    const storagePath = `${companyId}/pdf-forms/${fileId}.pdf`;
    
    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
    
    // Create PDF upload record in database
    const { data: pdfUpload, error: insertError } = await supabase
      .from('pdf_form_uploads')
      .insert({
        company_id: companyId,
        uploaded_by: profile.id,
        file_name: originalFilename,
        file_size_bytes: file.size,
        storage_path: storagePath,
        mime_type: 'application/pdf',
        status: 'uploaded',
        processing_status: 'pending',
        processing_attempts: 0,
        page_count: 1, // Will be updated during processing
        ocr_confidence: 0,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 });
    }
    
    // Create conversion session
    const { data: session, error: sessionError } = await supabase
      .from('pdf_conversion_sessions')
      .insert({
        pdf_upload_id: pdfUpload.id,
        current_step: 'upload',
        created_by: profile.id,
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('Session creation error:', sessionError);
      // Continue anyway - session is not critical for upload
    }
    
    return NextResponse.json({
      success: true,
      upload: pdfUpload,
      session: session,
    });
    
  } catch (error) {
    console.error('PDF upload error:', error);
    return handleFileError(error, 'upload PDF');
  }
}

