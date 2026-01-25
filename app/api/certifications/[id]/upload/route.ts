import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  validateFileUpload,
  createSecureStoragePath,
  sanitizeFilename,
} from '@/lib/utils/file-upload-validation';

// ============================================================================
// POST /api/certifications/[id]/upload - Upload certification file
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    // Verify certification exists and belongs to company
    const { data: certification } = await supabase
      .from('certifications')
      .select('id, worker_id, file_path')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file upload (type, size, content validation)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    const validation = await validateFileUpload(file, allowedTypes);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Delete existing file if present
    if (certification.file_path) {
      await supabase.storage.from('certifications').remove([certification.file_path]);
    }

    // Generate secure file path using UUID-based filename
    const secureFilename = validation.filename!;
    const fileName = createSecureStoragePath(
      profile.company_id,
      certification.worker_id,
      `${id}_${secureFilename}`
    );
    
    // Store original filename for display (sanitized)
    const originalFilename = sanitizeFilename(file.name);
    
    // Get file buffer for upload
    const buffer = await file.arrayBuffer();

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('certifications')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';

    // Update certification record
    const { data: updatedCert, error: updateError } = await supabase
      .from('certifications')
      .update({
        file_path: fileName,
        file_type: fileType,
        file_name: originalFilename, // Store sanitized original name for display
        file_size: file.size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
    }

    // Get signed URL for the file
    const { data: urlData } = await supabase.storage
      .from('certifications')
      .createSignedUrl(fileName, 3600); // 1 hour

    return NextResponse.json({
      certification: updatedCert,
      fileUrl: urlData?.signedUrl,
    });
  } catch (error) {
    console.error('Error in POST /api/certifications/[id]/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// GET /api/certifications/[id]/upload - Get file URL
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    const { data: certification } = await supabase
      .from('certifications')
      .select('file_path, file_type, file_name')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!certification || !certification.file_path) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: urlData } = await supabase.storage
      .from('certifications')
      .createSignedUrl(certification.file_path, 3600);

    if (!urlData) {
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      fileName: certification.file_name,
      fileType: certification.file_type,
    });
  } catch (error) {
    console.error('Error in GET /api/certifications/[id]/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/certifications/[id]/upload - Delete file
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    const { data: certification } = await supabase
      .from('certifications')
      .select('file_path, thumbnail_path')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!certification || !certification.file_path) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete file from storage
    await supabase.storage.from('certifications').remove([certification.file_path]);
    if (certification.thumbnail_path) {
      await supabase.storage.from('certifications').remove([certification.thumbnail_path]);
    }

    // Update certification record
    await supabase
      .from('certifications')
      .update({
        file_path: null,
        file_type: null,
        file_name: null,
        file_size: null,
        thumbnail_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/certifications/[id]/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
