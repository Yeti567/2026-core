import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/departments/[id]/workers
 * Get all workers in a department
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Verify department belongs to company
    const { data: department } = await supabase
      .from('departments')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single();

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Get workers in department
    const { data: workers, error } = await supabase
      .from('workers')
      .select('id, first_name, last_name, email, position, phone, is_active')
      .eq('department_id', params.id)
      .eq('is_active', true)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching workers:', error);
      return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
    }

    return NextResponse.json({ workers: workers || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/departments/[id]/workers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/departments/[id]/workers
 * Assign workers to a department
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company and role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only admins can assign workers
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify department belongs to company
    const { data: department } = await supabase
      .from('departments')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single();

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const body = await request.json();
    const { worker_ids } = body;

    if (!Array.isArray(worker_ids) || worker_ids.length === 0) {
      return NextResponse.json({ error: 'Worker IDs array is required' }, { status: 400 });
    }

    // Update workers to assign them to department
    const { error } = await supabase
      .from('workers')
      .update({ department_id: params.id })
      .in('id', worker_ids)
      .eq('company_id', profile.company_id);

    if (error) {
      console.error('Error assigning workers:', error);
      return NextResponse.json({ error: 'Failed to assign workers' }, { status: 500 });
    }

    return NextResponse.json({ success: true, assigned_count: worker_ids.length });
  } catch (error) {
    console.error('Error in POST /api/admin/departments/[id]/workers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
