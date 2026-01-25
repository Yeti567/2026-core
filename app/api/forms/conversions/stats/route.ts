/**
 * Conversion Stats API Route
 * 
 * GET: Get conversion statistics for the dashboard widget
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
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
    
    // Get all conversions
    const { data: conversions, error: convError } = await supabase
      .from('pdf_form_conversions')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });
    
    if (convError) {
      throw new Error(`Failed to fetch conversions: ${convError.message}`);
    }
    
    const allConversions = conversions || [];
    const published = allConversions.filter(c => c.conversion_status === 'published');
    const drafts = allConversions.filter(c => 
      c.conversion_status !== 'published' && c.conversion_status !== 'archived'
    );
    
    // Calculate total fields from all conversions
    let totalFields = 0;
    const recentConversions = [];
    
    for (const conv of allConversions.slice(0, 10)) {
      const { count } = await supabase
        .from('form_field_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('conversion_id', conv.id);
      
      const fieldCount = count || 0;
      totalFields += fieldCount;
      
      const ai = conv.ai_suggested_metadata as { 
        suggested_form_name?: string;
        suggested_cor_elements?: number[];
      } | null;
      
      recentConversions.push({
        id: conv.id,
        form_name: ai?.suggested_form_name || conv.original_pdf_name,
        original_pdf_name: conv.original_pdf_name,
        status: conv.conversion_status,
        fields_count: fieldCount,
        created_at: conv.created_at,
        published_at: conv.published_at,
        template_id: conv.mapped_form_template_id,
      });
    }
    
    // Count COR-related vs non-COR
    let corRelated = 0;
    let nonCor = 0;
    for (const conv of allConversions) {
      const ai = conv.ai_suggested_metadata as { suggested_cor_elements?: number[] } | null;
      if (ai?.suggested_cor_elements && ai.suggested_cor_elements.length > 0) {
        corRelated++;
      } else {
        nonCor++;
      }
    }
    
    return NextResponse.json({
      total_conversions: allConversions.length,
      published_count: published.length,
      draft_count: drafts.length,
      total_fields_converted: totalFields,
      average_fields_per_form: allConversions.length > 0 
        ? Math.round(totalFields / allConversions.length) 
        : 0,
      cor_related_count: corRelated,
      non_cor_count: nonCor,
      recent_conversions: recentConversions,
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get conversion statistics');
  }
}
