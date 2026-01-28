import { NextRequest, NextResponse } from 'next/server';
import { authenticateServerComponent } from '@/lib/auth/jwt-middleware';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// GET /api/training/types - List training record types
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

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Note: profile.company_id is server-controlled (from database query result)
    // Safe to use directly as it comes from authenticated user's profile
    let query = supabase
      .from('training_record_types')
      .select('*')
      .or(`company_id.is.null,company_id.eq.${profile.company_id}`)
      .order('name');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: types, error } = await query;

    if (error) {
      console.error('Error fetching training types:', error);
      return NextResponse.json({ error: 'Failed to fetch training types' }, { status: 500 });
    }

    return NextResponse.json({ types });
  } catch (error) {
    console.error('Error in GET /api/training/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/training/types - Create custom training type
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

    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      category,
      description,
      requires_hours,
      default_hours,
      recurrence_months,
    } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const { data: trainingType, error } = await supabase
      .from('training_record_types')
      .insert({
        company_id: profile.company_id,
        name,
        category,
        description: description || null,
        requires_hours: requires_hours ?? false,
        default_hours: default_hours || null,
        recurrence_months: recurrence_months || null,
        is_system_default: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating training type:', error);
      return NextResponse.json({ error: 'Failed to create training type' }, { status: 500 });
    }

    return NextResponse.json({ type: trainingType }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/training/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
