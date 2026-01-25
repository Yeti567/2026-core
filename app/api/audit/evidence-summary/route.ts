/**
 * Audit Evidence Summary API Route
 * 
 * GET: Get evidence summaries for all COR elements
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/utils/error-handling';

// COR Element names
const COR_ELEMENT_NAMES: Record<number, string> = {
  1: 'Health & Safety Policy',
  2: 'Hazard Assessment',
  3: 'Safe Work Practices',
  4: 'Safe Job Procedures',
  5: 'Company Safety Rules',
  6: 'Personal Protective Equipment',
  7: 'Preventative Maintenance',
  8: 'Training & Communication',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Preparedness',
  12: 'Statistics & Records',
  13: 'Legislation & Compliance',
  14: 'Management Review',
};

interface ElementSummary {
  element_number: number;
  element_name: string;
  total_forms: number;
  converted_forms: number;
  manual_forms: number;
  total_submissions_90_days: number;
  evidence_status: 'sufficient' | 'partial' | 'insufficient';
}

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
    
    const companyId = profile.company_id;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get all forms for this company
    const { data: forms, error: formsError } = await supabase
      .from('form_templates')
      .select('id, name, cor_element, source, is_active')
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    if (formsError) {
      throw new Error(`Failed to fetch forms: ${formsError.message}`);
    }
    
    // Build summaries for each element
    const summaries: ElementSummary[] = [];
    
    for (let element = 1; element <= 14; element++) {
      // Filter forms for this element
      const elementForms = (forms || []).filter(f => f.cor_element === element);
      const convertedForms = elementForms.filter(f => f.source === 'pdf_conversion');
      const manualForms = elementForms.filter(f => f.source !== 'pdf_conversion');
      
      // Count submissions in last 90 days
      let totalSubmissions = 0;
      
      if (elementForms.length > 0) {
        const formIds = elementForms.map(f => f.id);
        const { count } = await supabase
          .from('form_submissions')
          .select('*', { count: 'exact', head: true })
          .in('form_template_id', formIds)
          .gte('submitted_at', ninetyDaysAgo);
        
        totalSubmissions = count || 0;
      }
      
      // Determine evidence status
      let evidenceStatus: 'sufficient' | 'partial' | 'insufficient' = 'insufficient';
      
      if (elementForms.length >= 2 && totalSubmissions >= 10) {
        evidenceStatus = 'sufficient';
      } else if (elementForms.length >= 1 && totalSubmissions >= 5) {
        evidenceStatus = 'partial';
      }
      
      summaries.push({
        element_number: element,
        // Safe: element is from a controlled loop (1-14), bounded by the loop condition
        // eslint-disable-next-line security/detect-object-injection
        element_name: COR_ELEMENT_NAMES[element] || `Element ${element}`,
        total_forms: elementForms.length,
        converted_forms: convertedForms.length,
        manual_forms: manualForms.length,
        total_submissions_90_days: totalSubmissions,
        evidence_status: evidenceStatus,
      });
    }
    
    return NextResponse.json({ summaries });
    
  } catch (error) {
    return handleApiError(error, 'Failed to get evidence summary', 500, 'Get evidence summary');
  }
}
