import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/admin/company/profile
 * Update company profile information (industry, employee count, etc.)
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

    // Only admins can update company profile
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { industry, employee_count, years_in_business, main_services } = body;

    // Update company
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        industry: industry || null,
        employee_count: employee_count || null,
        years_in_business: years_in_business || null,
        main_services: main_services || null,
      })
      .eq('id', profile.company_id);

    if (updateError) {
      console.error('Error updating company profile:', updateError);
      return NextResponse.json({ error: 'Failed to update company profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/admin/company/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
