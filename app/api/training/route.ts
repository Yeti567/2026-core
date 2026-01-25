import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ============================================================================
// GET /api/training - List training records
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
    const workerId = searchParams.get('worker_id');
    const category = searchParams.get('category');
    const trainingTypeId = searchParams.get('training_type_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('training_records')
      .select(`
        *,
        training_type:training_record_types(*),
        worker:workers(id, first_name, last_name, email, position),
        instructor:workers!training_records_instructor_id_fkey(id, first_name, last_name)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('completed_date', { ascending: false });

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (trainingTypeId) {
      query = query.eq('training_type_id', trainingTypeId);
    }

    if (dateFrom) {
      query = query.gte('completed_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('completed_date', dateTo);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: records, error, count } = await query;

    if (error) {
      console.error('Error fetching training records:', error);
      return NextResponse.json({ error: 'Failed to fetch training records' }, { status: 500 });
    }

    return NextResponse.json({
      records,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in GET /api/training:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/training - Create training record
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

    const body = await request.json();
    const {
      worker_id,
      worker_ids, // For bulk creation
      training_type_id,
      title,
      description,
      category,
      completed_date,
      hours_completed,
      instructor_name,
      instructor_id,
      competency_level,
      assessment_passed,
      topics,
      notes,
    } = body;

    // Validate required fields
    if (!title || !category || !completed_date) {
      return NextResponse.json(
        { error: 'title, category, and completed_date are required' },
        { status: 400 }
      );
    }

    // Handle bulk creation (for toolbox talks with multiple attendees)
    const workerIdList = worker_ids || (worker_id ? [worker_id] : []);
    
    if (workerIdList.length === 0) {
      return NextResponse.json({ error: 'At least one worker_id is required' }, { status: 400 });
    }

    // Verify all workers belong to company
    const { data: workers } = await supabase
      .from('workers')
      .select('id')
      .in('id', workerIdList)
      .eq('company_id', profile.company_id);

    if (!workers || workers.length !== workerIdList.length) {
      return NextResponse.json({ error: 'One or more workers not found' }, { status: 404 });
    }

    // Create training records
    const recordsToInsert = workerIdList.map((wid: string) => ({
      company_id: profile.company_id,
      worker_id: wid,
      training_type_id: training_type_id || null,
      title,
      description: description || null,
      category,
      completed_date,
      hours_completed: hours_completed || null,
      instructor_name: instructor_name || null,
      instructor_id: instructor_id || null,
      competency_level: competency_level || null,
      assessment_passed: assessment_passed ?? null,
      topics: topics || null,
      notes: notes || null,
      verified: false,
    }));

    const { data: records, error } = await supabase
      .from('training_records')
      .insert(recordsToInsert)
      .select(`
        *,
        training_type:training_record_types(*),
        worker:workers(id, first_name, last_name, email, position)
      `);

    if (error) {
      console.error('Error creating training records:', error);
      return NextResponse.json({ error: 'Failed to create training records' }, { status: 500 });
    }

    return NextResponse.json({ records }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/training:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
