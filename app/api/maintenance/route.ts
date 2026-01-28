/**
 * Maintenance Dashboard API
 * GET - Get dashboard stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMaintenanceDashboardStats } from '@/lib/maintenance';
import { handleApiError } from '@/lib/utils/error-handling';

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
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const stats = await getMaintenanceDashboardStats(profile.company_id);
    
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error, 'Failed to get dashboard stats');
  }
}
