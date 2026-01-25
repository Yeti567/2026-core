/**
 * COR 2020 Evidence Mapper
 * 
 * Maps form submissions and documents to specific COR audit questions.
 * Determines sufficiency of evidence and identifies gaps.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditQuestion {
  id: string;
  element_number: number;
  question_number: string;
  question_text: string;
  verification_methods: string[];
  required_evidence_types: string[];
  point_value: number;
  sampling_requirements: string | null;
  category: string | null;
}

export interface Evidence {
  id: string;
  type: 'form' | 'document' | 'training' | 'observation';
  reference: string;
  date: string;
  description: string;
  url: string;
  formCode?: string;
  relevanceScore?: number;
}

export interface QuestionEvidence {
  question: AuditQuestion;
  evidence_found: Evidence[];
  is_sufficient: boolean;
  required_samples: number;
  found_samples: number;
  coverage_percentage: number;
  gaps: string[];
  score: number;
  max_score: number;
}

export interface EvidenceMap {
  [questionId: string]: QuestionEvidence;
}

export interface ElementEvidenceSummary {
  element_number: number;
  element_name: string;
  total_questions: number;
  questions_with_evidence: number;
  questions_sufficient: number;
  total_evidence: number;
  overall_coverage: number;
  earned_points: number;
  max_points: number;
  percentage: number;
  questions: QuestionEvidence[];
}

export interface CompanyEvidenceReport {
  company_id: string;
  generated_at: string;
  total_questions: number;
  total_evidence_items: number;
  questions_with_sufficient_evidence: number;
  overall_coverage_percentage: number;
  total_points: number;
  max_points: number;
  overall_percentage: number;
  elements: ElementEvidenceSummary[];
  critical_gaps: string[];
  evidence_map: EvidenceMap;
}

// ============================================================================
// ELEMENT NAMES
// ============================================================================

const ELEMENT_NAMES: Record<number, string> = {
  1: 'Health & Safety Management System',
  2: 'Hazard Identification & Assessment',
  3: 'Hazard Control',
  4: 'Competency & Training',
  5: 'Workplace Behavior',
  6: 'Personal Protective Equipment',
  7: 'Preventative Maintenance',
  8: 'Training & Communication',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Preparedness',
  12: 'Statistics & Records',
  13: 'Regulatory Awareness',
  14: 'Management System Review',
};

// ============================================================================
// MAIN MAPPING FUNCTION
// ============================================================================

/**
 * Maps all evidence to audit questions for a company
 */
export async function mapEvidenceToAuditQuestions(
  companyId: string
): Promise<EvidenceMap> {
  const supabase = await createClient();
  
  // Get all audit questions
  const { data: questions, error: questionsError } = await supabase
    .from('audit_questions')
    .select('*')
    .order('element_number', { ascending: true })
    .order('question_number', { ascending: true });
  
  if (questionsError || !questions) {
    console.error('Failed to fetch audit questions:', questionsError);
    return {};
  }
  
  const evidenceMap: EvidenceMap = {};
  
  for (const question of questions) {
    const evidence = await findEvidenceForQuestion(companyId, question as AuditQuestion);
    const requiredSamples = parseSamplingRequirement(question.sampling_requirements);
    const recentEvidence = filterRecentEvidence(evidence, 90); // Last 90 days
    const isSufficient = evaluateSufficiency(recentEvidence, requiredSamples);
    const gaps = identifyGaps(evidence, question as AuditQuestion, requiredSamples);
    const score = calculateQuestionScore(evidence, question as AuditQuestion, requiredSamples);
    
    // Safe: question.id is from database query result (iterating audit_questions from Supabase)
     
    evidenceMap[question.id] = {
      question: question as AuditQuestion,
      evidence_found: evidence,
      is_sufficient: isSufficient,
      required_samples: requiredSamples,
      found_samples: recentEvidence.length,
      coverage_percentage: Math.min(100, (recentEvidence.length / requiredSamples) * 100),
      gaps,
      score,
      max_score: question.point_value,
    };
  }
  
  return evidenceMap;
}

/**
 * Generates a complete evidence report for a company
 */
export async function generateEvidenceReport(
  companyId: string
): Promise<CompanyEvidenceReport> {
  const evidenceMap = await mapEvidenceToAuditQuestions(companyId);
  const questions = Object.values(evidenceMap);
  
  // Group by element
  const elementMap = new Map<number, QuestionEvidence[]>();
  for (const qe of questions) {
    const element = qe.question.element_number;
    if (!elementMap.has(element)) {
      elementMap.set(element, []);
    }
    elementMap.get(element)!.push(qe);
  }
  
  // Build element summaries
  const elements: ElementEvidenceSummary[] = [];
  let totalPoints = 0;
  let maxPoints = 0;
  let totalEvidence = 0;
  let questionsWithSufficientEvidence = 0;
  const criticalGaps: string[] = [];
  
  for (let elementNum = 1; elementNum <= 14; elementNum++) {
    const elementQuestions = elementMap.get(elementNum) || [];
    const elementEarned = elementQuestions.reduce((sum, q) => sum + q.score, 0);
    const elementMax = elementQuestions.reduce((sum, q) => sum + q.max_score, 0);
    const elementEvidence = elementQuestions.reduce((sum, q) => sum + q.evidence_found.length, 0);
    const elementSufficient = elementQuestions.filter(q => q.is_sufficient).length;
    
    totalPoints += elementEarned;
    maxPoints += elementMax;
    totalEvidence += elementEvidence;
    questionsWithSufficientEvidence += elementSufficient;
    
    // Collect critical gaps (questions with 0 evidence)
    elementQuestions
      .filter(q => q.evidence_found.length === 0)
      .forEach(q => {
        criticalGaps.push(`Element ${elementNum} (${q.question.question_number}): ${q.question.question_text}`);
      });
    
    elements.push({
      element_number: elementNum,
      // Safe: elementNum is a controlled loop variable (1-14)
      // eslint-disable-next-line security/detect-object-injection
      element_name: ELEMENT_NAMES[elementNum],
      total_questions: elementQuestions.length,
      questions_with_evidence: elementQuestions.filter(q => q.evidence_found.length > 0).length,
      questions_sufficient: elementSufficient,
      total_evidence: elementEvidence,
      overall_coverage: elementQuestions.length > 0 
        ? (elementSufficient / elementQuestions.length) * 100 
        : 0,
      earned_points: elementEarned,
      max_points: elementMax,
      percentage: elementMax > 0 ? (elementEarned / elementMax) * 100 : 0,
      questions: elementQuestions,
    });
  }
  
  return {
    company_id: companyId,
    generated_at: new Date().toISOString(),
    total_questions: questions.length,
    total_evidence_items: totalEvidence,
    questions_with_sufficient_evidence: questionsWithSufficientEvidence,
    overall_coverage_percentage: questions.length > 0 
      ? (questionsWithSufficientEvidence / questions.length) * 100 
      : 0,
    total_points: totalPoints,
    max_points: maxPoints,
    overall_percentage: maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0,
    elements,
    critical_gaps: criticalGaps.slice(0, 20), // Top 20 critical gaps
    evidence_map: evidenceMap,
  };
}

// ============================================================================
// EVIDENCE FINDING
// ============================================================================

/**
 * Finds all evidence that could answer a specific audit question
 */
export async function findEvidenceForQuestion(
  companyId: string,
  question: AuditQuestion
): Promise<Evidence[]> {
  const supabase = await createClient();
  const evidence: Evidence[] = [];
  const evidenceTypes = question.required_evidence_types || [];
  
  if (evidenceTypes.length === 0) {
    return evidence;
  }
  
  // Look for form submissions matching required form codes
  const { data: templates } = await supabase
    .from('form_templates')
    .select('id, form_code, name')
    .or(`form_code.in.(${evidenceTypes.join(',')}),form_code.ilike.any(${JSON.stringify(evidenceTypes.map(t => `%${t}%`))})`);
  
  const templateIds = templates?.map(t => t.id) || [];
  const templateMap = new Map(templates?.map(t => [t.id, t]) || []);
  
  if (templateIds.length > 0) {
    const { data: submissions } = await supabase
      .from('form_submissions')
      .select(`
        id,
        form_number,
        status,
        submitted_at,
        created_at,
        form_template_id
      `)
      .eq('company_id', companyId)
      .in('form_template_id', templateIds)
      .in('status', ['submitted', 'approved'])
      .order('submitted_at', { ascending: false })
      .limit(50);
    
    submissions?.forEach(sub => {
      const template = templateMap.get(sub.form_template_id);
      evidence.push({
        id: sub.id,
        type: 'form',
        reference: sub.form_number,
        date: sub.submitted_at || sub.created_at,
        description: template?.name || 'Form Submission',
        url: `/admin/form-templates/${sub.form_template_id}/submissions/${sub.id}`,
        formCode: template?.form_code,
        relevanceScore: calculateRelevanceScore(template?.form_code || '', evidenceTypes),
      });
    });
  }
  
  // Also check for direct form code matches in form_submissions via templates
  const directMatches = evidenceTypes.filter(et => 
    !templates?.some(t => t.form_code === et || t.form_code.includes(et))
  );
  
  if (directMatches.length > 0) {
    const { data: additionalTemplates } = await supabase
      .from('form_templates')
      .select('id, form_code, name')
      .in('form_code', directMatches);
    
    if (additionalTemplates && additionalTemplates.length > 0) {
      const addTemplateIds = additionalTemplates.map(t => t.id);
      const { data: addSubmissions } = await supabase
        .from('form_submissions')
        .select(`
          id,
          form_number,
          status,
          submitted_at,
          created_at,
          form_template_id
        `)
        .eq('company_id', companyId)
        .in('form_template_id', addTemplateIds)
        .in('status', ['submitted', 'approved'])
        .order('submitted_at', { ascending: false })
        .limit(20);
      
      addSubmissions?.forEach(sub => {
        const template = additionalTemplates.find(t => t.id === sub.form_template_id);
        // Avoid duplicates
        if (!evidence.some(e => e.id === sub.id)) {
          evidence.push({
            id: sub.id,
            type: 'form',
            reference: sub.form_number,
            date: sub.submitted_at || sub.created_at,
            description: template?.name || 'Form Submission',
            url: `/admin/form-templates/${sub.form_template_id}/submissions/${sub.id}`,
            formCode: template?.form_code,
            relevanceScore: calculateRelevanceScore(template?.form_code || '', evidenceTypes),
          });
        }
      });
    }
  }
  
  // Sort by relevance score and date
  evidence.sort((a, b) => {
    const relevanceDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (relevanceDiff !== 0) return relevanceDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  return evidence;
}

/**
 * Calculates how relevant a form code is to the required evidence types
 */
function calculateRelevanceScore(formCode: string, requiredTypes: string[]): number {
  if (!formCode) return 0;
  
  // Exact match = 100
  if (requiredTypes.includes(formCode)) return 100;
  
  // Partial match (form code contains required type or vice versa)
  const partialMatch = requiredTypes.some(rt => 
    formCode.includes(rt) || rt.includes(formCode)
  );
  if (partialMatch) return 80;
  
  // Keyword match
  const formWords = formCode.toLowerCase().split('_');
  const reqWords = requiredTypes.flatMap(rt => rt.toLowerCase().split('_'));
  const commonWords = formWords.filter(w => reqWords.includes(w));
  if (commonWords.length > 0) {
    return 50 + (commonWords.length * 10);
  }
  
  return 30; // Default low relevance
}

// ============================================================================
// SUFFICIENCY EVALUATION
// ============================================================================

/**
 * Parses the sampling requirement text to extract number of samples needed
 */
function parseSamplingRequirement(requirement: string | null): number {
  if (!requirement) return 3; // Default to 3 samples
  
  // Look for numbers in the requirement
  const matches = requirement.match(/(\d+)/g);
  if (matches && matches.length > 0) {
    return parseInt(matches[0], 10);
  }
  
  // Keywords for sample sizes
  if (requirement.toLowerCase().includes('all') || requirement.toLowerCase().includes('every')) {
    return 10;
  }
  if (requirement.toLowerCase().includes('several') || requirement.toLowerCase().includes('multiple')) {
    return 5;
  }
  
  return 3; // Default
}

/**
 * Filters evidence to only include items from the last N days
 */
function filterRecentEvidence(evidence: Evidence[], days: number): Evidence[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return evidence.filter(e => new Date(e.date) >= cutoffDate);
}

/**
 * Determines if evidence is sufficient for an audit question
 */
export function evaluateSufficiency(
  evidence: Evidence[],
  requiredSamples: number
): boolean {
  return evidence.length >= requiredSamples;
}

// ============================================================================
// GAP IDENTIFICATION
// ============================================================================

/**
 * Identifies what's missing to fully answer an audit question
 */
export function identifyGaps(
  evidence: Evidence[],
  question: AuditQuestion,
  requiredSamples: number
): string[] {
  const gaps: string[] = [];
  const requiredTypes = question.required_evidence_types || [];
  
  // Check for missing evidence types
  for (const reqType of requiredTypes) {
    const hasEvidence = evidence.some(e => 
      e.formCode === reqType || 
      e.formCode?.includes(reqType) ||
      reqType.includes(e.formCode || '') ||
      e.description.toLowerCase().includes(reqType.replace(/_/g, ' ').toLowerCase())
    );
    
    if (!hasEvidence) {
      gaps.push(`Missing evidence type: ${reqType.replace(/_/g, ' ')}`);
    }
  }
  
  // Check recency
  const recentEvidence = filterRecentEvidence(evidence, 90);
  if (recentEvidence.length < requiredSamples) {
    const shortfall = requiredSamples - recentEvidence.length;
    gaps.push(`Need ${shortfall} more recent samples (last 90 days)`);
  }
  
  // Check if no evidence at all
  if (evidence.length === 0) {
    gaps.push('No evidence found for this audit question');
  }
  
  // Check for verification method coverage
  const methods = question.verification_methods || [];
  if (methods.includes('document') && evidence.filter(e => e.type === 'form' || e.type === 'document').length === 0) {
    gaps.push('No documentary evidence available');
  }
  
  return gaps;
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Calculates the score for a single audit question based on evidence
 */
export function calculateQuestionScore(
  evidence: Evidence[],
  question: AuditQuestion,
  requiredSamples: number
): number {
  if (evidence.length === 0) return 0;
  
  const recentEvidence = filterRecentEvidence(evidence, 90);
  const maxScore = question.point_value;
  
  // Calculate coverage ratio
  const coverageRatio = Math.min(1, recentEvidence.length / requiredSamples);
  
  // Calculate relevance factor (average relevance of evidence)
  const avgRelevance = evidence.reduce((sum, e) => sum + (e.relevanceScore || 50), 0) / evidence.length;
  const relevanceFactor = avgRelevance / 100;
  
  // Calculate score: coverage * relevance * max_score
  const score = Math.round(coverageRatio * relevanceFactor * maxScore);
  
  return Math.min(score, maxScore);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets all audit questions
 */
export async function getAllAuditQuestions(): Promise<AuditQuestion[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('audit_questions')
    .select('*')
    .order('element_number', { ascending: true })
    .order('question_number', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch audit questions:', error);
    return [];
  }
  
  return data as AuditQuestion[];
}

/**
 * Gets audit questions for a specific element
 */
export async function getElementAuditQuestions(elementNumber: number): Promise<AuditQuestion[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('audit_questions')
    .select('*')
    .eq('element_number', elementNumber)
    .order('question_number', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch element questions:', error);
    return [];
  }
  
  return data as AuditQuestion[];
}

/**
 * Gets evidence summary for a specific element
 */
export async function getElementEvidenceSummary(
  companyId: string,
  elementNumber: number
): Promise<ElementEvidenceSummary | null> {
  const report = await generateEvidenceReport(companyId);
  return report.elements.find(e => e.element_number === elementNumber) || null;
}

/**
 * Gets quick stats about evidence coverage
 */
export async function getEvidenceCoverageStats(companyId: string): Promise<{
  totalQuestions: number;
  questionsWithEvidence: number;
  questionsSufficient: number;
  coveragePercentage: number;
  gapsCount: number;
}> {
  const evidenceMap = await mapEvidenceToAuditQuestions(companyId);
  const questions = Object.values(evidenceMap);
  
  const questionsWithEvidence = questions.filter(q => q.evidence_found.length > 0).length;
  const questionsSufficient = questions.filter(q => q.is_sufficient).length;
  const gapsCount = questions.reduce((sum, q) => sum + q.gaps.length, 0);
  
  return {
    totalQuestions: questions.length,
    questionsWithEvidence,
    questionsSufficient,
    coveragePercentage: questions.length > 0 
      ? (questionsSufficient / questions.length) * 100 
      : 0,
    gapsCount,
  };
}

/**
 * Auto-maps new evidence to relevant audit questions
 */
export async function autoMapEvidence(
  companyId: string,
  evidenceType: string,
  evidenceId: string,
  formCode: string
): Promise<string[]> {
  const supabase = await createClient();
  const mappedQuestions: string[] = [];
  
  // Find questions that accept this form code
  const { data: questions } = await supabase
    .from('audit_questions')
    .select('id, question_number')
    .contains('required_evidence_types', [formCode]);
  
  if (!questions || questions.length === 0) {
    // Try partial match
    const { data: allQuestions } = await supabase
      .from('audit_questions')
      .select('id, question_number, required_evidence_types');
    
    allQuestions?.forEach(q => {
      const types = q.required_evidence_types || [];
      const matches = types.some((t: string) => 
        t.includes(formCode) || formCode.includes(t)
      );
      if (matches) {
        questions?.push({ id: q.id, question_number: q.question_number });
      }
    });
  }
  
  // Create mappings
  for (const question of questions || []) {
    try {
      await supabase
        .from('evidence_question_mappings')
        .upsert({
          company_id: companyId,
          evidence_type: evidenceType,
          evidence_id: evidenceId,
          audit_question_id: question.id,
          relevance_score: 100,
          auto_mapped: true,
        }, {
          onConflict: 'company_id,evidence_type,evidence_id,audit_question_id',
        });
      
      mappedQuestions.push(question.question_number);
    } catch (e) {
      console.warn('Failed to create evidence mapping:', e);
    }
  }
  
  return mappedQuestions;
}
