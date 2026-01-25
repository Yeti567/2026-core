import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ============================================================================
// GET /api/certifications/[id] - Get single certification
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

    const { data: certification, error } = await supabase
      .from('certifications')
      .select(`
        *,
        certification_type:certification_types(*),
        worker:workers(id, first_name, last_name, email, position, department, supervisor_id)
      `)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (error || !certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    return NextResponse.json({ certification });
  } catch (error) {
    console.error('Error in GET /api/certifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/certifications/[id] - Update certification
// ============================================================================

export async function PATCH(
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
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Allowed update fields
    const allowedFields = [
      'name',
      'issuing_organization',
      'certificate_number',
      'issue_date',
      'expiry_date',
      'notes',
      'status',
      'certification_type_id',
    ];

    for (const field of allowedFields) {
      // Safe: field is from predefined allowedFields array
      // eslint-disable-next-line security/detect-object-injection
      if (body[field] !== undefined) {
        // Safe: field is from predefined allowedFields array
        // eslint-disable-next-line security/detect-object-injection
        updateData[field] = body[field];
      }
    }

    // Handle verification (admin/supervisor only)
    if (body.verified !== undefined) {
      if (!['admin', 'supervisor', 'super_admin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Not authorized to verify' }, { status: 403 });
      }
      updateData.verified = body.verified;
      if (body.verified) {
        updateData.verified_by = user.id;
        updateData.verified_at = new Date().toISOString();
      } else {
        updateData.verified_by = null;
        updateData.verified_at = null;
      }
    }

    // Auto-update status based on expiry date
    if (updateData.expiry_date) {
      const expiryDate = new Date(updateData.expiry_date as string);
      if (expiryDate < new Date()) {
        updateData.status = 'expired';
      } else if (updateData.status === 'expired') {
        updateData.status = 'active';
      }
    }

    const { data: certification, error } = await supabase
      .from('certifications')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select(`
        *,
        certification_type:certification_types(*),
        worker:workers(id, first_name, last_name, email, position)
      `)
      .single();

    if (error) {
      console.error('Error updating certification:', error);
      return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
    }

    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    return NextResponse.json({ certification });
  } catch (error) {
    console.error('Error in PATCH /api/certifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/certifications/[id] - Delete certification
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
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    // Only admin can delete
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get certification to delete associated file
    const { data: certification } = await supabase
      .from('certifications')
      .select('file_path, thumbnail_path')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single();

    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    // Delete files from storage if they exist
    if (certification.file_path) {
      await supabase.storage.from('certifications').remove([certification.file_path]);
    }
    if (certification.thumbnail_path) {
      await supabase.storage.from('certifications').remove([certification.thumbnail_path]);
    }

    // Delete certification record
    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) {
      console.error('Error deleting certification:', error);
      return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/certifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
