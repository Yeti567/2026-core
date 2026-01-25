/**
 * PDF Upload API Route
 * 
 * Handles PDF file uploads for form conversion.
 * POST: Upload a PDF file
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import {
  validateFileUpload,
  createSecureStoragePath,
  sanitizeFilename,
} from '@/lib/utils/file-upload-validation';
import { handleApiError, handleFileError } from '@/lib/utils/error-handling';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's company
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
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file upload (type, size, content validation with magic bytes)
    const allowedTypes = ['application/pdf'];
    const validation = await validateFileUpload(file, allowedTypes);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Generate secure storage path using UUID-based filename
    const secureFilename = validation.filename!;
    const storagePath = createSecureStoragePath(
      profile.company_id,
      'pdf-forms',
      secureFilename
    );
    
    // Store original filename for display (sanitized)
    const originalFilename = sanitizeFilename(file.name);
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
    
    // Get user profile ID
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    // Create PDF upload record
    const { data: pdfUpload, error: insertError } = await supabase
      .from('pdf_form_uploads')
      .insert({
        company_id: profile.company_id,
        uploaded_by: userProfile?.id || null,
        file_name: originalFilename, // Store sanitized original name for display
        file_size_bytes: file.size,
        storage_path: storagePath,
        status: 'pending',
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
        created_by: userProfile?.id || null,
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('Session creation error:', sessionError);
    }
    
    return NextResponse.json({
      success: true,
      upload: pdfUpload,
      session: session,
    });
    
  } catch (error) {
    return handleFileError(error, 'upload PDF');
  }
}

