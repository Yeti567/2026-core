/**
 * Document Distributions API
 * 
 * GET - Get distribution records or unacknowledged count
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Get unacknowledged count for current user
    if (searchParams.get('unacknowledged') === 'true') {
      const { count } = await supabase
        .from('document_distributions')
        .select('*', { count: 'exact', head: true })
        .eq('distributed_to', profile.id)
        .eq('acknowledged', false);
      
      return NextResponse.json({ count: count || 0 });
    }
    
    // Get all unacknowledged documents for user
    if (searchParams.get('pending') === 'true') {
      const { data: distributions } = await supabase
        .from('document_distributions')
        .select(`
          id,
          distributed_at,
          document:documents(
            id,
            control_number,
            title,
            document_type_code,
            version,
            description
          )
        `)
        .eq('distributed_to', profile.id)
        .eq('acknowledged', false)
        .order('distributed_at', { ascending: false });
      
      return NextResponse.json({ distributions: distributions || [] });
    }
    
    // Admin view: Get all distributions for a document or company
    if (['admin', 'super_admin', 'supervisor'].includes(profile.role)) {
      const documentId = searchParams.get('document_id');
      
      if (documentId) {
        const { data: distributions } = await supabase
          .from('document_distributions')
          .select(`
            *,
            user:user_profiles!distributed_to(
              id,
              full_name,
              email
            )
          `)
          .eq('document_id', documentId)
          .eq('company_id', profile.company_id)
          .order('distributed_at', { ascending: false });
        
        return NextResponse.json({ distributions: distributions || [] });
      }
      
      // Get distribution summary for company
      const { data: summary } = await supabase
        .from('document_distributions')
        .select('acknowledged')
        .eq('company_id', profile.company_id);
      
      const total = summary?.length || 0;
      const acknowledged = summary?.filter(d => d.acknowledged).length || 0;
      
      return NextResponse.json({
        total_distributions: total,
        acknowledged_count: acknowledged,
        pending_count: total - acknowledged,
        acknowledgment_rate: total > 0 ? Math.round((acknowledged / total) * 100) : 0,
      });
    }
    
    return NextResponse.json({ distributions: [] });
  } catch (error) {
    return handleApiError(error, 'Failed to get distributions');
  }
}
