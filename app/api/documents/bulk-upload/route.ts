/**
 * Bulk Document Upload API
 * 
 * POST: Upload multiple documents with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processUploadedDocument } from '@/lib/documents/pdf-extractor';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { handleApiError } from '@/lib/utils/error-handling';

interface FileMetadata {
  title?: string;
  description?: string;
  document_type: string;
  folder_id?: string;
  cor_elements?: number[];
  tags?: string[];
  keywords?: string[];
  applicable_to?: string[];
  is_critical?: boolean;
  worker_must_acknowledge?: boolean;
  acknowledgment_deadline_days?: number;
}

interface UploadResult {
  success: boolean;
  filename: string;
  document?: {
    id: string;
    control_number: string;
    title: string;
    folder_id?: string;
  };
  error?: string;
}

/**
 * POST /api/documents/bulk-upload
 * Upload multiple documents with metadata
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Rate limiting: 5 bulk uploads per hour per user
    const rateLimitKey = `bulk-upload:${user.id}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many bulk upload requests. Please wait before uploading again.',
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

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!['admin', 'supervisor', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to upload documents' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const metadataStr = formData.get('metadata') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    let metadataArray: FileMetadata[] = [];
    
    if (metadataStr) {
      try {
        metadataArray = JSON.parse(metadataStr);
      } catch {
        return NextResponse.json(
          { error: 'Invalid metadata JSON' },
          { status: 400 }
        );
      }
    }

    // Ensure metadata array matches files
    while (metadataArray.length < files.length) {
      metadataArray.push({ document_type: 'OTH' });
    }

    const results: UploadResult[] = [];
    const startTime = Date.now();

    // Process each file
    for (let i = 0; i < files.length; i++) {
      // Safe: i is a controlled loop index
      // eslint-disable-next-line security/detect-object-injection
      const file = files[i];
      // Safe: i is a controlled loop index, metadataArray length matches files length
      // eslint-disable-next-line security/detect-object-injection
      const meta = metadataArray[i];

      try {
        // Validate file
        if (file.size > 25 * 1024 * 1024) {
          results.push({
            success: false,
            filename: file.name,
            error: 'File size exceeds 25MB limit',
          });
          continue;
        }

        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
        ];

        if (!allowedTypes.includes(file.type)) {
          results.push({
            success: false,
            filename: file.name,
            error: `Unsupported file type: ${file.type}`,
          });
          continue;
        }

        // Process the document
        const result = await processUploadedDocument(
          file,
          profile.company_id,
          meta.document_type || 'OTH',
          profile.id,
          {
            title: meta.title,
            description: meta.description,
            tags: [...(meta.tags || []), ...(meta.keywords || [])],
            cor_elements: meta.cor_elements,
            applicable_to: meta.applicable_to,
            folder_id: meta.folder_id,
          }
        );

        // Update additional fields if provided
        if (meta.is_critical !== undefined || 
            meta.worker_must_acknowledge !== undefined ||
            meta.keywords !== undefined) {
          await supabase
            .from('documents')
            .update({
              is_critical: meta.is_critical,
              worker_must_acknowledge: meta.worker_must_acknowledge,
              keywords: meta.keywords,
              acknowledgment_deadline_days: meta.acknowledgment_deadline_days,
            })
            .eq('id', result.document.id);
        }

        results.push({
          success: true,
          filename: file.name,
          document: {
            id: result.document.id as string,
            control_number: result.document.control_number as string,
            title: result.document.title as string,
            folder_id: result.document.folder_id as string,
          },
        });

      } catch (error) {
        // Don't expose internal error details - use generic message
        console.error(`Bulk upload error for file ${file.name}:`, error);
        results.push({
          success: false,
          filename: file.name,
          error: 'Failed to process file. Please try again.',
        });
      }
    }

    const endTime = Date.now();
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: files.length,
        successful: successCount,
        failed: failureCount,
        total_size_bytes: totalSize,
        duration_ms: endTime - startTime,
      },
    });

  } catch (error) {
    return handleApiError(error, 'Bulk upload failed');
  }
}

/**
 * Check if a control number already exists
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const controlNumber = searchParams.get('check_control_number');

    if (!controlNumber) {
      return NextResponse.json(
        { error: 'Control number required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ exists: false });
    }

    // Check if control number exists
    const { data: existing } = await supabase
      .from('documents')
      .select('id, title, version, status')
      .eq('company_id', profile.company_id)
      .ilike('control_number', controlNumber)
      .single();

    return NextResponse.json({
      exists: !!existing,
      existing_document: existing ? {
        id: existing.id,
        title: existing.title,
        version: existing.version,
        status: existing.status,
      } : null,
    });

  } catch (error) {
    return handleApiError(error, 'Check failed');
  }
}
