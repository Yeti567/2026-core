import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/departments/[id]/equipment
 * Get all equipment in a department
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

    // Get equipment in department
    const { data: equipment, error } = await supabase
      .from('equipment_inventory')
      .select('id, equipment_number, equipment_type, name, make, model, status, current_location')
      .eq('department_id', params.id)
      .neq('status', 'retired')
      .order('equipment_type', { ascending: true })
      .order('equipment_number', { ascending: true });

    if (error) {
      console.error('Error fetching equipment:', error);
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
    }

    return NextResponse.json({ equipment: equipment || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/departments/[id]/equipment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/departments/[id]/equipment
 * Assign equipment to a department
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

    // Only admins can assign equipment
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
    const { equipment_ids } = body;

    if (!Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return NextResponse.json({ error: 'Equipment IDs array is required' }, { status: 400 });
    }

    // Update equipment to assign them to department
    const { error } = await supabase
      .from('equipment_inventory')
      .update({ department_id: params.id })
      .in('id', equipment_ids)
      .eq('company_id', profile.company_id);

    if (error) {
      console.error('Error assigning equipment:', error);
      return NextResponse.json({ error: 'Failed to assign equipment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, assigned_count: equipment_ids.length });
  } catch (error) {
    console.error('Error in POST /api/admin/departments/[id]/equipment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
