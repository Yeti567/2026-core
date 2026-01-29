import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    
    // Fetch hazards - global (company_id IS NULL) + company-specific
    const { data: hazards, error: fetchError } = await supabase
      .from('hazard_library')
      .select('*')
      .eq('is_active', true)
      .or(`company_id.is.null,company_id.eq.${profile?.company_id}`)
      .order('category')
      .order('name');
    
    if (fetchError) {
      console.error('Error fetching hazards:', fetchError);
      return NextResponse.json({ error: 'Failed to load hazards' }, { status: 500 });
    }
    
    return NextResponse.json({ hazards: hazards || [] });
  } catch (error) {
    console.error('Hazards API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile || !['admin', 'internal_auditor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    
    // Generate hazard code
    const codePrefix = body.category?.toUpperCase().slice(0, 4) || 'CUST';
    const timestamp = Date.now().toString(36).toUpperCase();
    const hazard_code = `${codePrefix}-${timestamp}`;
    
    const { data: hazard, error: createError } = await supabase
      .from('hazard_library')
      .insert({
        ...body,
        company_id: profile.company_id,
        hazard_code,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating hazard:', createError);
      return NextResponse.json({ error: 'Failed to create hazard' }, { status: 500 });
    }
    
    return NextResponse.json({ hazard }, { status: 201 });
  } catch (error) {
    console.error('Hazards API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
