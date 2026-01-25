import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ============================================================================
// GET /api/certifications/types - List certification types
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

    // Get system defaults + company-specific types
    let query = supabase
      .from('certification_types')
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
      console.error('Error fetching certification types:', error);
      return NextResponse.json({ error: 'Failed to fetch certification types' }, { status: 500 });
    }

    return NextResponse.json({ types });
  } catch (error) {
    console.error('Error in GET /api/certifications/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/certifications/types - Create custom certification type
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
      short_code,
      description,
      category,
      default_expiry_months,
      required_for_work,
      alert_at_60_days,
      alert_at_30_days,
      alert_at_7_days,
      alert_on_expiry,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: certType, error } = await supabase
      .from('certification_types')
      .insert({
        company_id: profile.company_id,
        name,
        short_code: short_code || null,
        description: description || null,
        category: category || 'company-specific',
        default_expiry_months: default_expiry_months || null,
        required_for_work: required_for_work ?? false,
        alert_at_60_days: alert_at_60_days ?? true,
        alert_at_30_days: alert_at_30_days ?? true,
        alert_at_7_days: alert_at_7_days ?? true,
        alert_on_expiry: alert_on_expiry ?? true,
        is_system_default: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating certification type:', error);
      return NextResponse.json({ error: 'Failed to create certification type' }, { status: 500 });
    }

    return NextResponse.json({ type: certType }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/certifications/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
