/**
 * Document Evidence Finder for COR Audit
 * 
 * Integrates the Document Control System with the Audit Engine:
 * - Auto-find required documents for each COR element
 * - Validate documents are current and active
 * - Flag missing or outdated documents
 * - Link documents to audit questions
 * - Include document registry in audit packages
 */

import { createClient } from '@/lib/supabase/server';
import { COR_ELEMENTS, type CORElement } from './types';
import { findControlNumbers, extractSnippet } from '@/lib/documents/pdf-extractor';
import type { 
  Document, 
  DocumentTypeCode,
  DocumentStatus 
} from '@/lib/documents/types';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentRequirement {
  type: DocumentTypeCode;
  title_contains?: string;
  keywords?: string[];
  min_count: number;
  per?: 'year' | 'quarter' | 'month' | 'total';
  required: boolean;
  description: string;
}

export interface ElementDocumentRequirements {
  element: number;
  required: DocumentRequirement[];
  recommended: DocumentRequirement[];
}

export interface DocumentEvidence {
  control_number: string;
  title: string;
  type: DocumentTypeCode;
  version: string;
  status: DocumentStatus;
  effective_date?: string;
  next_review_date?: string;
  url: string;
  matched_by: 'type' | 'keyword' | 'content' | 'link';
  confidence: number;
}

export interface DocumentGap {
  requirement_id: string;
  element_number: number;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  action_required: string;
  estimated_effort_hours: number;
  document_type: DocumentTypeCode;
  found_count: number;
  required_count: number;
}

export interface ElementDocumentScore {
  element_number: number;
  element_name: string;
  found_documents: DocumentEvidence[];
  missing_documents: DocumentGap[];
  document_compliance_rate: number;
  has_critical_gaps: boolean;
  recommendations: string[];
}

export interface DocumentSearchResult {
  document: Document;
  matched_terms: string[];
  snippets: string[];
  confidence: number;
}

// ============================================================================
// DOCUMENT REQUIREMENTS PER COR ELEMENT
// ============================================================================

export const ELEMENT_DOCUMENT_REQUIREMENTS: Record<number, ElementDocumentRequirements> = {
  1: {
    element: 1,
    required: [
      { type: 'POL', title_contains: 'Health & Safety', min_count: 1, per: 'total', required: true, description: 'Health & Safety Policy' },
      { type: 'POL', title_contains: 'Roles', min_count: 1, per: 'total', required: true, description: 'Roles & Responsibilities Policy' },
      { type: 'MIN', title_contains: 'Management Review', min_count: 4, per: 'year', required: true, description: 'Quarterly management review minutes' },
      { type: 'POL', title_contains: 'Document Control', min_count: 1, per: 'total', required: true, description: 'Document Control Policy' },
    ],
    recommended: [
      { type: 'PRC', title_contains: 'Document Control', min_count: 1, per: 'total', required: false, description: 'Document Control Procedure' },
      { type: 'MAN', title_contains: 'Safety', min_count: 1, per: 'total', required: false, description: 'Safety Management Manual' },
    ],
  },
  2: {
    element: 2,
    required: [
      { type: 'SWP', title_contains: 'Hazard', min_count: 1, per: 'total', required: true, description: 'Hazard Assessment Procedure' },
      { type: 'FRM', title_contains: 'Hazard', min_count: 1, per: 'total', required: true, description: 'Hazard Assessment Form' },
      { type: 'POL', title_contains: 'Hazard', min_count: 1, per: 'total', required: true, description: 'Hazard Reporting Policy' },
      { type: 'REG', title_contains: 'Hazard', min_count: 1, per: 'total', required: true, description: 'Hazard Register' },
    ],
    recommended: [
      { type: 'FRM', title_contains: 'JHA', min_count: 1, per: 'total', required: false, description: 'Job Hazard Analysis Form' },
      { type: 'TRN', title_contains: 'Hazard', min_count: 1, per: 'total', required: false, description: 'Hazard Training Material' },
    ],
  },
  3: {
    element: 3,
    required: [
      { type: 'SWP', keywords: ['control', 'safety'], min_count: 5, per: 'total', required: true, description: 'Safe Work Procedures (minimum 5)' },
      { type: 'PRC', title_contains: 'Control', min_count: 1, per: 'total', required: true, description: 'Control Implementation Process' },
      { type: 'POL', title_contains: 'Safe Work', min_count: 1, per: 'total', required: true, description: 'Safe Work Practices Policy' },
    ],
    recommended: [
      { type: 'WI', keywords: ['safety'], min_count: 3, per: 'total', required: false, description: 'Work Instructions' },
    ],
  },
  4: {
    element: 4,
    required: [
      { type: 'SJP', keywords: ['procedure'], min_count: 3, per: 'total', required: true, description: 'Safe Job Procedures (minimum 3)' },
      { type: 'SWP', title_contains: 'Lockout', min_count: 1, per: 'total', required: true, description: 'Lockout/Tagout Procedure' },
      { type: 'FRM', title_contains: 'Job', min_count: 1, per: 'total', required: true, description: 'Job Procedure Form' },
    ],
    recommended: [
      { type: 'CHK', title_contains: 'Pre-Task', min_count: 1, per: 'total', required: false, description: 'Pre-Task Checklist' },
    ],
  },
  5: {
    element: 5,
    required: [
      { type: 'POL', title_contains: 'Rule', min_count: 1, per: 'total', required: true, description: 'Company Rules Policy' },
      { type: 'POL', title_contains: 'Discipline', min_count: 1, per: 'total', required: true, description: 'Disciplinary Policy' },
      { type: 'PRC', title_contains: 'Violation', min_count: 1, per: 'total', required: true, description: 'Violation Handling Process' },
    ],
    recommended: [
      { type: 'FRM', title_contains: 'Discipline', min_count: 1, per: 'total', required: false, description: 'Disciplinary Action Form' },
    ],
  },
  6: {
    element: 6,
    required: [
      { type: 'POL', title_contains: 'PPE', min_count: 1, per: 'total', required: true, description: 'PPE Policy' },
      { type: 'REG', title_contains: 'PPE', min_count: 1, per: 'total', required: true, description: 'PPE Register' },
      { type: 'FRM', title_contains: 'PPE', min_count: 1, per: 'total', required: true, description: 'PPE Issue Form' },
    ],
    recommended: [
      { type: 'CHK', title_contains: 'PPE', min_count: 1, per: 'total', required: false, description: 'PPE Inspection Checklist' },
    ],
  },
  7: {
    element: 7,
    required: [
      { type: 'PRC', title_contains: 'Maintenance', min_count: 1, per: 'total', required: true, description: 'Preventive Maintenance Process' },
      { type: 'REG', title_contains: 'Equipment', min_count: 1, per: 'total', required: true, description: 'Equipment Register' },
      { type: 'CHK', title_contains: 'Equipment', min_count: 1, per: 'total', required: true, description: 'Equipment Inspection Checklist' },
      { type: 'FRM', title_contains: 'Maintenance', min_count: 1, per: 'total', required: true, description: 'Maintenance Request Form' },
    ],
    recommended: [
      { type: 'SWP', title_contains: 'Equipment', min_count: 1, per: 'total', required: false, description: 'Equipment Operating Procedures' },
    ],
  },
  8: {
    element: 8,
    required: [
      { type: 'TRN', title_contains: 'Orientation', min_count: 1, per: 'total', required: true, description: 'Worker Orientation Material' },
      { type: 'TRN', title_contains: 'Toolbox', min_count: 1, per: 'total', required: true, description: 'Toolbox Talk Material' },
      { type: 'REG', title_contains: 'Training', min_count: 1, per: 'total', required: true, description: 'Training Records Register' },
      { type: 'FRM', title_contains: 'Training', min_count: 1, per: 'total', required: true, description: 'Training Sign-off Form' },
    ],
    recommended: [
      { type: 'MAN', title_contains: 'Training', min_count: 1, per: 'total', required: false, description: 'Training Manual' },
      { type: 'CRT', keywords: ['training', 'certificate'], min_count: 1, per: 'total', required: false, description: 'Training Certificates' },
    ],
  },
  9: {
    element: 9,
    required: [
      { type: 'CHK', title_contains: 'Inspection', min_count: 1, per: 'total', required: true, description: 'Workplace Inspection Checklist' },
      { type: 'PRC', title_contains: 'Inspection', min_count: 1, per: 'total', required: true, description: 'Inspection Process' },
      { type: 'FRM', title_contains: 'Inspection', min_count: 1, per: 'total', required: true, description: 'Inspection Report Form' },
    ],
    recommended: [
      { type: 'AUD', title_contains: 'Internal', min_count: 1, per: 'year', required: false, description: 'Internal Audit Report' },
    ],
  },
  10: {
    element: 10,
    required: [
      { type: 'PRC', title_contains: 'Incident', min_count: 1, per: 'total', required: true, description: 'Incident Investigation Process' },
      { type: 'FRM', title_contains: 'Incident', min_count: 1, per: 'total', required: true, description: 'Incident Report Form' },
      { type: 'POL', title_contains: 'Incident', min_count: 1, per: 'total', required: true, description: 'Incident Reporting Policy' },
    ],
    recommended: [
      { type: 'FRM', title_contains: 'Near Miss', min_count: 1, per: 'total', required: false, description: 'Near Miss Report Form' },
      { type: 'RPT', title_contains: 'Investigation', min_count: 1, per: 'year', required: false, description: 'Investigation Reports' },
    ],
  },
  11: {
    element: 11,
    required: [
      { type: 'PLN', title_contains: 'Emergency', min_count: 1, per: 'total', required: true, description: 'Emergency Response Plan' },
      { type: 'PRC', title_contains: 'Evacuation', min_count: 1, per: 'total', required: true, description: 'Evacuation Procedure' },
      { type: 'FRM', title_contains: 'Drill', min_count: 1, per: 'total', required: true, description: 'Emergency Drill Form' },
      { type: 'REG', title_contains: 'First Aid', min_count: 1, per: 'total', required: true, description: 'First Aid Register' },
    ],
    recommended: [
      { type: 'TRN', title_contains: 'Emergency', min_count: 1, per: 'total', required: false, description: 'Emergency Training Material' },
    ],
  },
  12: {
    element: 12,
    required: [
      { type: 'RPT', title_contains: 'Statistics', min_count: 4, per: 'year', required: true, description: 'Quarterly Safety Statistics Report' },
      { type: 'REG', keywords: ['record', 'log'], min_count: 1, per: 'total', required: true, description: 'Safety Records Register' },
      { type: 'PRC', title_contains: 'Record', min_count: 1, per: 'total', required: true, description: 'Record Keeping Process' },
    ],
    recommended: [
      { type: 'RPT', title_contains: 'Trend', min_count: 1, per: 'year', required: false, description: 'Trend Analysis Report' },
    ],
  },
  13: {
    element: 13,
    required: [
      { type: 'POL', title_contains: 'Legislation', min_count: 1, per: 'total', required: true, description: 'Legislation Compliance Policy' },
      { type: 'REG', title_contains: 'Legal', min_count: 1, per: 'total', required: true, description: 'Legal Requirements Register' },
      { type: 'PRC', title_contains: 'Compliance', min_count: 1, per: 'total', required: true, description: 'Compliance Review Process' },
    ],
    recommended: [
      { type: 'CRT', keywords: ['license', 'permit'], min_count: 1, per: 'total', required: false, description: 'Licenses and Permits' },
    ],
  },
  14: {
    element: 14,
    required: [
      { type: 'MIN', title_contains: 'Management Review', min_count: 1, per: 'year', required: true, description: 'Annual Management Review Minutes' },
      { type: 'RPT', title_contains: 'Annual', min_count: 1, per: 'year', required: true, description: 'Annual Safety Report' },
      { type: 'PRC', title_contains: 'Continuous Improvement', min_count: 1, per: 'total', required: true, description: 'Continuous Improvement Process' },
    ],
    recommended: [
      { type: 'AUD', title_contains: 'Internal', min_count: 1, per: 'year', required: false, description: 'Internal Audit Report' },
    ],
  },
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Finds documents matching a requirement
 */
export async function findRequiredDocuments(
  companyId: string,
  requirement: DocumentRequirement
): Promise<Document[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('document_type_code', requirement.type)
    .in('status', ['active', 'approved']);
  
  // Search in title
  if (requirement.title_contains) {
    query = query.ilike('title', `%${requirement.title_contains}%`);
  }
  
  const { data: documents, error } = await query;
  
  if (error || !documents) {
    console.error('Failed to find documents:', error);
    return [];
  }
  
  let filteredDocs = documents;
  
  // If requirement specifies time period
  if (requirement.per && requirement.per !== 'total') {
    const cutoffDate = new Date();
    switch (requirement.per) {
      case 'year':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
    }
    
    filteredDocs = documents.filter(doc => {
      const docDate = new Date(doc.effective_date || doc.created_at);
      return docDate >= cutoffDate;
    });
  }
  
  // Additional keyword filtering
  if (requirement.keywords && requirement.keywords.length > 0) {
    filteredDocs = filteredDocs.filter(doc => {
      const searchText = `${doc.title} ${doc.description || ''} ${doc.extracted_text || ''}`.toLowerCase();
      return requirement.keywords!.some(kw => searchText.includes(kw.toLowerCase()));
    });
  }
  
  return filteredDocs;
}

/**
 * Scores a COR element based on document evidence
 */
export async function scoreElementWithDocuments(
  companyId: string,
  elementNumber: number
): Promise<ElementDocumentScore> {
  // Safe: elementNumber is a COR element number (1-14) from the function parameter
  // eslint-disable-next-line security/detect-object-injection
  const requirements = ELEMENT_DOCUMENT_REQUIREMENTS[elementNumber];
  if (!requirements) {
    throw new Error(`No requirements defined for element ${elementNumber}`);
  }
  
  const element = COR_ELEMENTS.find(e => e.number === elementNumber);
  const foundDocuments: DocumentEvidence[] = [];
  const missingDocuments: DocumentGap[] = [];
  let totalRequired = 0;
  let totalFound = 0;
  
  // Check required documents
  for (const req of requirements.required) {
    totalRequired++;
    const found = await findRequiredDocuments(companyId, req);
    
    if (found.length >= req.min_count) {
      totalFound++;
      // Add found documents as evidence
      found.forEach(doc => {
        foundDocuments.push({
          control_number: doc.control_number,
          title: doc.title,
          type: doc.document_type_code as DocumentTypeCode,
          version: doc.version,
          status: doc.status as DocumentStatus,
          effective_date: doc.effective_date,
          next_review_date: doc.next_review_date,
          url: `/admin/documents/${doc.id}`,
          matched_by: req.title_contains ? 'keyword' : 'type',
          confidence: 90,
        });
      });
    } else {
      // Missing required document
      missingDocuments.push({
        requirement_id: `elem${elementNumber}_${req.type}_${req.title_contains || 'any'}`,
        element_number: elementNumber,
        severity: 'critical',
        description: `Missing: ${req.description}`,
        action_required: `Create or upload ${req.type} document: "${req.description}"`,
        estimated_effort_hours: 4,
        document_type: req.type,
        found_count: found.length,
        required_count: req.min_count,
      });
    }
  }
  
  // Check recommended documents (optional, non-critical gaps)
  for (const req of requirements.recommended) {
    const found = await findRequiredDocuments(companyId, req);
    
    if (found.length >= req.min_count) {
      found.forEach(doc => {
        foundDocuments.push({
          control_number: doc.control_number,
          title: doc.title,
          type: doc.document_type_code as DocumentTypeCode,
          version: doc.version,
          status: doc.status as DocumentStatus,
          effective_date: doc.effective_date,
          next_review_date: doc.next_review_date,
          url: `/admin/documents/${doc.id}`,
          matched_by: 'type',
          confidence: 70,
        });
      });
    } else if (found.length === 0) {
      missingDocuments.push({
        requirement_id: `elem${elementNumber}_rec_${req.type}_${req.title_contains || 'any'}`,
        element_number: elementNumber,
        severity: 'minor',
        description: `Recommended: ${req.description}`,
        action_required: `Consider creating ${req.type} document: "${req.description}"`,
        estimated_effort_hours: 2,
        document_type: req.type,
        found_count: found.length,
        required_count: req.min_count,
      });
    }
  }
  
  // Calculate compliance rate
  const complianceRate = totalRequired > 0 
    ? Math.round((totalFound / totalRequired) * 100)
    : 100;
  
  // Generate recommendations
  const recommendations: string[] = [];
  const criticalGaps = missingDocuments.filter(g => g.severity === 'critical');
  
  if (criticalGaps.length > 0) {
    recommendations.push(`Address ${criticalGaps.length} critical document gaps for Element ${elementNumber}`);
  }
  
  // Check for documents needing review
  const overdueReviews = foundDocuments.filter(doc => 
    doc.next_review_date && new Date(doc.next_review_date) < new Date()
  );
  if (overdueReviews.length > 0) {
    recommendations.push(`${overdueReviews.length} documents are overdue for review`);
  }
  
  return {
    element_number: elementNumber,
    element_name: element?.name || `Element ${elementNumber}`,
    found_documents: foundDocuments,
    missing_documents: missingDocuments,
    document_compliance_rate: complianceRate,
    has_critical_gaps: criticalGaps.length > 0,
    recommendations,
  };
}

/**
 * Scores all 14 COR elements for document compliance
 */
export async function scoreAllElementsWithDocuments(
  companyId: string
): Promise<{
  elements: ElementDocumentScore[];
  overall_compliance: number;
  total_documents: number;
  critical_gaps: DocumentGap[];
}> {
  const elements: ElementDocumentScore[] = [];
  const allCriticalGaps: DocumentGap[] = [];
  const seenDocuments = new Set<string>();
  
  for (let i = 1; i <= 14; i++) {
    const score = await scoreElementWithDocuments(companyId, i);
    elements.push(score);
    
    // Collect unique documents
    score.found_documents.forEach(doc => seenDocuments.add(doc.control_number));
    
    // Collect critical gaps
    score.missing_documents
      .filter(g => g.severity === 'critical')
      .forEach(g => allCriticalGaps.push(g));
  }
  
  const overallCompliance = elements.reduce((sum, e) => sum + e.document_compliance_rate, 0) / 14;
  
  return {
    elements,
    overall_compliance: Math.round(overallCompliance),
    total_documents: seenDocuments.size,
    critical_gaps: allCriticalGaps,
  };
}

// ============================================================================
// EVIDENCE SEARCH
// ============================================================================

/**
 * Searches document contents for specific evidence terms
 */
export async function findEvidenceInDocuments(
  companyId: string,
  searchTerms: string[]
): Promise<DocumentSearchResult[]> {
  const supabase = await createClient();
  
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['active', 'approved'])
    .not('extracted_text', 'is', null);
  
  if (error || !documents) {
    console.error('Failed to search documents:', error);
    return [];
  }
  
  const results: DocumentSearchResult[] = [];
  
  for (const doc of documents) {
    const matches: string[] = [];
    const snippets: string[] = [];
    const extractedText = doc.extracted_text || '';
    const textLower = extractedText.toLowerCase();
    
    // Check each search term
    for (const term of searchTerms) {
      if (textLower.includes(term.toLowerCase())) {
        matches.push(term);
        snippets.push(extractSnippet(extractedText, term, 150));
      }
    }
    
    if (matches.length > 0) {
      results.push({
        document: doc,
        matched_terms: matches,
        snippets,
        confidence: Math.min(100, matches.length * 25),
      });
    }
  }
  
  // Sort by match count
  return results.sort((a, b) => b.matched_terms.length - a.matched_terms.length);
}

/**
 * Links an incident to referenced SWPs
 */
export async function linkIncidentToSWPs(
  incidentDescription: string,
  companyId: string
): Promise<Document[]> {
  const supabase = await createClient();
  
  // Get company initials
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();
  
  const initials = company?.name
    ? company.name.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4)
    : null;
  
  // Find control numbers in incident description
  const controlNumbers = findControlNumbers(incidentDescription, initials || undefined);
  
  // Filter for SWPs
  const swpNumbers = controlNumbers.filter(num => num.includes('-SWP-'));
  
  if (swpNumbers.length === 0) {
    return [];
  }
  
  // Verify these documents exist and are active
  const { data: swps } = await supabase
    .from('documents')
    .select('*')
    .in('control_number', swpNumbers)
    .eq('company_id', companyId)
    .in('status', ['active', 'approved']);
  
  return swps || [];
}

// ============================================================================
// DOCUMENT REGISTRY FOR AUDIT PACKAGE
// ============================================================================

/**
 * Gets all active documents organized by type for audit package
 */
export async function getDocumentRegistryForAudit(
  companyId: string
): Promise<{
  by_type: Record<DocumentTypeCode, Document[]>;
  by_element: Record<number, Document[]>;
  total_count: number;
  type_counts: Record<DocumentTypeCode, number>;
}> {
  const supabase = await createClient();
  
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['active', 'approved'])
    .order('control_number');
  
  if (error || !documents) {
    return {
      by_type: {} as Record<DocumentTypeCode, Document[]>,
      by_element: {},
      total_count: 0,
      type_counts: {} as Record<DocumentTypeCode, number>,
    };
  }
  
  // Group by type
  const by_type: Record<string, Document[]> = {};
  const type_counts: Record<string, number> = {};
  
  documents.forEach(doc => {
    const type = doc.document_type_code;
    // Safe: type is from doc.document_type_code which is a database column with controlled document type values
    // eslint-disable-next-line security/detect-object-injection
    if (!by_type[type]) {
      // eslint-disable-next-line security/detect-object-injection
      by_type[type] = [];
      // eslint-disable-next-line security/detect-object-injection
      type_counts[type] = 0;
    }
    // eslint-disable-next-line security/detect-object-injection
    by_type[type].push(doc);
    // eslint-disable-next-line security/detect-object-injection
    type_counts[type]++;
  });
  
  // Group by COR element
  const by_element: Record<number, Document[]> = {};
  
  documents.forEach(doc => {
    (doc.cor_elements || []).forEach((element: number) => {
      // Safe: element is from doc.cor_elements array which contains COR element numbers (1-14)
      // eslint-disable-next-line security/detect-object-injection
      if (!by_element[element]) {
        // eslint-disable-next-line security/detect-object-injection
        by_element[element] = [];
      }
      // eslint-disable-next-line security/detect-object-injection
      by_element[element].push(doc);
    });
  });
  
  return {
    by_type: by_type as Record<DocumentTypeCode, Document[]>,
    by_element,
    total_count: documents.length,
    type_counts: type_counts as Record<DocumentTypeCode, number>,
  };
}

/**
 * Generates a document compliance summary for dashboard widget
 */
export async function getDocumentComplianceSummary(
  companyId: string
): Promise<{
  total_required: number;
  total_found: number;
  compliance_rate: number;
  by_element: { element: number; name: string; found: number; required: number; rate: number }[];
  critical_gaps: number;
  documents_needing_review: number;
}> {
  const supabase = await createClient();
  
  let totalRequired = 0;
  let totalFound = 0;
  const byElement: { element: number; name: string; found: number; required: number; rate: number }[] = [];
  let criticalGaps = 0;
  
  for (let i = 1; i <= 14; i++) {
    // Safe: i is a loop counter iterating through COR element numbers (1-14)
    // eslint-disable-next-line security/detect-object-injection
    const requirements = ELEMENT_DOCUMENT_REQUIREMENTS[i];
    if (!requirements) continue;
    
    const element = COR_ELEMENTS.find(e => e.number === i);
    let elementRequired = requirements.required.length;
    let elementFound = 0;
    
    for (const req of requirements.required) {
      const found = await findRequiredDocuments(companyId, req);
      if (found.length >= req.min_count) {
        elementFound++;
        totalFound++;
      } else {
        criticalGaps++;
      }
      totalRequired++;
    }
    
    byElement.push({
      element: i,
      name: element?.name || `Element ${i}`,
      found: elementFound,
      required: elementRequired,
      rate: elementRequired > 0 ? Math.round((elementFound / elementRequired) * 100) : 100,
    });
  }
  
  // Count documents needing review
  const { count: reviewCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('status', ['active', 'approved'])
    .lt('next_review_date', new Date().toISOString());
  
  return {
    total_required: totalRequired,
    total_found: totalFound,
    compliance_rate: totalRequired > 0 ? Math.round((totalFound / totalRequired) * 100) : 100,
    by_element: byElement,
    critical_gaps: criticalGaps,
    documents_needing_review: reviewCount || 0,
  };
}
