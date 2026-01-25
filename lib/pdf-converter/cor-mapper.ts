/**
 * COR Element Mapper Service
 * 
 * AI-powered mapping of forms to COR (Certificate of Recognition) elements.
 * Suggests which COR elements a form supports and links to specific audit questions.
 */

import type {
  CORElementSuggestion,
  AuditQuestionSuggestion,
  DetectedField,
  AIAnalysisResult,
} from './types';
import { COR_ELEMENTS, type CORElement, type AuditQuestion } from '@/lib/audit/types';

// =============================================================================
// COR ELEMENT KEYWORDS
// =============================================================================

const COR_ELEMENT_KEYWORDS: Record<number, {
  primary: string[];
  secondary: string[];
  formTypes: string[];
}> = {
  1: {
    primary: ['policy', 'commitment', 'management commitment', 'safety policy', 'health and safety policy'],
    secondary: ['statement', 'declaration', 'pledge', 'responsibility'],
    formTypes: ['policy_acknowledgment', 'safety_policy', 'commitment'],
  },
  2: {
    primary: ['hazard assessment', 'hazard identification', 'risk assessment', 'job hazard analysis', 'jha'],
    secondary: ['hazard', 'risk', 'danger', 'threat', 'workplace assessment'],
    formTypes: ['hazard_assessment', 'risk_assessment', 'jha', 'fha'],
  },
  3: {
    primary: ['safe work', 'safe practice', 'safe procedure', 'work method'],
    secondary: ['procedure', 'method statement', 'work instruction', 'sop'],
    formTypes: ['safe_work_practice', 'swp', 'sop', 'procedure'],
  },
  4: {
    primary: ['safe job procedure', 'task analysis', 'critical task', 'lockout tagout', 'loto'],
    secondary: ['step by step', 'job steps', 'work steps', 'sequence'],
    formTypes: ['sjp', 'task_analysis', 'loto', 'lockout'],
  },
  5: {
    primary: ['safety rules', 'company rules', 'disciplinary', 'progressive discipline'],
    secondary: ['rules', 'regulation', 'violation', 'enforcement', 'consequence'],
    formTypes: ['safety_rules', 'disciplinary', 'violation_report'],
  },
  6: {
    primary: ['ppe', 'protective equipment', 'personal protective', 'safety equipment'],
    secondary: ['hardhat', 'gloves', 'glasses', 'vest', 'boots', 'respirator', 'hearing'],
    formTypes: ['ppe_assessment', 'ppe_issuance', 'ppe_inspection', 'fit_test'],
  },
  7: {
    primary: ['maintenance', 'preventative maintenance', 'equipment maintenance', 'inspection'],
    secondary: ['repair', 'service', 'defect', 'malfunction', 'pre-use'],
    formTypes: ['maintenance_log', 'equipment_inspection', 'pre_use_inspection'],
  },
  8: {
    primary: ['training', 'orientation', 'toolbox talk', 'safety meeting', 'communication'],
    secondary: ['education', 'instruction', 'briefing', 'awareness', 'competency'],
    formTypes: ['training_record', 'toolbox_talk', 'orientation', 'safety_meeting'],
  },
  9: {
    primary: ['workplace inspection', 'site inspection', 'safety inspection', 'audit'],
    secondary: ['walkaround', 'walkthrough', 'observation', 'deficiency'],
    formTypes: ['workplace_inspection', 'site_inspection', 'safety_audit'],
  },
  10: {
    primary: ['incident', 'accident', 'injury', 'investigation', 'near miss'],
    secondary: ['root cause', 'corrective action', 'witness', 'statement', 'report'],
    formTypes: ['incident_report', 'incident_investigation', 'near_miss', 'injury_report'],
  },
  11: {
    primary: ['emergency', 'evacuation', 'fire drill', 'emergency response', 'first aid'],
    secondary: ['alarm', 'muster', 'escape route', 'fire extinguisher', 'emergency plan'],
    formTypes: ['emergency_drill', 'evacuation_record', 'fire_drill', 'emergency_plan'],
  },
  12: {
    primary: ['statistics', 'records', 'tracking', 'injury log', 'first aid log'],
    secondary: ['data', 'metrics', 'trend', 'frequency', 'severity'],
    formTypes: ['injury_log', 'first_aid_log', 'statistics', 'safety_metrics'],
  },
  13: {
    primary: ['legislation', 'compliance', 'regulatory', 'legal', 'wsib'],
    secondary: ['act', 'regulation', 'code', 'standard', 'requirement', 'posted'],
    formTypes: ['compliance_checklist', 'regulatory', 'wsib', 'legal_posting'],
  },
  14: {
    primary: ['management review', 'program review', 'system review', 'continuous improvement'],
    secondary: ['effectiveness', 'performance', 'objective', 'target', 'kpi'],
    formTypes: ['management_review', 'safety_meeting', 'annual_review'],
  },
};

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze form content and suggest COR element mappings
 */
export function suggestCORElements(
  analysis: AIAnalysisResult,
  fields: DetectedField[],
  fullText: string
): CORElementSuggestion[] {
  const suggestions: CORElementSuggestion[] = [];
  const lowerText = fullText.toLowerCase();
  const lowerTitle = analysis.form_title.toLowerCase();
  const fieldLabels = fields.map(f => (f.user_label || f.detected_label).toLowerCase()).join(' ');
  
  const combinedText = `${lowerTitle} ${lowerText} ${fieldLabels}`;
  
  // Score each COR element
  for (const [elementNum, keywords] of Object.entries(COR_ELEMENT_KEYWORDS)) {
    const element = parseInt(elementNum);
    const elementInfo = COR_ELEMENTS.find(e => e.number === element);
    if (!elementInfo) continue;
    
    let score = 0;
    const reasons: string[] = [];
    
    // Check primary keywords (high weight)
    for (const keyword of keywords.primary) {
      if (combinedText.includes(keyword)) {
        score += 30;
        reasons.push(`Contains "${keyword}"`);
      }
    }
    
    // Check secondary keywords (medium weight)
    for (const keyword of keywords.secondary) {
      if (combinedText.includes(keyword)) {
        score += 10;
      }
    }
    
    // Check form type patterns (high weight)
    for (const formType of keywords.formTypes) {
      if (lowerTitle.includes(formType.replace(/_/g, ' ')) || lowerTitle.includes(formType)) {
        score += 25;
        reasons.push(`Form type matches "${formType}"`);
      }
    }
    
    // Use AI suggestion if available
    if (analysis.suggested_cor_element === element) {
      score += 20;
      reasons.push('AI analysis suggests this element');
    }
    
    // Calculate confidence (0-100)
    const confidence = Math.min(Math.round(score), 95);
    
    if (confidence >= 20) {
      // Get related audit questions
      const relatedQuestions = getRelatedAuditQuestions(elementInfo, combinedText);
      
      suggestions.push({
        element_number: element,
        element_name: elementInfo.name,
        confidence,
        reasoning: reasons.length > 0 
          ? reasons.slice(0, 3).join('; ')
          : `Content matches Element ${element} patterns`,
        related_questions: relatedQuestions,
      });
    }
  }
  
  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  // Return top 5 suggestions
  return suggestions.slice(0, 5);
}

/**
 * Get audit questions related to the form content
 */
function getRelatedAuditQuestions(
  element: CORElement,
  combinedText: string
): AuditQuestionSuggestion[] {
  const suggestions: AuditQuestionSuggestion[] = [];
  
  for (const question of element.auditQuestions) {
    const questionLower = question.question.toLowerCase();
    let relevanceScore = 0;
    
    // Check for keyword overlap
    const questionWords = questionLower.split(/\s+/).filter(w => w.length > 4);
    for (const word of questionWords) {
      if (combinedText.includes(word)) {
        relevanceScore += 15;
      }
    }
    
    // Check evidence type match
    for (const evidenceType of question.evidenceTypes) {
      if (combinedText.includes(evidenceType)) {
        relevanceScore += 20;
      }
    }
    
    // Documentation questions are highly relevant for forms
    if (question.category === 'documentation') {
      relevanceScore += 10;
    }
    
    if (relevanceScore > 20) {
      suggestions.push({
        question_id: question.id,
        question_text: question.question,
        relevance_score: Math.min(relevanceScore, 100),
      });
    }
  }
  
  // Sort by relevance and return top 5
  suggestions.sort((a, b) => b.relevance_score - a.relevance_score);
  return suggestions.slice(0, 5);
}

/**
 * Get all COR elements with descriptions
 */
export function getAllCORElements(): {
  number: number;
  name: string;
  description: string;
  weight: number;
}[] {
  return COR_ELEMENTS.map(e => ({
    number: e.number,
    name: e.name,
    description: e.description,
    weight: e.weight,
  }));
}

/**
 * Get audit questions for a specific element
 */
export function getAuditQuestionsForElement(elementNumber: number): AuditQuestion[] {
  const element = COR_ELEMENTS.find(e => e.number === elementNumber);
  return element?.auditQuestions || [];
}

/**
 * Get required forms for a specific element
 */
export function getRequiredFormsForElement(elementNumber: number): string[] {
  const element = COR_ELEMENTS.find(e => e.number === elementNumber);
  return element?.requiredForms || [];
}

/**
 * Check if form content matches a specific COR element
 */
export function matchesElement(
  elementNumber: number,
  formTitle: string,
  formDescription: string,
  fieldLabels: string[]
): {
  matches: boolean;
  confidence: number;
  reasons: string[];
} {
  // Safe: elementNumber is a controlled COR element number (1-14) parameter
  // eslint-disable-next-line security/detect-object-injection
  const keywords = COR_ELEMENT_KEYWORDS[elementNumber];
  if (!keywords) {
    return { matches: false, confidence: 0, reasons: ['Unknown element number'] };
  }
  
  const combinedText = `${formTitle} ${formDescription} ${fieldLabels.join(' ')}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;
  
  for (const keyword of keywords.primary) {
    if (combinedText.includes(keyword)) {
      score += 30;
      reasons.push(`Contains primary keyword: "${keyword}"`);
    }
  }
  
  for (const keyword of keywords.secondary) {
    if (combinedText.includes(keyword)) {
      score += 10;
    }
  }
  
  const confidence = Math.min(score, 100);
  
  return {
    matches: confidence >= 30,
    confidence,
    reasons: reasons.slice(0, 3),
  };
}

// =============================================================================
// NON-COR FORM CATEGORIES
// =============================================================================

export const NON_COR_CATEGORIES = [
  { value: 'hr', label: 'Human Resources' },
  { value: 'operations', label: 'Operations' },
  { value: 'quality', label: 'Quality Control' },
  { value: 'customer', label: 'Customer Service' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'finance', label: 'Finance/Accounting' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'project', label: 'Project Management' },
  { value: 'other', label: 'Other/Custom' },
];

