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

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    // TODO: Implement user authentication without Supabase
      const { data: { user: authUser }, error: authError } = { data: { user: { id: 'placeholder' } }, error: new Error('Auth not implemented') };;
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', authUser.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const companyId = profile.company_id;
    if (!companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
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

    const uploadedFile = file;
    
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
      companyId,
      'pdf-forms',
      secureFilename
    );
    
    // Store original filename for display (sanitized)
    const originalFilename = sanitizeFilename(uploadedFile.name);
    
    // Convert file to buffer
    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    // TODO: Implement storage without Supabase
      // const { data: upload, error: uploadError } = await supabase.storage
      //   .from('pdf-uploads')
      //   .upload(sanitizedFilename, file, {
      //     cacheControl: '3600',
      throw new Error('Storage not implemented yet - please implement file storage');
      
      // Get user profile ID
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .single();
      
      // Create PDF upload record
      const { data: pdfUpload, error: insertError } = await supabase
        .from('pdf_form_uploads')
        .insert({
          company_id: companyId,
          uploaded_by: userProfile?.id || null,
          file_name: originalFilename, // Store sanitized original name for display
          file_size_bytes: uploadedFile.size,
          storage_path: secureFilename,
          mime_type: uploadedFile.type,
          status: 'uploaded',
          processing_status: 'pending',
          processing_attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      // TODO: Clean up uploaded file when storage is implemented
      // await supabase.storage.from('documents').remove([storagePath]);
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

