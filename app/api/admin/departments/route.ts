import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/departments
 * Get all departments for the company
 */
export async function GET() {
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

    // Get all departments with hierarchy and stats
    const { data: departments, error } = await supabase
      .from('departments')
      .select(`
        *,
        superintendent:workers!departments_superintendent_id_fkey(id, first_name, last_name, email, position),
        manager:workers!departments_manager_id_fkey(id, first_name, last_name, email, position),
        parent_department:departments!departments_parent_department_id_fkey(id, name, code)
      `)
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }

    // Get stats for each department
    const departmentsWithStats = await Promise.all(
      (departments || []).map(async (dept) => {
        // Get worker count
        const { count: workerCount } = await supabase
          .from('workers')
          .select('id', { count: 'exact', head: true })
          .eq('department_id', dept.id)
          .eq('is_active', true);

        // Get equipment count
        const { count: equipmentCount } = await supabase
          .from('equipment_inventory')
          .select('id', { count: 'exact', head: true })
          .eq('department_id', dept.id)
          .neq('status', 'retired');

        return {
          ...dept,
          worker_count: workerCount || 0,
          equipment_count: equipmentCount || 0,
        };
      })
    );

    return NextResponse.json({ departments: departmentsWithStats });
  } catch (error) {
    console.error('Error in GET /api/admin/departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/departments
 * Create a new department
 */
export async function POST(request: Request) {
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

    // Only admins can create departments
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      parent_department_id,
      superintendent_id,
      manager_id,
      department_type,
      display_order,
      color_code,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    // Create department
    const { data: department, error } = await supabase
      .from('departments')
      .insert({
        company_id: profile.company_id,
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        parent_department_id: parent_department_id || null,
        superintendent_id: superintendent_id || null,
        manager_id: manager_id || null,
        department_type: department_type || 'division',
        display_order: display_order || 0,
        color_code: color_code || null,
        is_active: true,
      })
      .select(`
        *,
        superintendent:workers!departments_superintendent_id_fkey(id, first_name, last_name, email, position),
        manager:workers!departments_manager_id_fkey(id, first_name, last_name, email, position)
      `)
      .single();

    if (error) {
      console.error('Error creating department:', error);
      return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
    }

    return NextResponse.json({ success: true, department });
  } catch (error) {
    console.error('Error in POST /api/admin/departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/departments
 * Update a department
 */
export async function PATCH(request: Request) {
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

    // Only admins can update departments
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    // Update department
    const { data: department, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select(`
        *,
        superintendent:workers!departments_superintendent_id_fkey(id, first_name, last_name, email, position),
        manager:workers!departments_manager_id_fkey(id, first_name, last_name, email, position)
      `)
      .single();

    if (error) {
      console.error('Error updating department:', error);
      return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
    }

    return NextResponse.json({ success: true, department });
  } catch (error) {
    console.error('Error in PATCH /api/admin/departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/departments
 * Delete (deactivate) a department
 */
export async function DELETE(request: Request) {
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

    // Only admins can delete departments
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('departments')
      .update({ is_active: false })
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) {
      console.error('Error deleting department:', error);
      return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
