import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSafeOrFilter } from '@/lib/utils/search-sanitizer';

// ============================================================================
// GET /api/certifications - List certifications with filters
// ============================================================================

export async function GET(request: NextRequest) {
  try {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for company_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const workerId = searchParams.get('worker_id');
    const certTypeId = searchParams.get('certification_type_id');
    const status = searchParams.get('status');
    const expiringDays = searchParams.get('expiring_within_days');
    const verified = searchParams.get('verified');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('certifications')
      .select(`
        *,
        certification_type:certification_types(*),
        worker:workers(id, first_name, last_name, email, position)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    // Apply filters
    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    if (certTypeId) {
      query = query.eq('certification_type_id', certTypeId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (verified !== null && verified !== 'all') {
      query = query.eq('verified', verified === 'true');
    }

    if (expiringDays) {
      const days = parseInt(expiringDays);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      query = query
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0]);
    }

    if (search) {
      const safeFilter = createSafeOrFilter(['name', 'certificate_number'], search);
      if (safeFilter) {
        query = query.or(safeFilter);
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: certifications, error, count } = await query;

    if (error) {
      console.error('Error fetching certifications:', error);
      return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 });
    }

    return NextResponse.json({
      certifications,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in GET /api/certifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/certifications - Create a new certification
// ============================================================================

export async function POST(request: NextRequest) {
  try {
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 403 });
    }

    const body = await request.json();
    const {
      worker_id,
      certification_type_id,
      name,
      issuing_organization,
      certificate_number,
      issue_date,
      expiry_date,
      notes,
    } = body;

    // Validate required fields
    if (!worker_id || !name) {
      return NextResponse.json(
        { error: 'worker_id and name are required' },
        { status: 400 }
      );
    }

    // Verify worker belongs to company
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('id', worker_id)
      .eq('company_id', profile.company_id)
      .single();

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Determine status based on expiry date
    let status = 'active';
    if (expiry_date && new Date(expiry_date) < new Date()) {
      status = 'expired';
    }

    // Create certification
    const { data: certification, error } = await supabase
      .from('certifications')
      .insert({
        company_id: profile.company_id,
        worker_id,
        certification_type_id: certification_type_id || null,
        name,
        issuing_organization: issuing_organization || null,
        certificate_number: certificate_number || null,
        issue_date: issue_date || null,
        expiry_date: expiry_date || null,
        notes: notes || null,
        status,
        verified: false,
      })
      .select(`
        *,
        certification_type:certification_types(*),
        worker:workers(id, first_name, last_name, email, position)
      `)
      .single();

    if (error) {
      console.error('Error creating certification:', error);
      return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 });
    }

    return NextResponse.json({ certification }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/certifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
