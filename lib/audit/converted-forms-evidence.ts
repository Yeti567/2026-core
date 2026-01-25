/**
 * Converted Forms Evidence Finder
 * 
 * Integrates converted PDF forms with the audit engine
 * to find evidence for COR elements.
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';

// =============================================================================
// TYPES
// =============================================================================

export interface FormEvidence {
  form_template_id: string;
  form_name: string;
  form_code: string;
  description: string | null;
  category: string | null;
  source: 'pdf_conversion' | 'manual' | 'system';
  source_pdf_path: string | null;
  submissions_count: number;
  submissions_last_90_days: number;
  last_submission_at: string | null;
  cor_element: number;
  is_converted_form: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ElementEvidenceSummary {
  element_number: number;
  element_name: string;
  total_forms: number;
  converted_forms: number;
  manual_forms: number;
  total_submissions_90_days: number;
  evidence_status: 'sufficient' | 'partial' | 'insufficient';
  forms: FormEvidence[];
}

export interface ConversionStats {
  total_conversions: number;
  published_count: number;
  draft_count: number;
  total_fields_converted: number;
  average_fields_per_form: number;
  cor_related_count: number;
  non_cor_count: number;
  recent_conversions: RecentConversion[];
}

export interface RecentConversion {
  id: string;
  form_name: string;
  original_pdf_name: string;
  status: 'draft' | 'mapping_fields' | 'ready_to_publish' | 'published' | 'archived';
  fields_count: number;
  created_at: string;
  published_at: string | null;
  template_id: string | null;
}

// =============================================================================
// COR ELEMENT NAMES
// =============================================================================

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

// =============================================================================
// FIND EVIDENCE FUNCTIONS
// =============================================================================

/**
 * Find all forms (including converted ones) that provide evidence for a COR element
 */
export async function findConvertedFormsEvidence(
  companyId: string,
  elementNumber: number
): Promise<FormEvidence[]> {
  const supabase = createRouteHandlerClient();
  
  // Get all active forms for this company
  const { data: forms, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .or(`cor_element.eq.${elementNumber},source.eq.pdf_conversion`);
  
  if (error || !forms) {
    console.error('Error fetching forms:', error);
    return [];
  }
  
  // Filter to forms that match this element
  const matchingForms = forms.filter(form => form.cor_element === elementNumber);
  
  const evidence: FormEvidence[] = [];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  
  for (const form of matchingForms) {
    // Count all submissions
    const { count: totalCount } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_template_id', form.id);
    
    // Count recent submissions (last 90 days)
    const { count: recentCount, data: recentSubmissions } = await supabase
      .from('form_submissions')
      .select('submitted_at', { count: 'exact' })
      .eq('form_template_id', form.id)
      .gte('submitted_at', ninetyDaysAgo)
      .order('submitted_at', { ascending: false })
      .limit(1);
    
    evidence.push({
      form_template_id: form.id,
      form_name: form.name,
      form_code: form.form_code,
      description: form.description,
      category: form.category,
      source: form.source || 'manual',
      source_pdf_path: form.source_pdf_path,
      submissions_count: totalCount || 0,
      submissions_last_90_days: recentCount || 0,
      last_submission_at: recentSubmissions?.[0]?.submitted_at || null,
      cor_element: elementNumber,
      is_converted_form: form.source === 'pdf_conversion',
      is_active: form.is_active,
      created_at: form.created_at,
    });
  }
  
  // Sort by submission count (most active first)
  return evidence.sort((a, b) => b.submissions_last_90_days - a.submissions_last_90_days);
}

/**
 * Get evidence summary for a specific COR element
 */
export async function getElementEvidenceSummary(
  companyId: string,
  elementNumber: number
): Promise<ElementEvidenceSummary> {
  const forms = await findConvertedFormsEvidence(companyId, elementNumber);
  
  const convertedForms = forms.filter(f => f.is_converted_form);
  const manualForms = forms.filter(f => !f.is_converted_form);
  const totalSubmissions = forms.reduce((sum, f) => sum + f.submissions_last_90_days, 0);
  
  // Determine evidence status
  let evidenceStatus: 'sufficient' | 'partial' | 'insufficient' = 'insufficient';
  
  if (forms.length >= 2 && totalSubmissions >= 10) {
    evidenceStatus = 'sufficient';
  } else if (forms.length >= 1 && totalSubmissions >= 5) {
    evidenceStatus = 'partial';
  }
  
  return {
    element_number: elementNumber,
    // Safe: elementNumber is a COR element number (1-14) passed as a function parameter
    // eslint-disable-next-line security/detect-object-injection
    element_name: COR_ELEMENT_NAMES[elementNumber] || `Element ${elementNumber}`,
    total_forms: forms.length,
    converted_forms: convertedForms.length,
    manual_forms: manualForms.length,
    total_submissions_90_days: totalSubmissions,
    evidence_status: evidenceStatus,
    forms,
  };
}

/**
 * Get evidence summaries for all COR elements
 */
export async function getAllElementsEvidenceSummary(
  companyId: string
): Promise<ElementEvidenceSummary[]> {
  const summaries: ElementEvidenceSummary[] = [];
  
  for (let element = 1; element <= 14; element++) {
    const summary = await getElementEvidenceSummary(companyId, element);
    summaries.push(summary);
  }
  
  return summaries;
}

// =============================================================================
// CONVERSION STATISTICS
// =============================================================================

/**
 * Get conversion statistics for a company
 */
export async function getConversionStats(companyId: string): Promise<ConversionStats> {
  const supabase = createRouteHandlerClient();
  
  // Get all conversions
  const { data: conversions, error } = await supabase
    .from('pdf_form_conversions')
    .select('*, form_field_mappings(count)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  
  if (error || !conversions) {
    return {
      total_conversions: 0,
      published_count: 0,
      draft_count: 0,
      total_fields_converted: 0,
      average_fields_per_form: 0,
      cor_related_count: 0,
      non_cor_count: 0,
      recent_conversions: [],
    };
  }
  
  const published = conversions.filter(c => c.conversion_status === 'published');
  const drafts = conversions.filter(c => c.conversion_status !== 'published' && c.conversion_status !== 'archived');
  
  // Calculate fields from field_mappings count
  let totalFields = 0;
  for (const conv of conversions) {
    const { count } = await supabase
      .from('form_field_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('conversion_id', conv.id);
    totalFields += count || 0;
  }
  
  // Count COR-related vs non-COR
  let corRelated = 0;
  let nonCor = 0;
  for (const conv of conversions) {
    const ai = conv.ai_suggested_metadata as { suggested_cor_elements?: number[] } | null;
    if (ai?.suggested_cor_elements && ai.suggested_cor_elements.length > 0) {
      corRelated++;
    } else {
      nonCor++;
    }
  }
  
  // Get recent conversions with field counts
  const recentConversions: RecentConversion[] = [];
  for (const conv of conversions.slice(0, 10)) {
    const { count } = await supabase
      .from('form_field_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('conversion_id', conv.id);
    
    const ai = conv.ai_suggested_metadata as { suggested_form_name?: string } | null;
    
    recentConversions.push({
      id: conv.id,
      form_name: ai?.suggested_form_name || conv.original_pdf_name,
      original_pdf_name: conv.original_pdf_name,
      status: conv.conversion_status,
      fields_count: count || 0,
      created_at: conv.created_at,
      published_at: conv.published_at,
      template_id: conv.mapped_form_template_id,
    });
  }
  
  return {
    total_conversions: conversions.length,
    published_count: published.length,
    draft_count: drafts.length,
    total_fields_converted: totalFields,
    average_fields_per_form: conversions.length > 0 
      ? Math.round(totalFields / conversions.length) 
      : 0,
    cor_related_count: corRelated,
    non_cor_count: nonCor,
    recent_conversions: recentConversions,
  };
}

// =============================================================================
// NON-COR FORM HANDLING
// =============================================================================

/**
 * Get all non-COR custom tracking forms
 */
export async function getNonCorForms(companyId: string): Promise<FormEvidence[]> {
  const supabase = createRouteHandlerClient();
  
  const { data: forms, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .is('cor_element', null);
  
  if (error || !forms) {
    return [];
  }
  
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const evidence: FormEvidence[] = [];
  
  for (const form of forms) {
    const { count: recentCount } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_template_id', form.id)
      .gte('submitted_at', ninetyDaysAgo);
    
    evidence.push({
      form_template_id: form.id,
      form_name: form.name,
      form_code: form.form_code,
      description: form.description,
      category: form.category || 'custom_tracking',
      source: form.source || 'manual',
      source_pdf_path: form.source_pdf_path,
      submissions_count: 0, // Not fetching total for performance
      submissions_last_90_days: recentCount || 0,
      last_submission_at: null,
      cor_element: 0,
      is_converted_form: form.source === 'pdf_conversion',
      is_active: form.is_active,
      created_at: form.created_at,
    });
  }
  
  return evidence;
}

// =============================================================================
// EVIDENCE MAPPING MANAGEMENT
// =============================================================================

/**
 * Update evidence mappings for a form template
 */
export async function updateEvidenceMappings(
  templateId: string,
  companyId: string,
  corElements: number[]
): Promise<boolean> {
  const supabase = createRouteHandlerClient();
  
  try {
    // Delete existing mappings
    await supabase
      .from('form_evidence_mappings')
      .delete()
      .eq('form_template_id', templateId);
    
    // Create new mappings
    if (corElements.length > 0) {
      const mappings = corElements.map(elementNum => ({
        form_template_id: templateId,
        company_id: companyId,
        cor_element: elementNum,
        evidence_type: 'form_submission',
        auto_link: true,
        created_at: new Date().toISOString(),
      }));
      
      await supabase
        .from('form_evidence_mappings')
        .insert(mappings);
    }
    
    // Update template's primary COR element
    await supabase
      .from('form_templates')
      .update({ cor_element: corElements[0] || null })
      .eq('id', templateId);
    
    return true;
  } catch (error) {
    console.error('Failed to update evidence mappings:', error);
    return false;
  }
}

