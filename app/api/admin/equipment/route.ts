import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/equipment
 * Get all equipment for the company
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

    // Get all equipment
    const { data: equipment, error } = await supabase
      .from('equipment_inventory')
      .select('id, equipment_number, equipment_type, name, make, model, status, current_location, department_id')
      .eq('company_id', profile.company_id)
      .neq('status', 'retired')
      .order('equipment_type', { ascending: true })
      .order('equipment_number', { ascending: true });

    if (error) {
      console.error('Error fetching equipment:', error);
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
    }

    return NextResponse.json({ equipment: equipment || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/equipment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
