/**
 * COR 2020 Compliance Scoring Engine
 * 
 * Based on the Certificate of Recognition (COR) 2020 audit standard.
 * Calculates audit readiness across all 14 COR elements with weighted scoring.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EvidenceRequirement {
  id: string;
  description: string;
  evidence_type: 'form' | 'document' | 'training' | 'interview' | 'observation';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed';
  minimum_samples: number;
  point_value: number;
  form_codes?: string[]; // Form codes that satisfy this requirement
  document_types?: string[]; // Document types that satisfy this requirement
}

export interface Evidence {
  id: string;
  requirement_id: string;
  evidence_type: string;
  date: string;
  description: string;
  reference: string;
}

export interface Gap {
  requirement_id: string;
  requirement_description: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  action_required: string;
  estimated_effort_hours: number;
}

export interface ElementScore {
  element_number: number;
  element_name: string;
  max_points: number;
  earned_points: number;
  percentage: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  required_evidence: EvidenceRequirement[];
  found_evidence: Evidence[];
  gaps: Gap[];
}

export interface OverallScore {
  overall_percentage: number;
  overall_status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  element_scores: ElementScore[];
  ready_for_audit: boolean;
  critical_gaps_count: number;
  major_gaps_count: number;
  minor_gaps_count: number;
  total_gaps_count: number;
  estimated_hours_to_ready: number;
  projected_ready_date: string;
  last_calculated: string;
}

// ============================================================================
// COR ELEMENT WEIGHTS (COR 2020 Standard)
// ============================================================================

const ELEMENT_WEIGHTS: Record<number, number> = {
  1: 1.2,   // Health & Safety Management System (weighted heavier)
  2: 1.2,   // Hazard Identification & Assessment (weighted heavier)
  3: 1.2,   // Hazard Control (weighted heavier)
  4: 1.1,   // Competency & Training (weighted heavier)
  5: 1.0,   // Workplace Behavior
  6: 1.0,   // Personal Protective Equipment
  7: 1.0,   // Preventative Maintenance
  8: 1.0,   // Training & Communication
  9: 1.0,   // Workplace Inspections
  10: 1.1,  // Incident Investigation (weighted heavier)
  11: 1.1,  // Emergency Preparedness (weighted heavier)
  12: 1.0,  // Statistics & Records
  13: 1.0,  // Regulatory Awareness
  14: 1.0,  // Management System Review
};

// ============================================================================
// ELEMENT REQUIREMENTS DEFINITIONS
// ============================================================================

function getElement1Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem1_policy',
      description: 'Written H&S Policy signed by top management',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      document_types: ['health_safety_policy', 'safety_policy'],
      form_codes: ['safety_policy', 'policy_acknowledgment'],
    },
    {
      id: 'elem1_roles',
      description: 'Roles & Responsibilities documented for all levels',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      document_types: ['roles_responsibilities', 'job_descriptions'],
      form_codes: ['role_responsibility_matrix'],
    },
    {
      id: 'elem1_objectives',
      description: 'H&S objectives and targets established',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      document_types: ['safety_objectives', 'safety_targets'],
      form_codes: ['annual_safety_plan', 'safety_objectives'],
    },
    {
      id: 'elem1_mgmt_review',
      description: 'Management review meetings (quarterly)',
      evidence_type: 'form',
      frequency: 'quarterly',
      minimum_samples: 4,
      point_value: 15,
      form_codes: ['management_review', 'safety_meeting_minutes', 'annual_review'],
    },
  ];
}

function getElement2Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem2_daily_ha',
      description: 'Daily hazard assessments for active jobsites',
      evidence_type: 'form',
      frequency: 'daily',
      minimum_samples: 20, // At least 20 in the last month
      point_value: 20,
      form_codes: ['hazard_assessment', 'jha_form', 'job_hazard_analysis'],
    },
    {
      id: 'elem2_reporting',
      description: 'Hazard reporting system accessible to all workers',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 5,
      point_value: 10,
      form_codes: ['hazard_reporting', 'hazard_report', 'safety_concern'],
    },
    {
      id: 'elem2_review',
      description: 'Monthly review of hazard assessments',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['hazard_review', 'ha_summary', 'monthly_safety_review'],
    },
    {
      id: 'elem2_controls',
      description: 'Hazards documented with control measures',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 10,
      point_value: 10,
      form_codes: ['hazard_control', 'risk_assessment', 'hazard_assessment'],
    },
  ];
}

function getElement3Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem3_hierarchy',
      description: 'Hierarchy of controls applied to hazards',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 10,
      point_value: 15,
      form_codes: ['hazard_control', 'control_implementation', 'risk_mitigation'],
    },
    {
      id: 'elem3_swp',
      description: 'Safe work practices documented',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 5,
      point_value: 15,
      form_codes: ['swp_form', 'safe_work_practice', 'sop_acknowledgment'],
    },
    {
      id: 'elem3_sjp',
      description: 'Safe job procedures for critical tasks',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 5,
      point_value: 10,
      form_codes: ['sjp_form', 'critical_task_analysis', 'task_analysis'],
    },
    {
      id: 'elem3_verification',
      description: 'Control effectiveness verified',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['control_verification', 'workplace_inspection', 'safety_audit'],
    },
  ];
}

function getElement4Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem4_orientation',
      description: 'New worker orientation completed',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 5,
      point_value: 15,
      form_codes: ['orientation_checklist', 'new_hire_orientation', 'worker_orientation'],
    },
    {
      id: 'elem4_competency',
      description: 'Competency assessments for critical tasks',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 5,
      point_value: 15,
      form_codes: ['competency_assessment', 'skills_verification', 'training_record'],
    },
    {
      id: 'elem4_matrix',
      description: 'Training matrix maintained',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['training_matrix', 'training_plan'],
    },
    {
      id: 'elem4_records',
      description: 'Training records for all workers',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 10,
      point_value: 10,
      form_codes: ['training_record', 'training_attendance', 'certification_record'],
    },
  ];
}

function getElement5Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem5_rules',
      description: 'Company safety rules documented',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      form_codes: ['safety_rules', 'company_rules', 'safety_handbook'],
    },
    {
      id: 'elem5_communication',
      description: 'Rules communicated to all workers',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 5,
      point_value: 10,
      form_codes: ['rule_acknowledgment', 'safety_rules_sign_off', 'orientation_checklist'],
    },
    {
      id: 'elem5_enforcement',
      description: 'Progressive discipline system documented',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['disciplinary_action', 'progressive_discipline', 'rule_violation_report'],
    },
    {
      id: 'elem5_recognition',
      description: 'Safety recognition program',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['safety_recognition', 'worker_recognition', 'safety_award'],
    },
  ];
}

function getElement6Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem6_assessment',
      description: 'PPE hazard assessment conducted',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      form_codes: ['ppe_assessment', 'ppe_hazard_assessment', 'ppe_matrix'],
    },
    {
      id: 'elem6_issuance',
      description: 'PPE issuance documented',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 10,
      point_value: 10,
      form_codes: ['ppe_issuance', 'ppe_sign_out', 'equipment_issuance'],
    },
    {
      id: 'elem6_training',
      description: 'PPE training provided',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 5,
      point_value: 10,
      form_codes: ['ppe_training', 'training_record', 'ppe_orientation'],
    },
    {
      id: 'elem6_inspection',
      description: 'PPE inspection records',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['ppe_inspection', 'equipment_inspection', 'pre_use_inspection'],
    },
  ];
}

function getElement7Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem7_program',
      description: 'Preventative maintenance program documented',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      form_codes: ['maintenance_program', 'pm_schedule', 'maintenance_plan'],
    },
    {
      id: 'elem7_schedule',
      description: 'Maintenance schedule maintained',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['maintenance_log', 'maintenance_schedule', 'equipment_maintenance'],
    },
    {
      id: 'elem7_inspection',
      description: 'Equipment inspections documented',
      evidence_type: 'form',
      frequency: 'weekly',
      minimum_samples: 12,
      point_value: 10,
      form_codes: ['equipment_inspection', 'pre_use_inspection', 'vehicle_inspection'],
    },
    {
      id: 'elem7_deficiency',
      description: 'Deficiency correction records',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['deficiency_report', 'equipment_repair', 'maintenance_request'],
    },
  ];
}

function getElement8Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem8_program',
      description: 'Formal training program documented',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      form_codes: ['training_program', 'training_plan', 'annual_training_schedule'],
    },
    {
      id: 'elem8_toolbox',
      description: 'Toolbox talks conducted regularly',
      evidence_type: 'form',
      frequency: 'weekly',
      minimum_samples: 12,
      point_value: 15,
      form_codes: ['toolbox_talk', 'safety_talk', 'tailgate_meeting'],
    },
    {
      id: 'elem8_records',
      description: 'Training records maintained',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 10,
      point_value: 10,
      form_codes: ['training_record', 'training_attendance', 'training_sign_in'],
    },
    {
      id: 'elem8_evaluation',
      description: 'Training effectiveness evaluated',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 2,
      point_value: 10,
      form_codes: ['training_evaluation', 'competency_assessment', 'training_feedback'],
    },
  ];
}

function getElement9Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem9_schedule',
      description: 'Inspection schedule maintained',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['inspection_schedule', 'inspection_plan'],
    },
    {
      id: 'elem9_workplace',
      description: 'Regular workplace inspections conducted',
      evidence_type: 'form',
      frequency: 'weekly',
      minimum_samples: 12,
      point_value: 20,
      form_codes: ['workplace_inspection', 'site_inspection', 'safety_inspection'],
    },
    {
      id: 'elem9_corrective',
      description: 'Corrective actions tracked',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 5,
      point_value: 10,
      form_codes: ['corrective_action', 'inspection_corrective_action', 'action_item'],
    },
    {
      id: 'elem9_participation',
      description: 'Worker participation in inspections',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['workplace_inspection', 'joint_inspection', 'jhsc_inspection'],
    },
  ];
}

function getElement10Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem10_procedure',
      description: 'Incident investigation procedure documented',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['investigation_procedure', 'incident_policy'],
    },
    {
      id: 'elem10_reporting',
      description: 'Incident reporting system in place',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 3,
      point_value: 15,
      form_codes: ['incident_report', 'near_miss_report', 'accident_report'],
    },
    {
      id: 'elem10_investigation',
      description: 'Incidents investigated with root cause analysis',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 2,
      point_value: 15,
      form_codes: ['incident_investigation', 'root_cause_analysis', 'investigation_report'],
    },
    {
      id: 'elem10_corrective',
      description: 'Corrective actions implemented',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['corrective_action', 'incident_followup', 'action_closeout'],
    },
  ];
}

function getElement11Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem11_plan',
      description: 'Written emergency response plan',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      form_codes: ['emergency_plan', 'emergency_response_plan', 'erp'],
    },
    {
      id: 'elem11_drills',
      description: 'Emergency drills conducted',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 2,
      point_value: 15,
      form_codes: ['emergency_drill', 'fire_drill_log', 'evacuation_drill'],
    },
    {
      id: 'elem11_training',
      description: 'Emergency training provided',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 5,
      point_value: 10,
      form_codes: ['emergency_training', 'first_aid_training', 'fire_safety_training'],
    },
    {
      id: 'elem11_equipment',
      description: 'Emergency equipment inspected',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 10,
      form_codes: ['fire_extinguisher_inspection', 'first_aid_inspection', 'emergency_equipment'],
    },
  ];
}

function getElement12Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem12_tracking',
      description: 'Safety statistics tracked',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 3,
      point_value: 15,
      form_codes: ['safety_statistics', 'monthly_stats', 'kpi_report'],
    },
    {
      id: 'elem12_injury_log',
      description: 'Injury log maintained',
      evidence_type: 'form',
      frequency: 'as_needed',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['injury_log', 'first_aid_log', 'wsib_form_7'],
    },
    {
      id: 'elem12_trends',
      description: 'Trend analysis conducted',
      evidence_type: 'form',
      frequency: 'quarterly',
      minimum_samples: 2,
      point_value: 10,
      form_codes: ['trend_analysis', 'quarterly_review', 'safety_metrics'],
    },
    {
      id: 'elem12_records',
      description: 'Records retention system',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['records_retention', 'document_control'],
    },
  ];
}

function getElement13Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem13_awareness',
      description: 'Regulatory requirements identified',
      evidence_type: 'document',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      form_codes: ['compliance_checklist', 'regulatory_register', 'legal_requirements'],
    },
    {
      id: 'elem13_access',
      description: 'Legislation accessible to workers',
      evidence_type: 'observation',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['legislation_access', 'regulation_posting'],
    },
    {
      id: 'elem13_updates',
      description: 'Regulatory updates tracked',
      evidence_type: 'form',
      frequency: 'quarterly',
      minimum_samples: 2,
      point_value: 10,
      form_codes: ['regulatory_update_log', 'legislation_review', 'compliance_update'],
    },
    {
      id: 'elem13_compliance',
      description: 'Compliance verified',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 10,
      form_codes: ['compliance_audit', 'regulatory_inspection', 'compliance_review'],
    },
  ];
}

function getElement14Requirements(): EvidenceRequirement[] {
  return [
    {
      id: 'elem14_review',
      description: 'Annual management system review',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 1,
      point_value: 15,
      form_codes: ['annual_review', 'management_review', 'system_review'],
    },
    {
      id: 'elem14_meetings',
      description: 'Regular safety meetings held',
      evidence_type: 'form',
      frequency: 'monthly',
      minimum_samples: 6,
      point_value: 15,
      form_codes: ['safety_meeting_minutes', 'jhsc_meeting', 'safety_committee'],
    },
    {
      id: 'elem14_improvement',
      description: 'Continuous improvement documented',
      evidence_type: 'form',
      frequency: 'quarterly',
      minimum_samples: 2,
      point_value: 10,
      form_codes: ['improvement_plan', 'action_plan', 'corrective_action'],
    },
    {
      id: 'elem14_commitment',
      description: 'Management commitment demonstrated',
      evidence_type: 'form',
      frequency: 'annual',
      minimum_samples: 2,
      point_value: 10,
      form_codes: ['management_walkthrough', 'leadership_tour', 'visible_leadership'],
    },
  ];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatus(percentage: number): 'excellent' | 'good' | 'needs_improvement' | 'critical' {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 80) return 'good';
  if (percentage >= 60) return 'needs_improvement';
  return 'critical';
}

function getSeverity(shortfall: number, required: number): 'critical' | 'major' | 'minor' {
  const ratio = shortfall / required;
  if (ratio >= 0.75) return 'critical';
  if (ratio >= 0.5) return 'major';
  return 'minor';
}

function calculateEstimatedEffort(requirement: EvidenceRequirement, shortfall: number): number {
  // Base effort per item based on evidence type
  const baseEffortHours: Record<string, number> = {
    'document': 4,      // Documents take longer to create
    'form': 0.25,       // Forms are quick (15 min avg)
    'training': 2,      // Training records
    'interview': 0.5,   // Interview preparation
    'observation': 0.5, // Observation records
  };

  const baseEffort = baseEffortHours[requirement.evidence_type] || 0.5;

  // Multiply by shortfall, with minimum of base effort
  return Math.max(baseEffort, shortfall * baseEffort);
}

function getWorkDaysInPeriod(startDate: Date, endDate: Date): number {
  let workDays = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workDays;
}

function calculateProjectedReadyDate(scores: ElementScore[]): string {
  const totalHoursNeeded = scores
    .flatMap(s => s.gaps)
    .reduce((sum, g) => sum + g.estimated_effort_hours, 0);

  // Assume 10 hours per week of dedicated effort
  const weeksNeeded = Math.ceil(totalHoursNeeded / 10);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + (weeksNeeded * 7));

  // Add buffer of 1 week for review and adjustments
  projectedDate.setDate(projectedDate.getDate() + 7);

  return projectedDate.toISOString().split('T')[0];
}

// ============================================================================
// GENERIC ELEMENT SCORING FUNCTION
// ============================================================================

async function scoreElement(
  companyId: string,
  elementNumber: number,
  elementName: string,
  requirements: EvidenceRequirement[],
  maxPoints: number,
  lookbackDays: number = 365
): Promise<ElementScore> {
  const supabase = await createClient();
  const evidence: Evidence[] = [];
  const gaps: Gap[] = [];
  let earnedPoints = 0;

  const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  for (const req of requirements) {
    // Query for evidence matching this requirement
    const allFormCodes = req.form_codes || [];

    if (allFormCodes.length === 0) {
      continue;
    }

    // Get form templates matching these codes
    const { data: templates } = await supabase
      .from('form_templates')
      .select('id, form_code, name')
      .in('form_code', allFormCodes);

    const templateIds = templates?.map(t => t.id) || [];

    if (templateIds.length === 0) {
      // No matching templates found, create gap
      gaps.push({
        requirement_id: req.id,
        requirement_description: req.description,
        severity: 'critical',
        description: `No forms configured for: ${req.description}`,
        action_required: `Create or configure forms for: ${allFormCodes.join(', ')}`,
        estimated_effort_hours: 4,
      });
      continue;
    }

    // Query submissions for these templates
    let query = supabase
      .from('form_submissions')
      .select(`
        id,
        form_number,
        status,
        submitted_at,
        created_at,
        form_template:form_templates(id, form_code, name)
      `)
      .eq('company_id', companyId)
      .in('form_template_id', templateIds)
      .in('status', ['submitted', 'approved'])
      .gte('created_at', lookbackDate.toISOString())
      .order('created_at', { ascending: false });

    const { data: submissions } = await query;

    const found = submissions?.length || 0;
    const required = req.minimum_samples;

    // Type for form_template relation from Supabase join
    interface FormTemplateRelation {
      id?: string;
      form_code?: string;
      name?: string;
    }

    // Helper to safely extract relation data
    function getRelation<T>(data: unknown): T | null {
      if (!data) return null;
      if (Array.isArray(data)) return (data[0] as T) || null;
      return data as T;
    }

    if (found >= required) {
      // Full points for meeting requirement
      earnedPoints += req.point_value;

      // Add evidence samples (up to 5)
      submissions?.slice(0, 5).forEach(sub => {
        const template = getRelation<FormTemplateRelation>(sub.form_template);
        evidence.push({
          id: sub.id,
          requirement_id: req.id,
          evidence_type: req.evidence_type,
          date: sub.submitted_at || sub.created_at,
          description: template?.name || req.description,
          reference: sub.form_number,
        });
      });
    } else if (found > 0) {
      // Partial points
      const partialRatio = found / required;
      earnedPoints += Math.round(req.point_value * partialRatio);

      // Add found evidence
      submissions?.forEach(sub => {
        const template = getRelation<FormTemplateRelation>(sub.form_template);
        evidence.push({
          id: sub.id,
          requirement_id: req.id,
          evidence_type: req.evidence_type,
          date: sub.submitted_at || sub.created_at,
          description: template?.name || req.description,
          reference: sub.form_number,
        });
      });

      // Add gap for shortfall
      const shortfall = required - found;
      gaps.push({
        requirement_id: req.id,
        requirement_description: req.description,
        severity: getSeverity(shortfall, required),
        description: `Only ${found}/${required} ${req.description.toLowerCase()} found`,
        action_required: `Complete ${shortfall} more ${req.evidence_type === 'form' ? 'submissions' : 'documents'} for: ${req.description}`,
        estimated_effort_hours: calculateEstimatedEffort(req, shortfall),
      });
    } else {
      // No evidence found
      gaps.push({
        requirement_id: req.id,
        requirement_description: req.description,
        severity: 'critical',
        description: `No ${req.description.toLowerCase()} found`,
        action_required: `Complete ${required} ${req.evidence_type === 'form' ? 'submissions' : 'documents'} for: ${req.description}`,
        estimated_effort_hours: calculateEstimatedEffort(req, required),
      });
    }
  }

  const percentage = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;

  return {
    element_number: elementNumber,
    element_name: elementName,
    max_points: maxPoints,
    earned_points: earnedPoints,
    percentage,
    status: getStatus(percentage),
    required_evidence: requirements,
    found_evidence: evidence,
    gaps,
  };
}

// ============================================================================
// INDIVIDUAL ELEMENT SCORING FUNCTIONS
// ============================================================================

export async function scoreElement1(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    1,
    'Health & Safety Management System',
    getElement1Requirements(),
    50 // Max points for Element 1
  );
}

export async function scoreElement2(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    2,
    'Hazard Identification & Assessment',
    getElement2Requirements(),
    50,
    90 // Look back 90 days for daily assessments
  );
}

export async function scoreElement3(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    3,
    'Hazard Control',
    getElement3Requirements(),
    50
  );
}

export async function scoreElement4(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    4,
    'Competency & Training',
    getElement4Requirements(),
    50
  );
}

export async function scoreElement5(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    5,
    'Workplace Behavior',
    getElement5Requirements(),
    45
  );
}

export async function scoreElement6(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    6,
    'Personal Protective Equipment',
    getElement6Requirements(),
    45
  );
}

export async function scoreElement7(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    7,
    'Preventative Maintenance',
    getElement7Requirements(),
    45
  );
}

export async function scoreElement8(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    8,
    'Training & Communication',
    getElement8Requirements(),
    50
  );
}

export async function scoreElement9(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    9,
    'Workplace Inspections',
    getElement9Requirements(),
    50,
    90 // Look back 90 days for inspections
  );
}

export async function scoreElement10(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    10,
    'Incident Investigation',
    getElement10Requirements(),
    50
  );
}

export async function scoreElement11(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    11,
    'Emergency Preparedness',
    getElement11Requirements(),
    50
  );
}

export async function scoreElement12(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    12,
    'Statistics & Records',
    getElement12Requirements(),
    45
  );
}

export async function scoreElement13(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    13,
    'Regulatory Awareness',
    getElement13Requirements(),
    45
  );
}

export async function scoreElement14(companyId: string): Promise<ElementScore> {
  return scoreElement(
    companyId,
    14,
    'Management System Review',
    getElement14Requirements(),
    50
  );
}

// ============================================================================
// OVERALL SCORING FUNCTION
// ============================================================================

export async function calculateOverallScore(companyId: string): Promise<OverallScore> {
  // Score all 14 elements in parallel
  const elementScores = await Promise.all([
    scoreElement1(companyId),
    scoreElement2(companyId),
    scoreElement3(companyId),
    scoreElement4(companyId),
    scoreElement5(companyId),
    scoreElement6(companyId),
    scoreElement7(companyId),
    scoreElement8(companyId),
    scoreElement9(companyId),
    scoreElement10(companyId),
    scoreElement11(companyId),
    scoreElement12(companyId),
    scoreElement13(companyId),
    scoreElement14(companyId),
  ]);

  // Calculate weighted overall score
  let totalWeightedPoints = 0;
  let totalMaxWeightedPoints = 0;

  elementScores.forEach(score => {
    const weight = ELEMENT_WEIGHTS[score.element_number] || 1.0;
    totalWeightedPoints += score.earned_points * weight;
    totalMaxWeightedPoints += score.max_points * weight;
  });

  const overallPercentage = totalMaxWeightedPoints > 0
    ? (totalWeightedPoints / totalMaxWeightedPoints) * 100
    : 0;

  // Count gaps by severity
  const allGaps = elementScores.flatMap(e => e.gaps);
  const criticalGaps = allGaps.filter(g => g.severity === 'critical');
  const majorGaps = allGaps.filter(g => g.severity === 'major');
  const minorGaps = allGaps.filter(g => g.severity === 'minor');

  // Calculate total effort needed
  const totalEffortHours = allGaps.reduce((sum, g) => sum + g.estimated_effort_hours, 0);

  // Determine audit readiness
  const readyForAudit = overallPercentage >= 80 && criticalGaps.length === 0;

  return {
    overall_percentage: Math.round(overallPercentage * 10) / 10,
    overall_status: getStatus(overallPercentage),
    element_scores: elementScores,
    ready_for_audit: readyForAudit,
    critical_gaps_count: criticalGaps.length,
    major_gaps_count: majorGaps.length,
    minor_gaps_count: minorGaps.length,
    total_gaps_count: allGaps.length,
    estimated_hours_to_ready: Math.round(totalEffortHours),
    projected_ready_date: calculateProjectedReadyDate(elementScores),
    last_calculated: new Date().toISOString(),
  };
}

// ============================================================================
// QUICK SCORE FUNCTION (for dashboard)
// ============================================================================

export async function getQuickScore(companyId: string): Promise<{
  overall_percentage: number;
  overall_status: string;
  ready_for_audit: boolean;
  critical_gaps: number;
  projected_ready_date: string;
}> {
  const fullScore = await calculateOverallScore(companyId);

  return {
    overall_percentage: fullScore.overall_percentage,
    overall_status: fullScore.overall_status,
    ready_for_audit: fullScore.ready_for_audit,
    critical_gaps: fullScore.critical_gaps_count,
    projected_ready_date: fullScore.projected_ready_date,
  };
}

// ============================================================================
// ELEMENT REQUIREMENTS GETTER
// ============================================================================

export function getElementRequirements(elementNumber: number): EvidenceRequirement[] {
  const requirementGetters: Record<number, () => EvidenceRequirement[]> = {
    1: getElement1Requirements,
    2: getElement2Requirements,
    3: getElement3Requirements,
    4: getElement4Requirements,
    5: getElement5Requirements,
    6: getElement6Requirements,
    7: getElement7Requirements,
    8: getElement8Requirements,
    9: getElement9Requirements,
    10: getElement10Requirements,
    11: getElement11Requirements,
    12: getElement12Requirements,
    13: getElement13Requirements,
    14: getElement14Requirements,
  };

  // Safe: elementNumber is validated against a known set of COR element numbers (1-14)
  // eslint-disable-next-line security/detect-object-injection
  return requirementGetters[elementNumber]?.() || [];
}

// ============================================================================
// ALL REQUIREMENTS GETTER
// ============================================================================

export function getAllRequirements(): Record<number, EvidenceRequirement[]> {
  return {
    1: getElement1Requirements(),
    2: getElement2Requirements(),
    3: getElement3Requirements(),
    4: getElement4Requirements(),
    5: getElement5Requirements(),
    6: getElement6Requirements(),
    7: getElement7Requirements(),
    8: getElement8Requirements(),
    9: getElement9Requirements(),
    10: getElement10Requirements(),
    11: getElement11Requirements(),
    12: getElement12Requirements(),
    13: getElement13Requirements(),
    14: getElement14Requirements(),
  };
}

// ============================================================================
// SCORE CACHING
// ============================================================================

export interface CachedScore {
  id: string;
  company_id: string;
  score_data: OverallScore;
  calculated_at: string;
  expires_at: string;
}

export async function getCachedScore(companyId: string): Promise<OverallScore | null> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from('audit_scores')
    .select('*')
    .eq('company_id', companyId)
    .gte('expires_at', new Date().toISOString())
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (cached?.score_data) {
    return cached.score_data as OverallScore;
  }

  return null;
}

export async function saveScoreToCache(companyId: string, score: OverallScore): Promise<void> {
  const supabase = await createClient();

  // Score expires at midnight tonight
  const expiresAt = new Date();
  expiresAt.setHours(23, 59, 59, 999);

  await supabase
    .from('audit_scores')
    .upsert({
      company_id: companyId,
      score_data: score,
      calculated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'company_id',
    });
}

export async function getOrCalculateScore(companyId: string, forceRefresh: boolean = false): Promise<OverallScore> {
  if (!forceRefresh) {
    const cached = await getCachedScore(companyId);
    if (cached) {
      return cached;
    }
  }

  const score = await calculateOverallScore(companyId);

  // Try to cache, but don't fail if caching fails
  try {
    await saveScoreToCache(companyId, score);
  } catch (e) {
    console.warn('Failed to cache score:', e);
  }

  return score;
}
