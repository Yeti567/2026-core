/**
 * Document Upload API
 * 
 * POST - Upload PDF file and extract text
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getVersion,
  extractTextFromPDF,
  cleanExtractedText,
  autoLinkDocument,
  findControlNumbers,
} from '@/lib/documents';
import {
  validateFileUpload,
  createSecureStoragePath,
  sanitizeFilename,
} from '@/lib/utils/file-upload-validation';
import { handleFileError } from '@/lib/utils/error-handling';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check permissions
    if (!['super_admin', 'admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const versionId = formData.get('version_id') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!versionId) {
      return NextResponse.json({ error: 'version_id is required' }, { status: 400 });
    }
    
    // Verify version exists and belongs to document
    const version = await getVersion(versionId);
    if (!version || version.document_id !== documentId) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    
    // Validate file upload (type, size, content)
    const allowedTypes = ['application/pdf']; // Only PDFs for document versions
    const validation = await validateFileUpload(file, allowedTypes);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Get file buffer
    const buffer = await file.arrayBuffer();
    
    // Generate secure file path using UUID-based filename
    const secureFilename = validation.filename!;
    const filePath = createSecureStoragePath(
      profile.company_id,
      `${documentId}/${versionId}`,
      secureFilename
    );
    
    // Store original filename for display (sanitized)
    const originalFilename = sanitizeFilename(file.name);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (uploadError) {
      const { handleFileError } = await import('@/lib/utils/error-handling');
      return handleFileError(uploadError, 'upload file');
    }
    
    // Extract text from PDF
    let extractedText = '';
    let extractionResult;
    
    if (file.type === 'application/pdf') {
      extractionResult = await extractTextFromPDF(buffer);
      if (extractionResult.success) {
        extractedText = cleanExtractedText(extractionResult.text);
      }
    }
    
    // Update version with file info and extracted text
    const { error: updateError } = await supabase
      .from('document_versions')
      .update({
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        extracted_text: extractedText || null,
      })
      .eq('id', versionId);
    
    if (updateError) {
      console.error('Update version error:', updateError);
    }
    
    // Auto-link to audit elements based on content
    let auditLinks: any[] = [];
    if (extractedText) {
      try {
        auditLinks = await autoLinkDocument(documentId, extractedText);
      } catch (e) {
        console.warn('Auto-link failed:', e);
      }
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    
    return NextResponse.json({
      success: true,
      file_path: filePath,
      file_name: originalFilename, // Return sanitized original name
      file_size: file.size,
      public_url: urlData?.publicUrl,
      extraction: extractionResult ? {
        success: extractionResult.success,
        page_count: extractionResult.pages,
        control_numbers: extractionResult.success ? findControlNumbers(extractedText) : [],
        text_length: extractedText.length,
      } : null,
      audit_links: auditLinks.length,
    });
  } catch (error) {
    return handleFileError(error, 'upload file');
  }
}
