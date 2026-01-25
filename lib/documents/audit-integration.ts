/**
 * Document-Audit Integration
 * 
 * Links documents to audit questions and validates evidence:
 * - Auto-detect relevant documents for audit questions
 * - Validate documents are current (not obsolete)
 * - Flag missing or outdated documents
 * - Generate evidence reports
 */

import { createClient } from '@/lib/supabase/server';
import type {
  Document,
  DocumentTypeCode,
  DocumentStatus,
} from './types';
import { COR_ELEMENTS } from '@/lib/audit/types';
import { findControlNumbers } from './pdf-extractor';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditDocumentRequirement {
  elementNumber: number;
  elementName: string;
  questionId: string;
  questionText: string;
  requiredDocTypes: DocumentTypeCode[];
  requiredKeywords: string[];
}

export interface DocumentValidationResult {
  document: Document;
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'obsolete' | 'expired_review' | 'wrong_status' | 'missing_approval';
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface AuditEvidenceReport {
  elementNumber: number;
  elementName: string;
  requiredDocuments: DocumentTypeCode[];
  foundDocuments: Document[];
  missingTypes: DocumentTypeCode[];
  invalidDocuments: DocumentValidationResult[];
  coveragePercentage: number;
  status: 'complete' | 'partial' | 'missing';
}

export interface DocumentAuditLink {
  id: string;
  document_id: string;
  company_id: string;
  audit_element_number: number;
  audit_question_id?: string;
  link_type: 'manual' | 'auto' | 'ai_suggested';
  confidence_score?: number;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentEvidenceMatch {
  document: Document;
  audit_element_number: number;
  audit_question_id: string;
  confidence_score: number;
  match_reason: string;
}

// ============================================================================
// DOCUMENT TYPE TO AUDIT ELEMENT MAPPING
// ============================================================================

const DOCUMENT_TYPE_AUDIT_MAPPING: Record<DocumentTypeCode, number[]> = {
  POL: [1, 5, 13],           // Policies -> Element 1, 5, 13
  SWP: [3, 4],               // Safe Work Procedures -> Element 3, 4
  FRM: [2, 9, 10, 12],       // Forms -> Hazard, Inspection, Incident, Records
  SJP: [4],                  // Safe Job Procedures -> Element 4
  MAN: [1, 8],               // Manuals -> Policy, Training
  PLN: [11],                 // Plans -> Emergency
  RPT: [10, 12, 14],         // Reports -> Incident, Stats, Review
  CHK: [6, 7, 9],            // Checklists -> PPE, Maintenance, Inspection
  REG: [6, 7, 12],           // Registers -> PPE, Equipment, Records
  TRN: [8],                  // Training -> Element 8
  MIN: [14],                 // Minutes -> Management Review
  AUD: [9, 14],              // Audit Docs -> Inspection, Review
  CRT: [8, 13],              // Certificates -> Training, Legislation
  DWG: [4, 7],               // Drawings -> Job Procedures, Equipment
  PRC: [1, 3],               // Processes -> Policy, Safe Work Practices
  WI: [3, 4],                // Work Instructions -> Safe Work, Job Procedures
};

// Keywords that help identify document relevance
const AUDIT_ELEMENT_KEYWORDS: Record<number, string[]> = {
  1: ['policy', 'health', 'safety', 'management', 'commitment', 'objective'],
  2: ['hazard', 'risk', 'assessment', 'identification', 'jha', 'job hazard'],
  3: ['safe work', 'practice', 'procedure', 'swp', 'standard'],
  4: ['job procedure', 'sjp', 'task', 'step', 'lockout', 'tagout'],
  5: ['rule', 'discipline', 'violation', 'enforcement', 'conduct'],
  6: ['ppe', 'protective', 'equipment', 'helmet', 'gloves', 'safety glasses'],
  7: ['maintenance', 'equipment', 'inspection', 'preventive', 'repair'],
  8: ['training', 'orientation', 'competency', 'toolbox', 'education'],
  9: ['inspection', 'workplace', 'audit', 'walkthrough', 'checklist'],
  10: ['incident', 'accident', 'investigation', 'near miss', 'injury'],
  11: ['emergency', 'evacuation', 'drill', 'fire', 'first aid', 'response'],
  12: ['statistics', 'record', 'log', 'data', 'tracking', 'metrics'],
  13: ['legislation', 'regulation', 'compliance', 'legal', 'osha', 'wsib'],
  14: ['review', 'management', 'annual', 'meeting', 'continuous improvement'],
};

// ============================================================================
// DOCUMENT-AUDIT LINKING
// ============================================================================

/**
 * Creates a link between a document and an audit question
 */
export async function linkDocumentToAudit(
  documentId: string,
  auditElementNumber: number,
  auditQuestionId?: string,
  linkType: 'manual' | 'auto' | 'ai_suggested' = 'manual',
  confidenceScore?: number,
  userId?: string
): Promise<DocumentAuditLink> {
  const supabase = await createClient();
  
  // Get document to verify company_id
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('company_id, cor_elements')
    .eq('id', documentId)
    .single();
  
  if (docError || !document) {
    throw new Error('Document not found');
  }
  
  // Update document's cor_elements if not already linked
  const currentElements = document.cor_elements || [];
  if (!currentElements.includes(auditElementNumber)) {
    await supabase
      .from('documents')
      .update({ 
        cor_elements: [...currentElements, auditElementNumber]
      })
      .eq('id', documentId);
  }
  
  // Return a constructed link object (we're using cor_elements array on documents)
  return {
    id: `${documentId}-${auditElementNumber}`,
    document_id: documentId,
    company_id: document.company_id,
    audit_element_number: auditElementNumber,
    audit_question_id: auditQuestionId,
    link_type: linkType,
    confidence_score: confidenceScore,
    created_by_user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Removes a document-audit link
 */
export async function unlinkDocumentFromAudit(
  documentId: string,
  auditElementNumber: number
): Promise<void> {
  const supabase = await createClient();
  
  // Get current cor_elements
  const { data: document, error } = await supabase
    .from('documents')
    .select('cor_elements')
    .eq('id', documentId)
    .single();
  
  if (error || !document) {
    throw new Error('Document not found');
  }
  
  // Remove the element from the array
  const updatedElements = (document.cor_elements || [])
    .filter((e: number) => e !== auditElementNumber);
  
  const { error: updateError } = await supabase
    .from('documents')
    .update({ cor_elements: updatedElements })
    .eq('id', documentId);
  
  if (updateError) {
    throw new Error(`Failed to remove link: ${updateError.message}`);
  }
}

/**
 * Gets all audit links for a document
 */
export async function getDocumentAuditLinks(
  documentId: string
): Promise<DocumentAuditLink[]> {
  const supabase = await createClient();
  
  const { data: document, error } = await supabase
    .from('documents')
    .select('id, company_id, cor_elements, created_at, updated_at')
    .eq('id', documentId)
    .single();
  
  if (error || !document) {
    return [];
  }
  
  return (document.cor_elements || []).map((element: number) => ({
    id: `${document.id}-${element}`,
    document_id: document.id,
    company_id: document.company_id,
    audit_element_number: element,
    link_type: 'manual' as const,
    created_at: document.created_at,
    updated_at: document.updated_at,
  }));
}

/**
 * Gets all documents linked to an audit element
 */
export async function getDocumentsForAuditElement(
  companyId: string,
  elementNumber: number
): Promise<Document[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .contains('cor_elements', [elementNumber])
    .in('status', ['active', 'approved']);
  
  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
  
  return data || [];
}

// ============================================================================
// AUTO-DETECTION
// ============================================================================

/**
 * Auto-detects which audit elements a document is relevant for
 */
export function detectRelevantAuditElements(
  document: Document,
  extractedText?: string
): { elementNumber: number; confidence: number; reason: string }[] {
  const matches: { elementNumber: number; confidence: number; reason: string }[] = [];
  
  // 1. Check document type mapping
  const mappedElements = DOCUMENT_TYPE_AUDIT_MAPPING[document.document_type_code] || [];
  mappedElements.forEach(element => {
    matches.push({
      elementNumber: element,
      confidence: 60,
      reason: `Document type ${document.document_type_code} maps to Element ${element}`,
    });
  });
  
  // 2. Check title keywords
  const titleLower = document.title.toLowerCase();
  Object.entries(AUDIT_ELEMENT_KEYWORDS).forEach(([element, keywords]) => {
    const matchedKeywords = keywords.filter(kw => titleLower.includes(kw.toLowerCase()));
    if (matchedKeywords.length > 0) {
      const elementNum = parseInt(element, 10);
      const existing = matches.find(m => m.elementNumber === elementNum);
      if (existing) {
        existing.confidence = Math.min(100, existing.confidence + matchedKeywords.length * 10);
        existing.reason += `; Title contains: ${matchedKeywords.join(', ')}`;
      } else {
        matches.push({
          elementNumber: elementNum,
          confidence: 40 + matchedKeywords.length * 10,
          reason: `Title contains keywords: ${matchedKeywords.join(', ')}`,
        });
      }
    }
  });
  
  // 3. Check extracted text if available
  if (extractedText) {
    const textLower = extractedText.toLowerCase();
    Object.entries(AUDIT_ELEMENT_KEYWORDS).forEach(([element, keywords]) => {
      const matchedKeywords = keywords.filter(kw => textLower.includes(kw.toLowerCase()));
      if (matchedKeywords.length >= 2) { // Require at least 2 keyword matches in content
        const elementNum = parseInt(element, 10);
        const existing = matches.find(m => m.elementNumber === elementNum);
        if (existing) {
          existing.confidence = Math.min(100, existing.confidence + 15);
          existing.reason += `; Content contains relevant keywords`;
        } else {
          matches.push({
            elementNumber: elementNum,
            confidence: 50,
            reason: `Content contains keywords: ${matchedKeywords.slice(0, 3).join(', ')}`,
          });
        }
      }
    });
  }
  
  // 4. Check control number references in text
  if (extractedText) {
    const controlNumbers = findControlNumbers(extractedText);
    if (controlNumbers.length > 0) {
      // This document references other documents - might be a review or summary
      matches.push({
        elementNumber: 14,
        confidence: 40,
        reason: `References ${controlNumbers.length} other documents`,
      });
    }
  }
  
  // Sort by confidence and remove duplicates
  const seen = new Set<number>();
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .filter(m => {
      if (seen.has(m.elementNumber)) return false;
      seen.add(m.elementNumber);
      return true;
    });
}

/**
 * Auto-links a document to detected audit elements
 */
export async function autoLinkDocument(
  documentId: string,
  extractedText?: string,
  minConfidence: number = 50
): Promise<DocumentAuditLink[]> {
  const supabase = await createClient();
  
  // Get document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (docError || !document) {
    throw new Error('Document not found');
  }
  
  // Detect relevant elements
  const detectedElements = detectRelevantAuditElements(document, extractedText);
  const relevantElements = detectedElements.filter(e => e.confidence >= minConfidence);
  
  // Update document's cor_elements
  const elementNumbers = relevantElements.map(e => e.elementNumber);
  const currentElements = document.cor_elements || [];
  const newElements = [...new Set([...currentElements, ...elementNumbers])];
  
  await supabase
    .from('documents')
    .update({ cor_elements: newElements })
    .eq('id', documentId);
  
  // Return link objects
  return relevantElements.map(element => ({
    id: `${documentId}-${element.elementNumber}`,
    document_id: documentId,
    company_id: document.company_id,
    audit_element_number: element.elementNumber,
    audit_question_id: `${element.elementNumber}.auto`,
    link_type: 'auto' as const,
    confidence_score: element.confidence,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a document for audit purposes
 */
export function validateDocumentForAudit(
  document: Document
): DocumentValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Check status
  if (document.status === 'obsolete') {
    issues.push({
      type: 'obsolete',
      message: 'Document is obsolete and should not be used as evidence',
      severity: 'critical',
    });
  } else if (document.status === 'archived') {
    issues.push({
      type: 'obsolete',
      message: 'Document has been archived',
      severity: 'critical',
    });
  } else if (!['active', 'approved'].includes(document.status)) {
    issues.push({
      type: 'wrong_status',
      message: `Document status is "${document.status}" - only active documents should be used as evidence`,
      severity: 'warning',
    });
  }
  
  // Check review date
  if (document.next_review_date) {
    const reviewDate = new Date(document.next_review_date);
    const now = new Date();
    
    if (reviewDate < now) {
      const daysOverdue = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      issues.push({
        type: 'expired_review',
        message: `Document review is overdue by ${daysOverdue} days`,
        severity: daysOverdue > 90 ? 'critical' : 'warning',
      });
    }
  }
  
  return {
    document,
    isValid: !issues.some(i => i.severity === 'critical'),
    issues,
  };
}

/**
 * Validates all documents for an audit element
 */
export async function validateElementDocuments(
  companyId: string,
  elementNumber: number
): Promise<DocumentValidationResult[]> {
  const documents = await getDocumentsForAuditElement(companyId, elementNumber);
  return documents.map(validateDocumentForAudit);
}

// ============================================================================
// EVIDENCE REPORTS
// ============================================================================

/**
 * Generates an evidence report for an audit element
 */
export async function generateElementEvidenceReport(
  companyId: string,
  elementNumber: number
): Promise<AuditEvidenceReport> {
  const supabase = await createClient();
  
  // Get element info
  const element = COR_ELEMENTS.find(e => e.number === elementNumber);
  if (!element) {
    throw new Error(`Invalid element number: ${elementNumber}`);
  }
  
  // Get required document types for this element
  const requiredTypes = Object.entries(DOCUMENT_TYPE_AUDIT_MAPPING)
    .filter(([, elements]) => elements.includes(elementNumber))
    .map(([type]) => type as DocumentTypeCode);
  
  // Get linked documents (via cor_elements array)
  const linkedDocs = await getDocumentsForAuditElement(companyId, elementNumber);
  
  // Also get documents by type that might be relevant
  const { data: typedDocs } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .in('document_type_code', requiredTypes)
    .eq('status', 'active');
  
  // Merge and dedupe
  const allDocs = new Map<string, Document>();
  linkedDocs.forEach(doc => allDocs.set(doc.id, doc));
  (typedDocs || []).forEach(doc => allDocs.set(doc.id, doc));
  
  const foundDocuments = Array.from(allDocs.values());
  
  // Check which types are missing
  const foundTypes = new Set(foundDocuments.map(d => d.document_type_code));
  const missingTypes = requiredTypes.filter(t => !foundTypes.has(t));
  
  // Validate documents
  const invalidDocuments = foundDocuments
    .map(validateDocumentForAudit)
    .filter(v => !v.isValid || v.issues.length > 0);
  
  // Calculate coverage
  const validDocs = foundDocuments.filter(d => {
    const validation = validateDocumentForAudit(d);
    return validation.isValid;
  });
  
  const coveragePercentage = requiredTypes.length > 0
    ? (requiredTypes.filter(t => foundTypes.has(t)).length / requiredTypes.length) * 100
    : 100;
  
  let status: 'complete' | 'partial' | 'missing' = 'complete';
  if (validDocs.length === 0) {
    status = 'missing';
  } else if (coveragePercentage < 100 || invalidDocuments.length > 0) {
    status = 'partial';
  }
  
  return {
    elementNumber,
    elementName: element.name,
    requiredDocuments: requiredTypes,
    foundDocuments,
    missingTypes,
    invalidDocuments,
    coveragePercentage,
    status,
  };
}

/**
 * Generates evidence reports for all 14 COR elements
 */
export async function generateFullEvidenceReport(
  companyId: string
): Promise<{
  elements: AuditEvidenceReport[];
  overallCoverage: number;
  criticalIssues: string[];
}> {
  const reports: AuditEvidenceReport[] = [];
  const criticalIssues: string[] = [];
  
  for (let element = 1; element <= 14; element++) {
    const report = await generateElementEvidenceReport(companyId, element);
    reports.push(report);
    
    // Collect critical issues
    if (report.status === 'missing') {
      criticalIssues.push(`Element ${element} (${report.elementName}): No valid documents found`);
    }
    report.invalidDocuments
      .filter(v => v.issues.some(i => i.severity === 'critical'))
      .forEach(v => {
        criticalIssues.push(
          `Element ${element}: ${v.document.control_number} - ${v.issues.filter(i => i.severity === 'critical').map(i => i.message).join('; ')}`
        );
      });
  }
  
  const overallCoverage = reports.reduce((sum, r) => sum + r.coveragePercentage, 0) / reports.length;
  
  return {
    elements: reports,
    overallCoverage,
    criticalIssues,
  };
}

/**
 * Finds documents that could serve as evidence for missing audit requirements
 */
export async function findPotentialEvidence(
  companyId: string,
  elementNumber: number
): Promise<DocumentEvidenceMatch[]> {
  const supabase = await createClient();
  
  const element = COR_ELEMENTS.find(e => e.number === elementNumber);
  if (!element) return [];
  
  // Get all active documents with extracted text
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['active', 'approved'])
    .not('extracted_text', 'is', null);
  
  const matches: DocumentEvidenceMatch[] = [];
  
  (documents || []).forEach(doc => {
    const detections = detectRelevantAuditElements(doc, doc.extracted_text || undefined);
    const relevantDetection = detections.find(d => d.elementNumber === elementNumber);
    
    if (relevantDetection && relevantDetection.confidence >= 40) {
      // Only include if not already linked
      if (!(doc.cor_elements || []).includes(elementNumber)) {
        matches.push({
          document: doc,
          audit_element_number: elementNumber,
          audit_question_id: `${elementNumber}.suggested`,
          confidence_score: relevantDetection.confidence,
          match_reason: relevantDetection.reason,
        });
      }
    }
  });
  
  return matches.sort((a, b) => b.confidence_score - a.confidence_score);
}
