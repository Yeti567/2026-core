import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/company/locations
 * Get all company locations
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

    // Get locations
    const { data: locations, error } = await supabase
      .from('company_locations')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching locations:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    return NextResponse.json({ locations: locations || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/company/locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/company/locations
 * Create a new company location
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

    // Only admins can create locations
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, city, province, postal_code, location_type, is_primary } = body;

    if (!name) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    // If this is set as primary, unset other primary locations
    if (is_primary) {
      await supabase
        .from('company_locations')
        .update({ is_primary: false })
        .eq('company_id', profile.company_id)
        .eq('is_primary', true);
    }

    // Create location
    const { data: location, error } = await supabase
      .from('company_locations')
      .insert({
        company_id: profile.company_id,
        name,
        address: address || null,
        city: city || null,
        province: province || null,
        postal_code: postal_code || null,
        location_type: location_type || 'office',
        is_primary: is_primary || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
    }

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error('Error in POST /api/admin/company/locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/company/locations
 * Update a company location
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

    // Only admins can update locations
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // If setting as primary, unset other primary locations
    if (updates.is_primary) {
      await supabase
        .from('company_locations')
        .update({ is_primary: false })
        .eq('company_id', profile.company_id)
        .eq('is_primary', true)
        .neq('id', id);
    }

    // Update location
    const { data: location, error } = await supabase
      .from('company_locations')
      .update(updates)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error('Error in PATCH /api/admin/company/locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/company/locations
 * Delete (deactivate) a company location
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

    // Only admins can delete locations
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('company_locations')
      .update({ is_active: false })
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) {
      console.error('Error deleting location:', error);
      return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/company/locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
