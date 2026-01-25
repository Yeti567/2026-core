/**
 * Element 7 - Preventive Maintenance & Inspection
 * 
 * COR audit scoring module for maintenance compliance
 * Integrates with maintenance records, schedules, and documentation
 */

import { 
  findMaintenanceEvidenceForAudit, 
  getMaintenanceEvidenceSummary,
  type MaintenanceEvidence 
} from './maintenance-evidence-finder';

// ============================================================================
// TYPES
// ============================================================================

export interface Gap {
  requirement_id: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  description: string;
  action_required: string;
  estimated_effort_hours: number;
  affected_equipment?: string[];
  due_date?: string;
}

export interface Element7Score {
  element_number: 7;
  element_name: string;
  max_points: number;
  earned_points: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Detailed scores
  requirement_scores: {
    requirement_id: string;
    requirement_name: string;
    max_points: number;
    earned_points: number;
    percentage: number;
    notes: string;
  }[];
  
  // Evidence summary
  maintenance_evidence: MaintenanceEvidence[];
  evidence_summary: {
    total_equipment: number;
    equipment_with_schedules: number;
    equipment_with_records: number;
    total_records_12mo: number;
    total_attachments: number;
    average_compliance: number;
  };
  
  // Gaps and recommendations
  gaps: Gap[];
  recommendations: string[];
  
  // Strengths
  strengths: string[];
}

// ============================================================================
// SCORING CONFIGURATION
// ============================================================================

const ELEMENT_7_REQUIREMENTS = {
  schedules: {
    id: 'elem7_schedules',
    name: 'Maintenance Schedules Exist',
    max_points: 20,
    description: 'All equipment has documented maintenance schedules'
  },
  preventive: {
    id: 'elem7_preventive',
    name: 'Preventive Maintenance Performed',
    max_points: 30,
    description: 'Regular preventive maintenance is conducted as scheduled'
  },
  documentation: {
    id: 'elem7_documentation',
    name: 'Records & Documentation',
    max_points: 20,
    description: 'Maintenance activities are documented with receipts/reports'
  },
  compliance: {
    id: 'elem7_compliance',
    name: 'Schedule Compliance',
    max_points: 30,
    description: 'Maintenance is completed on time per schedules'
  }
};

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Score Element 7 with comprehensive maintenance analysis
 */
export async function scoreElement7WithMaintenance(
  companyId: string
): Promise<Element7Score> {
  const maintenanceEvidence = await findMaintenanceEvidenceForAudit(companyId, 7);
  const summary = await getMaintenanceEvidenceSummary(companyId);
  
  let totalPoints = 0;
  let earnedPoints = 0;
  const gaps: Gap[] = [];
  const recommendations: string[] = [];
  const strengths: string[] = [];
  const requirementScores: Element7Score['requirement_scores'] = [];
  
  // ============================================================================
  // Requirement 1: Maintenance schedules exist for all equipment (20 points)
  // ============================================================================
  const equipmentWithSchedules = maintenanceEvidence.filter(e => e.has_maintenance_schedule).length;
  const totalEquipment = maintenanceEvidence.length;
  
  let schedulePoints = 0;
  let scheduleNotes = '';
  
  if (totalEquipment > 0) {
    const schedulePercentage = (equipmentWithSchedules / totalEquipment) * 100;
    schedulePoints = Math.round((schedulePercentage / 100) * ELEMENT_7_REQUIREMENTS.schedules.max_points);
    scheduleNotes = `${equipmentWithSchedules}/${totalEquipment} equipment have maintenance schedules (${schedulePercentage.toFixed(0)}%)`;
    
    if (schedulePercentage >= 90) {
      strengths.push(`${schedulePercentage.toFixed(0)}% of equipment have documented maintenance schedules`);
    }
    
    if (equipmentWithSchedules < totalEquipment) {
      const missingSchedules = maintenanceEvidence.filter(e => !e.has_maintenance_schedule);
      gaps.push({
        requirement_id: 'elem7_schedules',
        severity: missingSchedules.length > totalEquipment / 2 ? 'major' : 'minor',
        description: `${totalEquipment - equipmentWithSchedules} pieces of equipment lack maintenance schedules`,
        action_required: 'Create maintenance schedules for all equipment including inspection frequencies and preventive maintenance intervals',
        estimated_effort_hours: (totalEquipment - equipmentWithSchedules) * 1,
        affected_equipment: missingSchedules.map(e => e.equipment_code)
      });
      
      recommendations.push(`Create maintenance schedules for: ${missingSchedules.slice(0, 5).map(e => e.equipment_code).join(', ')}${missingSchedules.length > 5 ? ` and ${missingSchedules.length - 5} more` : ''}`);
    }
  } else {
    scheduleNotes = 'No equipment found in inventory';
    gaps.push({
      requirement_id: 'elem7_schedules',
      severity: 'critical',
      description: 'No equipment inventory found',
      action_required: 'Create equipment inventory and establish maintenance schedules',
      estimated_effort_hours: 20
    });
  }
  
  earnedPoints += schedulePoints;
  totalPoints += ELEMENT_7_REQUIREMENTS.schedules.max_points;
  
  requirementScores.push({
    requirement_id: ELEMENT_7_REQUIREMENTS.schedules.id,
    requirement_name: ELEMENT_7_REQUIREMENTS.schedules.name,
    max_points: ELEMENT_7_REQUIREMENTS.schedules.max_points,
    earned_points: schedulePoints,
    percentage: (schedulePoints / ELEMENT_7_REQUIREMENTS.schedules.max_points) * 100,
    notes: scheduleNotes
  });
  
  // ============================================================================
  // Requirement 2: Preventive maintenance performed (30 points)
  // ============================================================================
  const avgPreventiveCount = totalEquipment > 0
    ? maintenanceEvidence.reduce((sum, e) => sum + e.preventive_maintenance_count, 0) / totalEquipment
    : 0;
  
  const avgInspectionCount = totalEquipment > 0
    ? maintenanceEvidence.reduce((sum, e) => sum + e.inspection_count, 0) / totalEquipment
    : 0;
  
  let preventivePoints = 0;
  let preventiveNotes = '';
  
  if (avgPreventiveCount >= 4) {
    // At least quarterly preventive maintenance
    preventivePoints = ELEMENT_7_REQUIREMENTS.preventive.max_points;
    preventiveNotes = `Excellent: Average ${avgPreventiveCount.toFixed(1)} preventive maintenance records per equipment annually`;
    strengths.push(`Strong preventive maintenance program with average ${avgPreventiveCount.toFixed(1)} services per equipment per year`);
  } else if (avgPreventiveCount >= 2) {
    // At least semi-annual
    preventivePoints = 20;
    preventiveNotes = `Good: Average ${avgPreventiveCount.toFixed(1)} preventive maintenance records per equipment`;
    gaps.push({
      requirement_id: 'elem7_preventive',
      severity: 'minor',
      description: 'Preventive maintenance frequency could be improved',
      action_required: 'Increase preventive maintenance to at least quarterly for critical equipment',
      estimated_effort_hours: 10
    });
    recommendations.push('Consider increasing preventive maintenance frequency to quarterly intervals');
  } else if (avgPreventiveCount >= 1) {
    preventivePoints = 10;
    preventiveNotes = `Fair: Average ${avgPreventiveCount.toFixed(1)} preventive maintenance records per equipment`;
    gaps.push({
      requirement_id: 'elem7_preventive',
      severity: 'major',
      description: 'Insufficient preventive maintenance frequency',
      action_required: 'Implement regular preventive maintenance program with at least quarterly services',
      estimated_effort_hours: 15
    });
  } else {
    preventiveNotes = 'Poor: Little to no preventive maintenance performed';
    gaps.push({
      requirement_id: 'elem7_preventive',
      severity: 'critical',
      description: 'Little to no preventive maintenance performed in the last 12 months',
      action_required: 'Urgently implement a preventive maintenance program for all equipment',
      estimated_effort_hours: 25
    });
    recommendations.push('Priority: Establish a systematic preventive maintenance program');
  }
  
  earnedPoints += preventivePoints;
  totalPoints += ELEMENT_7_REQUIREMENTS.preventive.max_points;
  
  requirementScores.push({
    requirement_id: ELEMENT_7_REQUIREMENTS.preventive.id,
    requirement_name: ELEMENT_7_REQUIREMENTS.preventive.name,
    max_points: ELEMENT_7_REQUIREMENTS.preventive.max_points,
    earned_points: preventivePoints,
    percentage: (preventivePoints / ELEMENT_7_REQUIREMENTS.preventive.max_points) * 100,
    notes: preventiveNotes
  });
  
  // ============================================================================
  // Requirement 3: Records with documentation (20 points)
  // ============================================================================
  const avgReceiptsPerEquipment = totalEquipment > 0
    ? maintenanceEvidence.reduce((sum, e) => sum + e.receipts_count, 0) / totalEquipment
    : 0;
  
  const avgAttachmentsPerEquipment = totalEquipment > 0
    ? maintenanceEvidence.reduce((sum, e) => sum + e.total_attachments, 0) / totalEquipment
    : 0;
  
  let documentationPoints = 0;
  let documentationNotes = '';
  
  if (avgReceiptsPerEquipment >= 4) {
    documentationPoints = ELEMENT_7_REQUIREMENTS.documentation.max_points;
    documentationNotes = `Excellent: Average ${avgReceiptsPerEquipment.toFixed(1)} receipts/documents per equipment`;
    strengths.push(`Comprehensive documentation with ${avgReceiptsPerEquipment.toFixed(1)} receipts per equipment on average`);
  } else if (avgReceiptsPerEquipment >= 2) {
    documentationPoints = 15;
    documentationNotes = `Good: Average ${avgReceiptsPerEquipment.toFixed(1)} receipts/documents per equipment`;
    gaps.push({
      requirement_id: 'elem7_documentation',
      severity: 'minor',
      description: 'Some maintenance activities may lack supporting documentation',
      action_required: 'Ensure all maintenance activities have receipts or service reports attached',
      estimated_effort_hours: 5
    });
  } else if (avgReceiptsPerEquipment >= 1) {
    documentationPoints = 10;
    documentationNotes = `Fair: Average ${avgReceiptsPerEquipment.toFixed(1)} receipts/documents per equipment`;
    gaps.push({
      requirement_id: 'elem7_documentation',
      severity: 'major',
      description: 'Significant maintenance activities lack receipts/documentation',
      action_required: 'Implement receipt collection process - upload photos of all service receipts',
      estimated_effort_hours: 10,
      affected_equipment: maintenanceEvidence.filter(e => e.receipts_count === 0).map(e => e.equipment_code)
    });
  } else {
    documentationNotes = 'Poor: Most maintenance lacks supporting documentation';
    gaps.push({
      requirement_id: 'elem7_documentation',
      severity: 'critical',
      description: 'Most maintenance activities lack receipts or documentation',
      action_required: 'Urgently implement documentation process - collect and upload all maintenance receipts',
      estimated_effort_hours: 15
    });
    recommendations.push('Use mobile receipt capture to document all maintenance activities');
  }
  
  earnedPoints += documentationPoints;
  totalPoints += ELEMENT_7_REQUIREMENTS.documentation.max_points;
  
  requirementScores.push({
    requirement_id: ELEMENT_7_REQUIREMENTS.documentation.id,
    requirement_name: ELEMENT_7_REQUIREMENTS.documentation.name,
    max_points: ELEMENT_7_REQUIREMENTS.documentation.max_points,
    earned_points: documentationPoints,
    percentage: (documentationPoints / ELEMENT_7_REQUIREMENTS.documentation.max_points) * 100,
    notes: documentationNotes
  });
  
  // ============================================================================
  // Requirement 4: Overall compliance with schedules (30 points)
  // ============================================================================
  const avgComplianceScore = summary.average_compliance_score;
  
  const compliancePoints = Math.round((avgComplianceScore / 100) * ELEMENT_7_REQUIREMENTS.compliance.max_points);
  const complianceNotes = `Average schedule compliance: ${avgComplianceScore.toFixed(0)}%`;
  
  if (avgComplianceScore >= 90) {
    strengths.push(`Excellent maintenance compliance at ${avgComplianceScore.toFixed(0)}%`);
  } else if (avgComplianceScore >= 80) {
    strengths.push(`Good maintenance compliance at ${avgComplianceScore.toFixed(0)}%`);
  }
  
  if (avgComplianceScore < 80) {
    const overdueEquipment = maintenanceEvidence.filter(e => e.overdue_schedules > 0);
    
    gaps.push({
      requirement_id: 'elem7_compliance',
      severity: avgComplianceScore < 50 ? 'critical' : avgComplianceScore < 70 ? 'major' : 'minor',
      description: `Only ${avgComplianceScore.toFixed(0)}% of scheduled maintenance completed on time`,
      action_required: 'Complete overdue maintenance and improve scheduling/tracking process',
      estimated_effort_hours: Math.max(15, overdueEquipment.length * 2),
      affected_equipment: overdueEquipment.map(e => e.equipment_code)
    });
    
    if (overdueEquipment.length > 0) {
      recommendations.push(`Address ${overdueEquipment.length} equipment with overdue maintenance immediately`);
    }
  }
  
  earnedPoints += compliancePoints;
  totalPoints += ELEMENT_7_REQUIREMENTS.compliance.max_points;
  
  requirementScores.push({
    requirement_id: ELEMENT_7_REQUIREMENTS.compliance.id,
    requirement_name: ELEMENT_7_REQUIREMENTS.compliance.name,
    max_points: ELEMENT_7_REQUIREMENTS.compliance.max_points,
    earned_points: compliancePoints,
    percentage: (compliancePoints / ELEMENT_7_REQUIREMENTS.compliance.max_points) * 100,
    notes: complianceNotes
  });
  
  // ============================================================================
  // Calculate final score and grade
  // ============================================================================
  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  
  let grade: Element7Score['grade'];
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';
  else grade = 'F';
  
  // Add general recommendations based on score
  if (percentage < 70) {
    recommendations.push('Consider implementing a CMMS (Computerized Maintenance Management System) to track maintenance');
    recommendations.push('Train staff on proper documentation and record-keeping procedures');
  }
  
  if (maintenanceEvidence.some(e => e.certifications_required.length > 0 && !e.certifications_current)) {
    gaps.push({
      requirement_id: 'elem7_certifications',
      severity: 'critical',
      description: 'Some equipment certifications are expired or missing',
      action_required: 'Schedule certified inspections for equipment with expired certifications',
      estimated_effort_hours: 8,
      affected_equipment: maintenanceEvidence
        .filter(e => e.certifications_required.length > 0 && !e.certifications_current)
        .map(e => e.equipment_code)
    });
  }
  
  return {
    element_number: 7,
    element_name: 'Preventive Maintenance & Inspection',
    max_points: totalPoints,
    earned_points: earnedPoints,
    percentage: Math.round(percentage * 10) / 10,
    grade,
    
    requirement_scores: requirementScores,
    
    maintenance_evidence: maintenanceEvidence,
    evidence_summary: {
      total_equipment: summary.total_equipment,
      equipment_with_schedules: summary.equipment_with_schedules,
      equipment_with_records: maintenanceEvidence.filter(e => e.maintenance_records_12mo > 0).length,
      total_records_12mo: summary.total_maintenance_records,
      total_attachments: summary.total_attachments,
      average_compliance: summary.average_compliance_score
    },
    
    gaps: gaps.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2, observation: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    
    recommendations,
    strengths
  };
}

// ============================================================================
// QUICK SCORE FUNCTION (for dashboard)
// ============================================================================

/**
 * Get quick Element 7 score without full analysis
 */
export async function getElement7QuickScore(
  companyId: string
): Promise<{
  percentage: number;
  grade: string;
  critical_gaps: number;
  overdue_maintenance: number;
}> {
  const summary = await getMaintenanceEvidenceSummary(companyId);
  
  // Simple scoring based on key metrics
  let score = 0;
  let maxScore = 100;
  
  // Has schedules (25%)
  if (summary.total_equipment > 0) {
    score += (summary.equipment_with_schedules / summary.total_equipment) * 25;
  }
  
  // Has recent records (25%)
  if (summary.total_equipment > 0) {
    const equipmentWithRecords = summary.evidence_items.filter(e => e.maintenance_records_12mo > 0).length;
    score += (equipmentWithRecords / summary.total_equipment) * 25;
  }
  
  // Has documentation (25%)
  if (summary.total_maintenance_records > 0) {
    const docRatio = Math.min(summary.total_receipts / summary.total_maintenance_records, 1);
    score += docRatio * 25;
  }
  
  // Compliance (25%)
  score += (summary.average_compliance_score / 100) * 25;
  
  const percentage = Math.round(score);
  
  let grade: string;
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';
  else grade = 'F';
  
  // Count critical gaps
  let criticalGaps = 0;
  if (summary.equipment_with_schedules < summary.total_equipment * 0.5) criticalGaps++;
  if (summary.average_compliance_score < 50) criticalGaps++;
  if (summary.total_receipts < summary.total_maintenance_records * 0.25) criticalGaps++;
  
  // Count overdue
  const overdueCount = summary.evidence_items.filter(e => e.overdue_schedules > 0).length;
  
  return {
    percentage,
    grade,
    critical_gaps: criticalGaps,
    overdue_maintenance: overdueCount
  };
}
