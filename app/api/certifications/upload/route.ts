/**
 * Certificate Upload API
 * 
 * POST /api/certifications/upload
 * 
 * Handles certificate file uploads with image processing
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// =============================================================================
// SUPABASE CLIENT HELPERS
// =============================================================================

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase service configuration');
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

async function getUserClient() {
  // Route handlers can use the SSR client wrapper (cookie-aware).
  return createRouteHandlerClient();
}

// =============================================================================
// POST - Upload Certificate
// =============================================================================

export async function POST(req: Request) {
  try {
    // Authenticate user
    const supabase = await getUserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 uploads per minute per user
    const rateLimitKey = `cert-upload:${user.id}`;
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

    // Get user profile with company_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check permissions - only admins and supervisors can upload
    if (!['super_admin', 'admin', 'supervisor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const workerId = formData.get('worker_id') as string;
    const certTypeId = formData.get('certification_type_id') as string;
    const certNumber = formData.get('certificate_number') as string;
    const issueDate = formData.get('issue_date') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const issuingOrg = formData.get('issuing_organization') as string;
    const instructorName = formData.get('instructor_name') as string;
    const courseHours = formData.get('course_hours') as string;
    const notes = formData.get('notes') as string;
    const verified = formData.get('verified') === 'true';
    const existingId = formData.get('existing_id') as string;

    // Validate required fields
    if (!workerId || !certTypeId || !issueDate) {
      return NextResponse.json(
        { error: 'Missing required fields: worker_id, certification_type_id, issue_date' },
        { status: 400 }
      );
    }

    // Verify worker belongs to same company
    const serviceClient = getServiceClient();
    const { data: worker, error: workerError } = await serviceClient
      .from('user_profiles')
      .select('id, company_id')
      .eq('id', workerId)
      .single();

    if (workerError || !worker || worker.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Worker not found or access denied' }, { status: 404 });
    }

    // Process file upload if provided
    let filePath: string | null = null;
    let thumbnailPath: string | null = null;
    let fileType: 'pdf' | 'image' | null = null;

    if (file && file.size > 0) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Supported: JPEG, PNG, WebP, HEIC, PDF' },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10MB' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const isPDF = file.type === 'application/pdf';
      const extension = isPDF ? 'pdf' : getExtensionFromMime(file.type);
      const filename = `${profile.company_id}/${workerId}/${timestamp}_${randomId}.${extension}`;

      // Convert file to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await serviceClient.storage
        .from('certifications')
        .upload(filename, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
      }

      filePath = uploadData.path;
      fileType = isPDF ? 'pdf' : 'image';

      // For images, also use the main file path as thumbnail for now
      // (Server-side thumbnail generation would require additional libraries)
      if (!isPDF) {
        thumbnailPath = uploadData.path;
      }
    }

    // Prepare certification data
    const certificationData: Record<string, any> = {
      worker_id: workerId,
      certification_type_id: certTypeId,
      certificate_number: certNumber || null,
      issue_date: issueDate,
      expiry_date: expiryDate || null,
      issuing_organization: issuingOrg || null,
      instructor_name: instructorName || null,
      course_hours: courseHours ? parseFloat(courseHours) : null,
      notes: notes || null,
      company_id: profile.company_id,
      created_by: profile.id,
    };

    // Add file fields if file was uploaded
    if (filePath) {
      certificationData.certificate_file_path = filePath;
      certificationData.file_type = fileType;
    }
    if (thumbnailPath) {
      certificationData.certificate_image_path = thumbnailPath;
      certificationData.thumbnail_path = thumbnailPath;
    }

    // Add verification if checked
    if (verified) {
      certificationData.verified_by = profile.id;
      certificationData.verified_at = new Date().toISOString();
    }

    let certification;

    if (existingId) {
      // Update existing certification
      const { data: existingCert, error: existingError } = await serviceClient
        .from('worker_certifications')
        .select('id, company_id')
        .eq('id', existingId)
        .single();

      if (existingError || !existingCert || existingCert.company_id !== profile.company_id) {
        return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
      }

      certificationData.updated_at = new Date().toISOString();

      const { data, error } = await serviceClient
        .from('worker_certifications')
        .update(certificationData)
        .eq('id', existingId)
        .select(`
          *,
          certification_type:certification_types(*)
        `)
        .single();

      if (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
      }

      certification = data;
    } else {
      // Create new certification
      const { data, error } = await serviceClient
        .from('worker_certifications')
        .insert(certificationData)
        .select(`
          *,
          certification_type:certification_types(*)
        `)
        .single();

      if (error) {
        console.error('Insert error:', error);
        return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 });
      }

      certification = data;

      // Create reminder schedule
      if (expiryDate) {
        await createReminderSchedule(serviceClient, certification.id, expiryDate, profile.company_id);
      }
    }

    return NextResponse.json({
      success: true,
      certification,
    });
  } catch (err: unknown) {
    console.error('Certificate upload error:', err);
    // Don't expose internal error messages to clients
    return NextResponse.json(
      { error: 'An error occurred while uploading. Please try again.' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getExtensionFromMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'application/pdf': 'pdf',
  };
  // Safe: mimeType is validated against allowedTypes before this function is called
  // eslint-disable-next-line security/detect-object-injection
  return extensions[mimeType] || 'jpg';
}

async function createReminderSchedule(
  supabase: any,
  certificationId: string,
  expiryDate: string,
  companyId: string
): Promise<void> {
  try {
    const expiry = new Date(expiryDate);
    const reminders = [
      { days: 60, type: '60_day' },
      { days: 30, type: '30_day' },
      { days: 7, type: '7_day' },
    ];

    const reminderRecords = reminders
      .map(r => {
        const reminderDate = new Date(expiry);
        reminderDate.setDate(reminderDate.getDate() - r.days);

        // Only create future reminders
        if (reminderDate > new Date()) {
          return {
            certification_id: certificationId,
            reminder_type: r.type,
            scheduled_date: reminderDate.toISOString().split('T')[0],
            status: 'pending',
            company_id: companyId,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (reminderRecords.length > 0) {
      await supabase
        .from('certification_reminders')
        .insert(reminderRecords);
    }
  } catch (err) {
    console.error('Failed to create reminder schedule:', err);
    // Don't fail the main operation
  }
}
