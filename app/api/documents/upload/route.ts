/**
 * Document Upload API
 * 
 * POST - Upload a PDF document with automatic:
 *   - Text extraction
 *   - Control number generation
 *   - Reference detection
 *   - Search indexing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processUploadedDocument } from '@/lib/documents/pdf-extractor';
import { checkRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { handleApiError } from '@/lib/utils/error-handling';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting: 10 uploads per minute per user
    const rateLimitKey = `upload:${user.id}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many upload requests. Please wait before uploading again.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
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
    
    // Check permissions (admin, supervisor, internal_auditor can upload)
    if (!['super_admin', 'admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const tagsString = formData.get('tags') as string | null;
    const corElementsString = formData.get('cor_elements') as string | null;
    const applicableToString = formData.get('applicable_to') as string | null;
    const folderId = formData.get('folder_id') as string | null;
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!documentType) {
      return NextResponse.json(
        { error: 'document_type is required' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }
    
    // Parse optional arrays
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : undefined;
    const corElements = corElementsString 
      ? corElementsString.split(',').map(e => parseInt(e.trim())).filter(n => !isNaN(n))
      : undefined;
    const applicableTo = applicableToString 
      ? applicableToString.split(',').map(a => a.trim()).filter(Boolean)
      : undefined;
    
    // Process the uploaded document
    const result = await processUploadedDocument(
      file,
      profile.company_id,
      documentType,
      profile.id,
      {
        title: title || undefined,
        description: description || undefined,
        tags,
        cor_elements: corElements,
        applicable_to: applicableTo,
        folder_id: folderId || undefined,
      }
    );
    
    // Return success response
    return NextResponse.json({
      success: true,
      document: result.document,
      extraction: {
        success: result.extraction.success,
        pages: result.extraction.pages,
        text_length: result.extraction.text?.length || 0,
        error: result.extraction.error,
      },
      referenced_documents: result.controlNumbers,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Document upload error:', error);
    // Don't expose internal error messages to clients
    return NextResponse.json(
      { error: 'An error occurred while uploading. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get upload progress or status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Get upload statistics
    if (action === 'stats') {
      const { data: recentUploads, count } = await supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .eq('status', 'draft')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      return NextResponse.json({
        recent_uploads: recentUploads || [],
        uploads_today: count || 0,
      });
    }
    
    // Get supported document types
    if (action === 'types') {
      const { data: types } = await supabase
        .from('document_types')
        .select('code, name, description, requires_approval')
        .eq('is_active', true)
        .order('sort_order');
      
      return NextResponse.json({ types: types || [] });
    }
    
    return NextResponse.json({ 
      message: 'Upload endpoint ready',
      max_file_size: '50MB',
      supported_types: ['application/pdf'],
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get info');
  }
}
