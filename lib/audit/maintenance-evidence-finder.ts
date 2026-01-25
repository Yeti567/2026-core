/**
 * Maintenance Evidence Finder for Audit Engine
 * 
 * Finds and aggregates maintenance evidence for COR audits
 * Specifically supports Element 7: Preventive Maintenance & Inspection
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface MaintenanceEvidence {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  equipment_type: string;
  equipment_status: string;
  
  // Schedule info
  has_maintenance_schedule: boolean;
  scheduled_tasks: number;
  active_schedules: number;
  
  // Maintenance records (last 12 months)
  maintenance_records_12mo: number;
  preventive_maintenance_count: number;
  corrective_maintenance_count: number;
  inspection_count: number;
  certification_count: number;
  
  // Documentation
  total_attachments: number;
  receipts_count: number;
  service_reports_count: number;
  certification_docs_count: number;
  
  // Costs
  total_cost_12mo: number;
  preventive_cost: number;
  corrective_cost: number;
  
  // Compliance
  overdue_schedules: number;
  compliance_score: number;
  last_maintenance_date: string | null;
  next_maintenance_due: string | null;
  
  // Certification status
  certifications_required: string[];
  certifications_current: boolean;
  certification_expiry_dates: Record<string, string>;
}

export interface MaintenanceEvidenceSummary {
  total_equipment: number;
  equipment_with_schedules: number;
  total_maintenance_records: number;
  total_preventive: number;
  total_inspections: number;
  total_attachments: number;
  total_receipts: number;
  total_cost_12mo: number;
  average_compliance_score: number;
  equipment_compliance_breakdown: {
    compliant: number; // >= 80%
    partial: number; // 50-79%
    non_compliant: number; // < 50%
  };
  evidence_items: MaintenanceEvidence[];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Find maintenance evidence for audit
 * @param companyId - Company ID
 * @param elementNumber - COR Element number (7 = Preventive Maintenance)
 * @returns Array of maintenance evidence per equipment
 */
export async function findMaintenanceEvidenceForAudit(
  companyId: string,
  elementNumber: number
): Promise<MaintenanceEvidence[]> {
  // Maintenance is relevant for Element 7: Preventive Maintenance & Inspection
  if (elementNumber !== 7) {
    return [];
  }
  
  const supabase = await createClient();
  const evidence: MaintenanceEvidence[] = [];
  
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  // Get all equipment for the company
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment_inventory')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['active', 'in_service', 'maintenance']);
  
  if (equipmentError || !equipment) {
    console.error('Failed to fetch equipment:', equipmentError);
    return [];
  }
  
  for (const equip of equipment) {
    // Get maintenance schedules for this equipment
    const { data: schedules } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('equipment_id', equip.id)
      .eq('is_active', true);
    
    const activeSchedules = schedules || [];
    const overdueSchedules = activeSchedules.filter(s => 
      s.next_due_date && new Date(s.next_due_date) < new Date()
    );
    
    // Get maintenance records (last 12 months)
    const { data: records } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('equipment_id', equip.id)
      .gte('actual_date', twelveMonthsAgoStr)
      .order('actual_date', { ascending: false });
    
    const maintenanceRecords = records || [];
    
    // Count by type
    const preventiveCount = maintenanceRecords.filter(r => 
      r.maintenance_type === 'preventive'
    ).length;
    
    const correctiveCount = maintenanceRecords.filter(r => 
      r.maintenance_type === 'corrective' || r.maintenance_type === 'repair'
    ).length;
    
    const inspectionCount = maintenanceRecords.filter(r => 
      r.maintenance_type?.includes('inspection')
    ).length;
    
    const certificationCount = maintenanceRecords.filter(r => 
      r.maintenance_type === 'certification'
    ).length;
    
    // Calculate costs
    const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost_total || 0), 0);
    const preventiveCost = maintenanceRecords
      .filter(r => r.maintenance_type === 'preventive')
      .reduce((sum, r) => sum + (r.cost_total || 0), 0);
    const correctiveCost = maintenanceRecords
      .filter(r => r.maintenance_type === 'corrective' || r.maintenance_type === 'repair')
      .reduce((sum, r) => sum + (r.cost_total || 0), 0);
    
    // Get attachments for this equipment's maintenance records
    const recordIds = maintenanceRecords.map(r => r.id);
    let attachmentsData: any[] = [];
    
    if (recordIds.length > 0) {
      const { data: attachments } = await supabase
        .from('maintenance_attachments')
        .select('*')
        .in('maintenance_record_id', recordIds);
      attachmentsData = attachments || [];
    }
    
    // Also get attachments directly linked to equipment
    const { data: equipmentAttachments } = await supabase
      .from('maintenance_attachments')
      .select('*')
      .eq('equipment_id', equip.id)
      .gte('uploaded_at', twelveMonthsAgoStr);
    
    const allAttachments = [...attachmentsData, ...(equipmentAttachments || [])];
    
    // Count attachment types
    const receiptsCount = allAttachments.filter(a => 
      a.attachment_type === 'receipt' || a.attachment_type === 'invoice'
    ).length;
    
    const serviceReportsCount = allAttachments.filter(a => 
      a.attachment_type === 'service_report'
    ).length;
    
    const certificationDocsCount = allAttachments.filter(a => 
      a.attachment_type === 'certification'
    ).length;
    
    // Calculate compliance score
    const complianceScore = calculateMaintenanceComplianceScore(
      activeSchedules,
      maintenanceRecords
    );
    
    // Get last and next maintenance dates
    const lastMaintenanceDate = maintenanceRecords.length > 0 
      ? maintenanceRecords[0].actual_date 
      : null;
    
    const nextDueDates = activeSchedules
      .filter(s => s.next_due_date)
      .map(s => s.next_due_date)
      .sort();
    const nextMaintenanceDue = nextDueDates.length > 0 ? nextDueDates[0] : null;
    
    // Check certification status
    const certificationsRequired = equip.certifications_required || [];
    const certificationExpiryDates: Record<string, string> = {};
    
    // Get latest certification records
    const certRecords = maintenanceRecords.filter(r => 
      r.maintenance_type === 'certification' && r.passed_inspection === true
    );
    
    let allCertificationsCurrent = true;
    for (const cert of certificationsRequired) {
      const latestCert = certRecords.find(r => 
        r.maintenance_category === cert || r.work_description?.includes(cert)
      );
      
      if (latestCert?.next_service_date) {
        // Safe: cert is iterated from certificationsRequired array (controlled strings)
        // eslint-disable-next-line security/detect-object-injection
        certificationExpiryDates[cert] = latestCert.next_service_date;
        if (new Date(latestCert.next_service_date) < new Date()) {
          allCertificationsCurrent = false;
        }
      } else {
        allCertificationsCurrent = false;
      }
    }
    
    evidence.push({
      equipment_id: equip.id,
      equipment_code: equip.equipment_code || equip.equipment_number,
      equipment_name: equip.name,
      equipment_type: equip.equipment_type,
      equipment_status: equip.status,
      
      has_maintenance_schedule: activeSchedules.length > 0,
      scheduled_tasks: activeSchedules.length,
      active_schedules: activeSchedules.length,
      
      maintenance_records_12mo: maintenanceRecords.length,
      preventive_maintenance_count: preventiveCount,
      corrective_maintenance_count: correctiveCount,
      inspection_count: inspectionCount,
      certification_count: certificationCount,
      
      total_attachments: allAttachments.length,
      receipts_count: receiptsCount,
      service_reports_count: serviceReportsCount,
      certification_docs_count: certificationDocsCount,
      
      total_cost_12mo: totalCost,
      preventive_cost: preventiveCost,
      corrective_cost: correctiveCost,
      
      overdue_schedules: overdueSchedules.length,
      compliance_score: complianceScore,
      last_maintenance_date: lastMaintenanceDate,
      next_maintenance_due: nextMaintenanceDue,
      
      certifications_required: certificationsRequired,
      certifications_current: allCertificationsCurrent,
      certification_expiry_dates: certificationExpiryDates
    });
  }
  
  return evidence;
}

/**
 * Get summary of maintenance evidence for audit
 */
export async function getMaintenanceEvidenceSummary(
  companyId: string
): Promise<MaintenanceEvidenceSummary> {
  const evidence = await findMaintenanceEvidenceForAudit(companyId, 7);
  
  const equipmentWithSchedules = evidence.filter(e => e.has_maintenance_schedule).length;
  const totalRecords = evidence.reduce((sum, e) => sum + e.maintenance_records_12mo, 0);
  const totalPreventive = evidence.reduce((sum, e) => sum + e.preventive_maintenance_count, 0);
  const totalInspections = evidence.reduce((sum, e) => sum + e.inspection_count, 0);
  const totalAttachments = evidence.reduce((sum, e) => sum + e.total_attachments, 0);
  const totalReceipts = evidence.reduce((sum, e) => sum + e.receipts_count, 0);
  const totalCost = evidence.reduce((sum, e) => sum + e.total_cost_12mo, 0);
  
  const avgCompliance = evidence.length > 0
    ? evidence.reduce((sum, e) => sum + e.compliance_score, 0) / evidence.length
    : 0;
  
  const compliantCount = evidence.filter(e => e.compliance_score >= 80).length;
  const partialCount = evidence.filter(e => e.compliance_score >= 50 && e.compliance_score < 80).length;
  const nonCompliantCount = evidence.filter(e => e.compliance_score < 50).length;
  
  return {
    total_equipment: evidence.length,
    equipment_with_schedules: equipmentWithSchedules,
    total_maintenance_records: totalRecords,
    total_preventive: totalPreventive,
    total_inspections: totalInspections,
    total_attachments: totalAttachments,
    total_receipts: totalReceipts,
    total_cost_12mo: totalCost,
    average_compliance_score: Math.round(avgCompliance * 10) / 10,
    equipment_compliance_breakdown: {
      compliant: compliantCount,
      partial: partialCount,
      non_compliant: nonCompliantCount
    },
    evidence_items: evidence
  };
}

// ============================================================================
// COMPLIANCE CALCULATION
// ============================================================================

/**
 * Calculate maintenance compliance score for equipment
 * @param schedules - Active maintenance schedules
 * @param records - Maintenance records from last 12 months
 * @returns Compliance score (0-100)
 */
export function calculateMaintenanceComplianceScore(
  schedules: any[],
  records: any[]
): number {
  if (schedules.length === 0) {
    // No schedule = 0% compliance (can't demonstrate systematic maintenance)
    return 0;
  }
  
  let compliantTasks = 0;
  const today = new Date();
  
  for (const schedule of schedules) {
    // Find relevant records for this schedule type
    const relevantRecords = records.filter(r => {
      // Match by maintenance category or type
      if (schedule.maintenance_category && r.maintenance_category === schedule.maintenance_category) {
        return true;
      }
      if (schedule.maintenance_type && r.maintenance_type === schedule.maintenance_type) {
        return true;
      }
      // Match by schedule name in description
      if (schedule.schedule_name && r.work_description?.toLowerCase().includes(schedule.schedule_name.toLowerCase())) {
        return true;
      }
      return false;
    }).sort((a, b) => new Date(b.actual_date).getTime() - new Date(a.actual_date).getTime());
    
    if (relevantRecords.length === 0) {
      // No records found for this schedule - not compliant
      continue;
    }
    
    // Check if maintenance was performed on time
    const lastRecord = relevantRecords[0];
    const lastPerformedDate = new Date(lastRecord.actual_date);
    const daysSinceLastService = Math.ceil(
      (today.getTime() - lastPerformedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Convert schedule frequency to days
    let frequencyDays = 365; // Default to yearly
    
    if (schedule.frequency_type === 'calendar' || schedule.frequency_unit) {
      const unit = schedule.frequency_unit || 'months';
      const value = schedule.frequency_value || 1;
      
      switch (unit) {
        case 'days': frequencyDays = value; break;
        case 'weeks': frequencyDays = value * 7; break;
        case 'months': frequencyDays = value * 30; break;
        case 'years': frequencyDays = value * 365; break;
      }
    } else if (schedule.frequency_type === 'usage_hours') {
      // For usage-based, check hours if available
      // This is approximate - would need current equipment hours
      frequencyDays = 90; // Assume quarterly as default
    }
    
    // Allow 10% grace period for compliance
    const graceFrequency = frequencyDays * 1.1;
    
    if (daysSinceLastService <= graceFrequency) {
      compliantTasks++;
    }
  }
  
  return Math.round((compliantTasks / schedules.length) * 100);
}

// ============================================================================
// EVIDENCE EXPORT
// ============================================================================

/**
 * Export maintenance evidence for audit package
 */
export async function exportMaintenanceEvidenceForAudit(
  companyId: string,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const summary = await getMaintenanceEvidenceSummary(companyId);
  
  if (format === 'json') {
    return JSON.stringify({
      element: 7,
      element_name: 'Preventive Maintenance & Inspection',
      export_date: new Date().toISOString(),
      summary: {
        total_equipment: summary.total_equipment,
        equipment_with_schedules: summary.equipment_with_schedules,
        total_maintenance_records: summary.total_maintenance_records,
        total_preventive: summary.total_preventive,
        total_inspections: summary.total_inspections,
        total_attachments: summary.total_attachments,
        total_receipts: summary.total_receipts,
        total_cost_12mo: summary.total_cost_12mo,
        average_compliance_score: summary.average_compliance_score,
        compliance_breakdown: summary.equipment_compliance_breakdown
      },
      equipment_evidence: summary.evidence_items
    }, null, 2);
  }
  
  // CSV format
  const headers = [
    'Equipment Code',
    'Equipment Name',
    'Type',
    'Status',
    'Has Schedule',
    'Scheduled Tasks',
    'Records (12mo)',
    'Preventive',
    'Inspections',
    'Certifications',
    'Attachments',
    'Receipts',
    'Total Cost',
    'Compliance Score',
    'Last Maintenance',
    'Next Due'
  ];
  
  const rows = summary.evidence_items.map(e => [
    e.equipment_code,
    e.equipment_name,
    e.equipment_type,
    e.equipment_status,
    e.has_maintenance_schedule ? 'Yes' : 'No',
    e.scheduled_tasks,
    e.maintenance_records_12mo,
    e.preventive_maintenance_count,
    e.inspection_count,
    e.certification_count,
    e.total_attachments,
    e.receipts_count,
    e.total_cost_12mo,
    `${e.compliance_score}%`,
    e.last_maintenance_date || 'N/A',
    e.next_maintenance_due || 'N/A'
  ]);
  
  return [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}
