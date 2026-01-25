/**
 * Document-Audit Integration
 * 
 * Comprehensive integration between the document control system and COR audit engine.
 * Provides:
 * - Automated evidence finding for audit elements
 * - Multi-strategy document searching (control number, type, folder, content)
 * - Document compliance scoring
 * - Gap analysis for missing documents
 * - Audit package evidence generation
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentEvidence {
  id: string;
  control_number: string;
  title: string;
  description?: string;
  document_type: string;
  document_type_name?: string;
  version: string;
  effective_date?: string;
  file_path?: string;
  file_name?: string;
  folder_id?: string;
  folder_name?: string;
  folder_code?: string;
  evidence_type: 'document';
  relevance: number; // 0-100
  snippet?: string;
  matched_term?: string;
  matched_requirements?: string[];
  cor_elements?: number[];
  tags?: string[];
  is_critical?: boolean;
  page_count?: number;
  updated_at?: string;
}

export interface DocumentRequirement {
  id: string;
  title_keywords?: string[];
  document_type?: string;
  control_number_pattern?: string;
  folder_code?: string;
  folder_name?: string;
  content_must_include?: string[];
  cor_elements?: number[];
  tags?: string[];
  min_count: number;
  max_count?: number;
  timeframe?: 'last_12_months' | 'last_6_months' | 'last_3_months' | 'current_year';
  points: number;
  description: string;
  guidance?: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ElementDocumentRequirements {
  element_number: number;
  element_name: string;
  required: DocumentRequirement[];
  recommended?: DocumentRequirement[];
}

export interface DocumentGap {
  requirement_id: string;
  element_number: number;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  action_required: string;
  estimated_effort_hours: number;
  found_count: number;
  required_count: number;
  found_documents?: DocumentEvidence[];
  suggested_title?: string;
  suggested_folder?: string;
  suggested_document_type?: string;
}

export interface DocumentComplianceScore {
  element_number: number;
  element_name: string;
  total_points: number;
  earned_points: number;
  percentage: number;
  documents_found: number;
  documents_required: number;
  documents_matched: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  gaps: DocumentGap[];
  evidence: DocumentEvidence[];
}

export interface OverallDocumentCompliance {
  total_documents: number;
  required_documents: number;
  matched_documents: number;
  overall_percentage: number;
  overall_status: 'compliant' | 'partial' | 'non_compliant';
  by_element: DocumentComplianceScore[];
  critical_gaps: DocumentGap[];
  major_gaps: DocumentGap[];
  minor_gaps: DocumentGap[];
  recommendations: string[];
}

// ============================================================================
// ELEMENT DOCUMENT REQUIREMENTS
// ============================================================================

export const ELEMENT_DOCUMENT_REQUIREMENTS: Record<number, ElementDocumentRequirements> = {
  1: {
    element_number: 1,
    element_name: 'Management Leadership & Organizational Commitment',
    required: [
      {
        id: 'elem1_hs_policy',
        title_keywords: ['health', 'safety', 'policy'],
        document_type: 'POL',
        control_number_pattern: '*-POL-001',
        content_must_include: ['management commitment', 'responsibilities', 'signed'],
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'Health & Safety Policy signed by top management',
        guidance: 'Must be signed by CEO/President, dated within last 2 years, and posted in workplace'
      },
      {
        id: 'elem1_org_chart',
        title_keywords: ['organizational', 'chart', 'structure', 'responsibilities'],
        document_type: 'POL',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Organizational chart with H&S responsibilities',
        guidance: 'Show reporting relationships for H&S matters'
      },
      {
        id: 'elem1_mgmt_review',
        folder_code: 'MIN',
        document_type: 'MIN',
        title_keywords: ['management', 'review', 'h&s'],
        min_count: 4,
        timeframe: 'last_12_months',
        points: 10,
        severity: 'major',
        description: 'Quarterly management review meetings',
        guidance: 'At least 4 meetings per year reviewing H&S performance'
      },
      {
        id: 'elem1_committee_terms',
        title_keywords: ['committee', 'terms of reference', 'safety committee'],
        document_type: 'POL',
        min_count: 1,
        points: 5,
        severity: 'minor',
        description: 'Joint H&S Committee terms of reference'
      }
    ]
  },
  2: {
    element_number: 2,
    element_name: 'Hazard Identification & Assessment',
    required: [
      {
        id: 'elem2_hazard_procedure',
        title_keywords: ['hazard', 'identification', 'assessment', 'procedure'],
        document_type: 'PRC',
        content_must_include: ['identify', 'assess', 'risk', 'control'],
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'Hazard identification and assessment procedure'
      },
      {
        id: 'elem2_jha_form',
        title_keywords: ['job', 'hazard', 'analysis', 'jha', 'task'],
        document_type: 'FRM',
        folder_code: 'FRM',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Job Hazard Analysis (JHA) form template'
      },
      {
        id: 'elem2_risk_matrix',
        title_keywords: ['risk', 'matrix', 'assessment', 'scoring'],
        document_type: 'FRM',
        min_count: 1,
        points: 5,
        severity: 'minor',
        description: 'Risk assessment matrix/scoring guide'
      },
      {
        id: 'elem2_completed_jhas',
        folder_code: 'RPT',
        title_keywords: ['jha', 'hazard analysis', 'assessment'],
        min_count: 10,
        points: 10,
        severity: 'major',
        description: 'Completed JHAs for high-risk tasks'
      }
    ]
  },
  3: {
    element_number: 3,
    element_name: 'Hazard Control',
    required: [
      {
        id: 'elem3_control_procedure',
        title_keywords: ['hazard', 'control', 'hierarchy'],
        document_type: 'PRC',
        content_must_include: ['elimination', 'substitution', 'engineering', 'administrative', 'PPE'],
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'Hazard control procedure with hierarchy of controls'
      },
      {
        id: 'elem3_swps',
        folder_code: 'SWP',
        document_type: 'SWP',
        content_must_include: ['hazard', 'control', 'step'],
        min_count: 15,
        points: 20,
        severity: 'critical',
        description: 'Safe Work Procedures for high-risk tasks'
      },
      {
        id: 'elem3_permit_procedures',
        title_keywords: ['permit', 'work', 'hot work', 'confined space', 'lockout'],
        document_type: 'PRC',
        min_count: 3,
        points: 10,
        severity: 'major',
        description: 'Permit-to-work procedures (confined space, hot work, etc.)'
      }
    ]
  },
  4: {
    element_number: 4,
    element_name: 'Competency, Training & Orientation',
    required: [
      {
        id: 'elem4_training_policy',
        title_keywords: ['training', 'policy', 'competency'],
        document_type: 'POL',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Training and competency policy'
      },
      {
        id: 'elem4_orientation',
        title_keywords: ['orientation', 'new worker', 'induction'],
        document_type: 'PRC',
        folder_code: 'TRN',
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'New worker orientation program'
      },
      {
        id: 'elem4_training_matrix',
        title_keywords: ['training', 'matrix', 'requirements', 'competency'],
        document_type: 'FRM',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Training requirements matrix'
      },
      {
        id: 'elem4_training_materials',
        folder_code: 'TRN',
        document_type: 'TRN',
        min_count: 5,
        points: 10,
        severity: 'minor',
        description: 'Training materials and presentations'
      }
    ]
  },
  5: {
    element_number: 5,
    element_name: 'Workplace Behavior & Discipline',
    required: [
      {
        id: 'elem5_rules_policy',
        title_keywords: ['safety', 'rules', 'expectations', 'behavior'],
        document_type: 'POL',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Workplace safety rules and expectations'
      },
      {
        id: 'elem5_discipline_procedure',
        title_keywords: ['discipline', 'progressive', 'enforcement'],
        document_type: 'PRC',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Progressive discipline procedure'
      },
      {
        id: 'elem5_positive_recognition',
        title_keywords: ['recognition', 'incentive', 'positive'],
        document_type: 'PRC',
        min_count: 1,
        points: 5,
        severity: 'minor',
        description: 'Positive safety recognition program'
      }
    ]
  },
  6: {
    element_number: 6,
    element_name: 'Personal Protective Equipment',
    required: [
      {
        id: 'elem6_ppe_policy',
        title_keywords: ['PPE', 'personal protective equipment'],
        document_type: 'POL',
        content_must_include: ['selection', 'use', 'maintenance', 'training'],
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'PPE policy covering all requirements'
      },
      {
        id: 'elem6_ppe_procedure',
        title_keywords: ['PPE', 'selection', 'assessment', 'hazard'],
        document_type: 'PRC',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'PPE selection and assessment procedure'
      },
      {
        id: 'elem6_ppe_form',
        title_keywords: ['PPE', 'issuance', 'tracking', 'form'],
        document_type: 'FRM',
        folder_code: 'FRM',
        min_count: 1,
        points: 5,
        severity: 'minor',
        description: 'PPE issuance tracking form'
      }
    ]
  },
  7: {
    element_number: 7,
    element_name: 'Preventive Maintenance',
    required: [
      {
        id: 'elem7_maintenance_procedure',
        title_keywords: ['preventive', 'maintenance', 'equipment'],
        document_type: 'PRC',
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'Preventive maintenance procedure'
      },
      {
        id: 'elem7_maintenance_schedule',
        title_keywords: ['maintenance', 'schedule', 'equipment'],
        document_type: 'FRM',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Equipment maintenance schedule template'
      },
      {
        id: 'elem7_inspection_form',
        title_keywords: ['equipment', 'inspection', 'checklist'],
        document_type: 'FRM',
        min_count: 3,
        points: 5,
        severity: 'minor',
        description: 'Equipment inspection checklists'
      }
    ]
  },
  8: {
    element_number: 8,
    element_name: 'Communications',
    required: [
      {
        id: 'elem8_communication_policy',
        title_keywords: ['communication', 'safety', 'information'],
        document_type: 'POL',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Safety communication policy'
      },
      {
        id: 'elem8_toolbox_talks',
        title_keywords: ['toolbox', 'talk', 'safety', 'meeting'],
        document_type: 'TRN',
        folder_code: 'TRN',
        min_count: 12,
        timeframe: 'last_12_months',
        points: 10,
        severity: 'major',
        description: 'Monthly toolbox talk records'
      },
      {
        id: 'elem8_committee_minutes',
        title_keywords: ['committee', 'minutes', 'safety'],
        document_type: 'MIN',
        folder_code: 'MIN',
        min_count: 12,
        timeframe: 'last_12_months',
        points: 10,
        severity: 'major',
        description: 'Monthly safety committee meeting minutes'
      }
    ]
  },
  9: {
    element_number: 9,
    element_name: 'Workplace Inspections',
    required: [
      {
        id: 'elem9_inspection_procedure',
        title_keywords: ['inspection', 'workplace', 'procedure'],
        document_type: 'PRC',
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'Workplace inspection procedure'
      },
      {
        id: 'elem9_inspection_checklists',
        title_keywords: ['inspection', 'checklist', 'workplace'],
        document_type: 'FRM',
        folder_code: 'FRM',
        min_count: 3,
        points: 10,
        severity: 'major',
        description: 'Workplace inspection checklists'
      },
      {
        id: 'elem9_inspection_reports',
        title_keywords: ['inspection', 'report', 'findings'],
        document_type: 'RPT',
        folder_code: 'RPT',
        min_count: 12,
        timeframe: 'last_12_months',
        points: 10,
        severity: 'major',
        description: 'Monthly workplace inspection reports'
      }
    ]
  },
  10: {
    element_number: 10,
    element_name: 'Incident Investigation',
    required: [
      {
        id: 'elem10_investigation_procedure',
        title_keywords: ['incident', 'investigation', 'procedure'],
        document_type: 'PRC',
        content_must_include: ['root cause', 'corrective action', 'report'],
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'Incident investigation procedure'
      },
      {
        id: 'elem10_investigation_form',
        title_keywords: ['incident', 'investigation', 'form', 'report'],
        document_type: 'FRM',
        folder_code: 'FRM',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Incident investigation form template'
      },
      {
        id: 'elem10_near_miss_form',
        title_keywords: ['near miss', 'hazard', 'reporting'],
        document_type: 'FRM',
        min_count: 1,
        points: 5,
        severity: 'minor',
        description: 'Near miss/hazard reporting form'
      }
    ]
  },
  11: {
    element_number: 11,
    element_name: 'Emergency Response',
    required: [
      {
        id: 'elem11_erp',
        title_keywords: ['emergency', 'response', 'plan'],
        document_type: 'PLN',
        folder_code: 'EMR',
        content_must_include: ['evacuation', 'emergency', 'contact', 'assembly'],
        min_count: 1,
        points: 20,
        severity: 'critical',
        description: 'Emergency Response Plan'
      },
      {
        id: 'elem11_evacuation_procedure',
        title_keywords: ['evacuation', 'fire', 'emergency'],
        document_type: 'PRC',
        folder_code: 'EMR',
        min_count: 1,
        points: 10,
        severity: 'critical',
        description: 'Evacuation procedure'
      },
      {
        id: 'elem11_first_aid',
        title_keywords: ['first aid', 'medical', 'emergency'],
        document_type: 'PRC',
        folder_code: 'EMR',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'First aid procedure'
      },
      {
        id: 'elem11_drill_records',
        title_keywords: ['drill', 'exercise', 'evacuation'],
        document_type: 'RPT',
        min_count: 2,
        timeframe: 'last_12_months',
        points: 5,
        severity: 'minor',
        description: 'Emergency drill records'
      }
    ]
  },
  12: {
    element_number: 12,
    element_name: 'Statistics, Records & Documentation',
    required: [
      {
        id: 'elem12_records_procedure',
        title_keywords: ['records', 'documentation', 'retention'],
        document_type: 'PRC',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Records management procedure'
      },
      {
        id: 'elem12_statistics_report',
        title_keywords: ['statistics', 'metrics', 'performance', 'kpi'],
        document_type: 'RPT',
        folder_code: 'RPT',
        min_count: 4,
        timeframe: 'last_12_months',
        points: 10,
        severity: 'major',
        description: 'Quarterly safety statistics reports'
      }
    ]
  },
  13: {
    element_number: 13,
    element_name: 'Regulatory Compliance',
    required: [
      {
        id: 'elem13_compliance_procedure',
        title_keywords: ['compliance', 'regulatory', 'legal'],
        document_type: 'PRC',
        min_count: 1,
        points: 15,
        severity: 'critical',
        description: 'Regulatory compliance procedure'
      },
      {
        id: 'elem13_legislation_register',
        title_keywords: ['legislation', 'register', 'compliance', 'legal'],
        document_type: 'FRM',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Applicable legislation register'
      },
      {
        id: 'elem13_certifications',
        folder_code: 'CRT',
        document_type: 'CRT',
        min_count: 1,
        points: 5,
        severity: 'minor',
        description: 'Required certifications and permits'
      }
    ]
  },
  14: {
    element_number: 14,
    element_name: 'Management Review',
    required: [
      {
        id: 'elem14_review_procedure',
        title_keywords: ['management', 'review', 'continuous improvement'],
        document_type: 'PRC',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Management review procedure'
      },
      {
        id: 'elem14_annual_review',
        title_keywords: ['annual', 'review', 'h&s', 'performance'],
        document_type: 'RPT',
        folder_code: 'RPT',
        min_count: 1,
        timeframe: 'last_12_months',
        points: 15,
        severity: 'critical',
        description: 'Annual H&S program review report'
      },
      {
        id: 'elem14_improvement_plan',
        title_keywords: ['improvement', 'action', 'plan'],
        document_type: 'PLN',
        min_count: 1,
        points: 10,
        severity: 'major',
        description: 'Continuous improvement action plan'
      }
    ]
  }
};

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search documents by control number pattern
 * Pattern example: "*-POL-001" matches NCCI-POL-001, ABC-POL-001, etc.
 */
export async function searchByControlNumber(
  companyId: string,
  pattern: string
): Promise<DocumentEvidence[]> {
  const supabase = await createClient();
  
  // Convert wildcard pattern to SQL LIKE pattern
  const sqlPattern = pattern.replace(/\*/g, '%');
  
  const { data: documents, error } = await supabase
    .from('documents')
    .select(`
      id,
      control_number,
      title,
      description,
      document_type_code,
      version,
      effective_date,
      file_path,
      file_name,
      cor_elements,
      tags,
      is_critical,
      page_count,
      updated_at,
      document_folders!folder_id (
        id,
        name,
        folder_code
      )
    `)
    .eq('company_id', companyId)
    .ilike('control_number', sqlPattern)
    .in('status', ['active', 'approved'])
    .order('control_number');

  if (error) {
    console.error('Error searching by control number:', error);
    return [];
  }

  return (documents || []).map((doc: any) => {
    const folder = Array.isArray(doc.document_folders) ? doc.document_folders[0] : doc.document_folders;
    return ({
    id: doc.id,
    control_number: doc.control_number,
    title: doc.title,
    description: doc.description,
    document_type: doc.document_type_code,
    version: doc.version,
    effective_date: doc.effective_date,
    file_path: doc.file_path,
    file_name: doc.file_name,
    folder_id: folder?.id,
    folder_name: folder?.name,
    folder_code: folder?.folder_code,
    evidence_type: 'document' as const,
    relevance: 100, // Exact control number match
    cor_elements: doc.cor_elements,
    tags: doc.tags,
    is_critical: doc.is_critical,
    page_count: doc.page_count,
    updated_at: doc.updated_at,
  });
  });
}

/**
 * Search documents by document type and optional title keywords
 */
export async function searchByDocumentType(
  companyId: string,
  documentType: string,
  titleKeywords?: string[],
  timeframe?: string
): Promise<DocumentEvidence[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('documents')
    .select(`
      id,
      control_number,
      title,
      description,
      document_type_code,
      version,
      effective_date,
      file_path,
      file_name,
      cor_elements,
      tags,
      is_critical,
      page_count,
      updated_at,
      created_at,
      document_folders!folder_id (
        id,
        name,
        folder_code
      )
    `)
    .eq('company_id', companyId)
    .eq('document_type_code', documentType)
    .in('status', ['active', 'approved']);

  // Apply timeframe filter
  if (timeframe) {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeframe) {
      case 'last_12_months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 12));
        break;
      case 'last_6_months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case 'last_3_months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'current_year':
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        cutoffDate = new Date(0);
    }
    
    query = query.gte('created_at', cutoffDate.toISOString());
  }

  const { data: documents, error } = await query.order('title');

  if (error) {
    console.error('Error searching by document type:', error);
    return [];
  }

  // Filter by title keywords if provided
  let filtered = documents || [];
  if (titleKeywords && titleKeywords.length > 0) {
    filtered = filtered.filter(doc => {
      const titleLower = doc.title.toLowerCase();
      return titleKeywords.some(kw => titleLower.includes(kw.toLowerCase()));
    });
  }

  return filtered.map((doc: any) => {
    const folder = Array.isArray(doc.document_folders) ? doc.document_folders[0] : doc.document_folders;
    return ({
    id: doc.id,
    control_number: doc.control_number,
    title: doc.title,
    description: doc.description,
    document_type: doc.document_type_code,
    version: doc.version,
    effective_date: doc.effective_date,
    file_path: doc.file_path,
    file_name: doc.file_name,
    folder_id: folder?.id,
    folder_name: folder?.name,
    folder_code: folder?.folder_code,
    evidence_type: 'document' as const,
    relevance: calculateKeywordRelevance(doc.title, titleKeywords),
    cor_elements: doc.cor_elements,
    tags: doc.tags,
    is_critical: doc.is_critical,
    page_count: doc.page_count,
    updated_at: doc.updated_at,
  });
  });
}

/**
 * Search documents by folder
 */
export async function searchByFolder(
  companyId: string,
  folderCode: string,
  titleKeywords?: string[],
  timeframe?: string
): Promise<DocumentEvidence[]> {
  const supabase = await createClient();
  
  // First get the folder ID
  const { data: folder } = await supabase
    .from('document_folders')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('folder_code', folderCode)
    .single();

  if (!folder) return [];

  let query = supabase
    .from('documents')
    .select(`
      id,
      control_number,
      title,
      description,
      document_type_code,
      version,
      effective_date,
      file_path,
      file_name,
      cor_elements,
      tags,
      is_critical,
      page_count,
      updated_at,
      created_at
    `)
    .eq('company_id', companyId)
    .eq('folder_id', folder.id)
    .in('status', ['active', 'approved']);

  // Apply timeframe filter
  if (timeframe) {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeframe) {
      case 'last_12_months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 12));
        break;
      case 'last_6_months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case 'last_3_months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'current_year':
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        cutoffDate = new Date(0);
    }
    
    query = query.gte('created_at', cutoffDate.toISOString());
  }

  const { data: documents, error } = await query.order('title');

  if (error) {
    console.error('Error searching by folder:', error);
    return [];
  }

  // Filter by title keywords if provided
  let filtered = documents || [];
  if (titleKeywords && titleKeywords.length > 0) {
    filtered = filtered.filter(doc => {
      const titleLower = doc.title.toLowerCase();
      return titleKeywords.some(kw => titleLower.includes(kw.toLowerCase()));
    });
  }

  return filtered.map(doc => ({
    id: doc.id,
    control_number: doc.control_number,
    title: doc.title,
    description: doc.description,
    document_type: doc.document_type_code,
    version: doc.version,
    effective_date: doc.effective_date,
    file_path: doc.file_path,
    file_name: doc.file_name,
    folder_id: folder.id,
    folder_name: folder.name,
    folder_code: folderCode,
    evidence_type: 'document' as const,
    relevance: calculateKeywordRelevance(doc.title, titleKeywords),
    cor_elements: doc.cor_elements,
    tags: doc.tags,
    is_critical: doc.is_critical,
    page_count: doc.page_count,
    updated_at: doc.updated_at,
  }));
}

/**
 * Full-text search in document content
 */
export async function searchDocumentContent(
  companyId: string,
  searchTerms: string[]
): Promise<DocumentEvidence[]> {
  const supabase = await createClient();
  const results: DocumentEvidence[] = [];
  const seenIds = new Set<string>();

  for (const term of searchTerms) {
    // Use advanced search RPC if available
    const { data: documents, error } = await supabase.rpc('search_documents_advanced', {
      p_company_id: companyId,
      p_search_query: term,
      p_folder_id: null,
      p_document_type: null,
      p_cor_elements: null,
      p_tags: null,
      p_keywords: null,
      p_roles: null,
      p_critical_only: false,
      p_limit: 50,
      p_offset: 0,
    });

    if (error) {
      // Fallback to basic search
      const { data: fallbackDocs } = await supabase
        .from('documents')
        .select(`
          id,
          control_number,
          title,
          description,
          document_type_code,
          version,
          effective_date,
          file_path,
          extracted_text,
          document_folders!folder_id (
            id,
            name,
            folder_code
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'approved'])
        .or(`title.ilike.%${term}%,description.ilike.%${term}%,extracted_text.ilike.%${term}%`)
        .limit(50);

      (fallbackDocs || []).forEach((doc: any) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          const folder = Array.isArray(doc.document_folders) ? doc.document_folders[0] : doc.document_folders;
          results.push({
            id: doc.id,
            control_number: doc.control_number,
            title: doc.title,
            description: doc.description,
            document_type: doc.document_type_code,
            version: doc.version,
            effective_date: doc.effective_date,
            file_path: doc.file_path,
            folder_id: folder?.id,
            folder_name: folder?.name,
            folder_code: folder?.folder_code,
            evidence_type: 'document',
            relevance: 60,
            snippet: extractSnippet(doc.extracted_text, term),
            matched_term: term,
          });
        }
      });
      continue;
    }

    (documents || []).forEach((doc: Record<string, unknown>) => {
      if (!seenIds.has(doc.id as string)) {
        seenIds.add(doc.id as string);
        results.push({
          id: doc.id as string,
          control_number: doc.control_number as string,
          title: doc.title as string,
          description: doc.description as string,
          document_type: doc.document_type as string,
          version: doc.version as string,
          effective_date: doc.effective_date as string,
          file_path: undefined,
          folder_id: doc.folder_id as string,
          folder_name: doc.folder_name as string,
          folder_code: doc.folder_code as string,
          evidence_type: 'document',
          relevance: ((doc.relevance as number) || 0.5) * 100,
          snippet: doc.snippet as string,
          matched_term: term,
        });
      }
    });
  }

  return results;
}

/**
 * Search by COR elements
 */
export async function searchByCORElements(
  companyId: string,
  elements: number[]
): Promise<DocumentEvidence[]> {
  const supabase = await createClient();
  
  const { data: documents, error } = await supabase
    .from('documents')
    .select(`
      id,
      control_number,
      title,
      description,
      document_type_code,
      version,
      effective_date,
      file_path,
      file_name,
      cor_elements,
      tags,
      is_critical,
      page_count,
      updated_at,
      document_folders!folder_id (
        id,
        name,
        folder_code
      )
    `)
    .eq('company_id', companyId)
    .overlaps('cor_elements', elements)
    .in('status', ['active', 'approved'])
    .order('control_number');

  if (error) {
    console.error('Error searching by COR elements:', error);
    return [];
  }

  return (documents || []).map((doc: any) => {
    const folder = Array.isArray(doc.document_folders) ? doc.document_folders[0] : doc.document_folders;
    return ({
    id: doc.id,
    control_number: doc.control_number,
    title: doc.title,
    description: doc.description,
    document_type: doc.document_type_code,
    version: doc.version,
    effective_date: doc.effective_date,
    file_path: doc.file_path,
    file_name: doc.file_name,
    folder_id: folder?.id,
    folder_name: folder?.name,
    folder_code: folder?.folder_code,
    evidence_type: 'document' as const,
    relevance: 90, // COR element match
    cor_elements: doc.cor_elements,
    tags: doc.tags,
    is_critical: doc.is_critical,
    page_count: doc.page_count,
    updated_at: doc.updated_at,
  });
  });
}

// ============================================================================
// EVIDENCE FINDING
// ============================================================================

/**
 * Find all document evidence for a specific audit element
 */
export async function findDocumentEvidenceForAudit(
  companyId: string,
  elementNumber: number
): Promise<DocumentEvidence[]> {
  const evidence: DocumentEvidence[] = [];
  const seenIds = new Set<string>();
  
  // Safe: elementNumber is a COR element number (1-14) from the function parameter
  // eslint-disable-next-line security/detect-object-injection
  const requirements = ELEMENT_DOCUMENT_REQUIREMENTS[elementNumber];
  if (!requirements) return [];

  // Search by COR element first (most relevant)
  const corResults = await searchByCORElements(companyId, [elementNumber]);
  corResults.forEach(doc => {
    if (!seenIds.has(doc.id)) {
      seenIds.add(doc.id);
      doc.matched_requirements = ['cor_element'];
      evidence.push(doc);
    }
  });

  // Process each requirement
  for (const req of requirements.required) {
    const matchedDocs: DocumentEvidence[] = [];

    // Search by control number pattern
    if (req.control_number_pattern) {
      const docs = await searchByControlNumber(companyId, req.control_number_pattern);
      matchedDocs.push(...docs);
    }

    // Search by document type
    if (req.document_type) {
      const docs = await searchByDocumentType(
        companyId,
        req.document_type,
        req.title_keywords,
        req.timeframe
      );
      matchedDocs.push(...docs);
    }

    // Search by folder
    if (req.folder_code) {
      const docs = await searchByFolder(
        companyId,
        req.folder_code,
        req.title_keywords,
        req.timeframe
      );
      matchedDocs.push(...docs);
    }

    // Full-text search in content
    if (req.content_must_include && req.content_must_include.length > 0) {
      const docs = await searchDocumentContent(companyId, req.content_must_include);
      matchedDocs.push(...docs);
    }

    // Add unique documents
    matchedDocs.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        doc.matched_requirements = [req.id];
        evidence.push(doc);
      } else {
        // Update existing with matched requirement
        const existing = evidence.find(e => e.id === doc.id);
        if (existing && existing.matched_requirements) {
          if (!existing.matched_requirements.includes(req.id)) {
            existing.matched_requirements.push(req.id);
            existing.relevance = Math.min(100, existing.relevance + 10);
          }
        }
      }
    });
  }

  // Sort by relevance
  return evidence.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Find evidence for all elements
 */
export async function findAllDocumentEvidence(
  companyId: string
): Promise<Map<number, DocumentEvidence[]>> {
  const allEvidence = new Map<number, DocumentEvidence[]>();

  for (let element = 1; element <= 14; element++) {
    const evidence = await findDocumentEvidenceForAudit(companyId, element);
    allEvidence.set(element, evidence);
  }

  return allEvidence;
}

// ============================================================================
// COMPLIANCE SCORING
// ============================================================================

/**
 * Score document compliance for a specific element
 */
export async function scoreDocumentCompliance(
  companyId: string,
  elementNumber: number
): Promise<DocumentComplianceScore> {
  // Safe: elementNumber is a COR element number (1-14) from the function parameter
  // eslint-disable-next-line security/detect-object-injection
  const requirements = ELEMENT_DOCUMENT_REQUIREMENTS[elementNumber];
  if (!requirements) {
    return {
      element_number: elementNumber,
      element_name: `Element ${elementNumber}`,
      total_points: 0,
      earned_points: 0,
      percentage: 0,
      documents_found: 0,
      documents_required: 0,
      documents_matched: 0,
      status: 'non_compliant',
      gaps: [],
      evidence: [],
    };
  }

  const foundEvidence = await findDocumentEvidenceForAudit(companyId, elementNumber);
  
  let totalPoints = 0;
  let earnedPoints = 0;
  let documentsRequired = 0;
  let documentsMatched = 0;
  const gaps: DocumentGap[] = [];

  for (const req of requirements.required) {
    totalPoints += req.points;
    documentsRequired += req.min_count;

    // Filter evidence that matches this requirement
    const matchingDocs = foundEvidence.filter(doc => 
      matchesRequirement(doc, req)
    );

    const foundCount = matchingDocs.length;
    const requiredCount = req.min_count;

    if (foundCount >= requiredCount) {
      earnedPoints += req.points;
      documentsMatched += Math.min(foundCount, requiredCount);
    } else {
      // Calculate partial credit
      const partialCredit = Math.floor((foundCount / requiredCount) * req.points);
      earnedPoints += partialCredit;
      documentsMatched += foundCount;

      gaps.push({
        requirement_id: req.id,
        element_number: elementNumber,
        severity: req.severity,
        description: `Missing: ${req.description}`,
        action_required: buildActionRequired(req),
        estimated_effort_hours: estimateEffort(req, foundCount),
        found_count: foundCount,
        required_count: requiredCount,
        found_documents: matchingDocs,
        suggested_title: req.title_keywords?.join(' '),
        suggested_folder: req.folder_code || req.folder_name,
        suggested_document_type: req.document_type,
      });
    }
  }

  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  
  let status: DocumentComplianceScore['status'];
  if (percentage >= 80) {
    status = 'compliant';
  } else if (percentage >= 50) {
    status = 'partial';
  } else {
    status = 'non_compliant';
  }

  return {
    element_number: elementNumber,
    element_name: requirements.element_name,
    total_points: totalPoints,
    earned_points: earnedPoints,
    percentage,
    documents_found: foundEvidence.length,
    documents_required: documentsRequired,
    documents_matched: documentsMatched,
    status,
    gaps,
    evidence: foundEvidence,
  };
}

/**
 * Get overall document compliance across all elements
 */
export async function getOverallDocumentCompliance(
  companyId: string
): Promise<OverallDocumentCompliance> {
  const elementScores: DocumentComplianceScore[] = [];
  
  for (let element = 1; element <= 14; element++) {
    const score = await scoreDocumentCompliance(companyId, element);
    elementScores.push(score);
  }

  const totalDocuments = elementScores.reduce((sum, e) => sum + e.documents_found, 0);
  const requiredDocuments = elementScores.reduce((sum, e) => sum + e.documents_required, 0);
  const matchedDocuments = elementScores.reduce((sum, e) => sum + e.documents_matched, 0);
  const totalPoints = elementScores.reduce((sum, e) => sum + e.total_points, 0);
  const earnedPoints = elementScores.reduce((sum, e) => sum + e.earned_points, 0);
  
  const overallPercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  let overallStatus: OverallDocumentCompliance['overall_status'];
  if (overallPercentage >= 80) {
    overallStatus = 'compliant';
  } else if (overallPercentage >= 50) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'non_compliant';
  }

  const allGaps = elementScores.flatMap(e => e.gaps);
  const criticalGaps = allGaps.filter(g => g.severity === 'critical');
  const majorGaps = allGaps.filter(g => g.severity === 'major');
  const minorGaps = allGaps.filter(g => g.severity === 'minor');

  const recommendations = generateRecommendations(elementScores, allGaps);

  return {
    total_documents: totalDocuments,
    required_documents: requiredDocuments,
    matched_documents: matchedDocuments,
    overall_percentage: overallPercentage,
    overall_status: overallStatus,
    by_element: elementScores,
    critical_gaps: criticalGaps,
    major_gaps: majorGaps,
    minor_gaps: minorGaps,
    recommendations,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function matchesRequirement(doc: DocumentEvidence, req: DocumentRequirement): boolean {
  // Check document type
  if (req.document_type && doc.document_type !== req.document_type) {
    return false;
  }

  // Check folder
  if (req.folder_code && doc.folder_code !== req.folder_code) {
    return false;
  }

  // Check title keywords
  if (req.title_keywords && req.title_keywords.length > 0) {
    const titleLower = doc.title.toLowerCase();
    const hasKeyword = req.title_keywords.some(kw => titleLower.includes(kw.toLowerCase()));
    if (!hasKeyword) return false;
  }

  // Check COR elements
  if (req.cor_elements && req.cor_elements.length > 0) {
    const docElements = doc.cor_elements || [];
    const hasElement = req.cor_elements.some(el => docElements.includes(el));
    if (!hasElement) return false;
  }

  return true;
}

function calculateKeywordRelevance(title: string, keywords?: string[]): number {
  if (!keywords || keywords.length === 0) return 70;
  
  const titleLower = title.toLowerCase();
  let matchCount = 0;
  
  for (const kw of keywords) {
    if (titleLower.includes(kw.toLowerCase())) {
      matchCount++;
    }
  }
  
  const matchPercentage = matchCount / keywords.length;
  return Math.round(70 + (matchPercentage * 30));
}

function extractSnippet(text: string | null, term: string): string | undefined {
  if (!text) return undefined;
  
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);
  
  if (index === -1) return undefined;
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + term.length + 100);
  
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

function buildActionRequired(req: DocumentRequirement): string {
  const parts: string[] = [];
  
  if (req.document_type) {
    parts.push(`Create ${req.document_type} document`);
  }
  
  if (req.title_keywords && req.title_keywords.length > 0) {
    parts.push(`covering: ${req.title_keywords.join(', ')}`);
  }
  
  if (req.content_must_include && req.content_must_include.length > 0) {
    parts.push(`Include: ${req.content_must_include.join(', ')}`);
  }
  
  if (req.folder_code) {
    parts.push(`Store in: ${req.folder_code} folder`);
  }

  if (req.min_count > 1) {
    parts.push(`Need at least ${req.min_count} documents`);
  }
  
  return parts.join('. ');
}

function estimateEffort(req: DocumentRequirement, foundCount: number): number {
  const missingCount = req.min_count - foundCount;
  
  // Base hours per document type
  const hoursPerDoc: Record<string, number> = {
    'POL': 8,
    'PRC': 6,
    'SWP': 4,
    'FRM': 2,
    'TRN': 6,
    'PLN': 8,
    'RPT': 3,
    'MIN': 1,
    'CRT': 2,
    'MAN': 16,
  };
  
  const baseHours = hoursPerDoc[req.document_type || 'PRC'] || 4;
  return missingCount * baseHours;
}

function generateRecommendations(
  scores: DocumentComplianceScore[],
  gaps: DocumentGap[]
): string[] {
  const recommendations: string[] = [];
  
  // Find lowest scoring elements
  const lowElements = scores
    .filter(s => s.percentage < 60)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);
  
  if (lowElements.length > 0) {
    recommendations.push(
      `Focus on improving Element ${lowElements.map(e => e.element_number).join(', ')}: ${lowElements.map(e => e.element_name).join(', ')}`
    );
  }
  
  // Count gaps by type
  const swpGaps = gaps.filter(g => g.suggested_document_type === 'SWP');
  if (swpGaps.length >= 5) {
    recommendations.push(
      `Create ${swpGaps.length} Safe Work Procedures for high-risk tasks`
    );
  }
  
  const policyGaps = gaps.filter(g => g.suggested_document_type === 'POL');
  if (policyGaps.length > 0) {
    recommendations.push(
      `Develop ${policyGaps.length} missing policy documents`
    );
  }
  
  // Check for critical gaps
  const criticalCount = gaps.filter(g => g.severity === 'critical').length;
  if (criticalCount > 0) {
    recommendations.push(
      `Address ${criticalCount} critical document gaps immediately`
    );
  }
  
  return recommendations;
}

