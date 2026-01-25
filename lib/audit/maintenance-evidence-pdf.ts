/**
 * Maintenance Evidence PDF Generator
 * 
 * Generates PDF sections for Element 7 maintenance evidence
 * For inclusion in COR audit packages
 */

import {
  findMaintenanceEvidenceForAudit,
  getMaintenanceEvidenceSummary,
  type MaintenanceEvidence
} from './maintenance-evidence-finder';
import { scoreElement7WithMaintenance } from './element-7-maintenance';

// ============================================================================
// TYPES
// ============================================================================

export interface MaintenanceEvidenceSection {
  title: string;
  summary: {
    total_equipment: number;
    equipment_with_schedules: number;
    total_records: number;
    total_preventive: number;
    total_inspections: number;
    total_receipts: number;
    average_compliance: number;
    total_cost: number;
  };
  score: {
    earned_points: number;
    max_points: number;
    percentage: number;
    grade: string;
  };
  equipment_details: Array<{
    equipment_code: string;
    equipment_name: string;
    equipment_type: string;
    has_schedule: boolean;
    records_count: number;
    preventive_count: number;
    inspection_count: number;
    receipts_count: number;
    compliance_score: number;
    last_maintenance: string | null;
    next_due: string | null;
  }>;
  gaps: Array<{
    severity: string;
    description: string;
    action_required: string;
    affected_count: number;
  }>;
  strengths: string[];
}

// ============================================================================
// PDF DATA GENERATOR
// ============================================================================

/**
 * Generate maintenance evidence data for PDF
 */
export async function generateMaintenanceEvidenceData(
  companyId: string
): Promise<MaintenanceEvidenceSection> {
  const summary = await getMaintenanceEvidenceSummary(companyId);
  const score = await scoreElement7WithMaintenance(companyId);
  
  return {
    title: 'ELEMENT 7 - PREVENTIVE MAINTENANCE EVIDENCE',
    summary: {
      total_equipment: summary.total_equipment,
      equipment_with_schedules: summary.equipment_with_schedules,
      total_records: summary.total_maintenance_records,
      total_preventive: summary.total_preventive,
      total_inspections: summary.total_inspections,
      total_receipts: summary.total_receipts,
      average_compliance: summary.average_compliance_score,
      total_cost: summary.total_cost_12mo
    },
    score: {
      earned_points: score.earned_points,
      max_points: score.max_points,
      percentage: score.percentage,
      grade: score.grade
    },
    equipment_details: summary.evidence_items.map(e => ({
      equipment_code: e.equipment_code,
      equipment_name: e.equipment_name,
      equipment_type: e.equipment_type,
      has_schedule: e.has_maintenance_schedule,
      records_count: e.maintenance_records_12mo,
      preventive_count: e.preventive_maintenance_count,
      inspection_count: e.inspection_count,
      receipts_count: e.receipts_count,
      compliance_score: e.compliance_score,
      last_maintenance: e.last_maintenance_date,
      next_due: e.next_maintenance_due
    })),
    gaps: score.gaps.map(g => ({
      severity: g.severity,
      description: g.description,
      action_required: g.action_required,
      affected_count: g.affected_equipment?.length || 0
    })),
    strengths: score.strengths
  };
}

/**
 * Generate maintenance evidence HTML for PDF rendering
 */
export async function generateMaintenanceEvidenceHTML(
  companyId: string
): Promise<string> {
  const data = await generateMaintenanceEvidenceData(companyId);
  
  const gradeColor = {
    'A': '#22c55e',
    'B': '#3b82f6',
    'C': '#eab308',
    'D': '#f97316',
    'F': '#ef4444'
  }[data.score.grade] || '#6b7280';
  
  const severityColor = {
    'critical': '#ef4444',
    'major': '#f97316',
    'minor': '#eab308',
    'observation': '#6b7280'
  };
  
  return `
    <div style="font-family: system-ui, sans-serif; padding: 20px;">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #1f2937; padding-bottom: 10px;">
        ${data.title}
      </h1>
      
      <!-- Score Overview -->
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <div style="flex: 1; background: #f3f4f6; border-radius: 8px; padding: 15px;">
          <div style="font-size: 36px; font-weight: bold; color: ${gradeColor};">
            ${data.score.grade}
          </div>
          <div style="font-size: 14px; color: #6b7280;">Grade</div>
        </div>
        <div style="flex: 1; background: #f3f4f6; border-radius: 8px; padding: 15px;">
          <div style="font-size: 24px; font-weight: bold;">
            ${data.score.earned_points}/${data.score.max_points}
          </div>
          <div style="font-size: 14px; color: #6b7280;">Points (${data.score.percentage.toFixed(0)}%)</div>
        </div>
        <div style="flex: 1; background: #f3f4f6; border-radius: 8px; padding: 15px;">
          <div style="font-size: 24px; font-weight: bold;">
            ${data.summary.average_compliance.toFixed(0)}%
          </div>
          <div style="font-size: 14px; color: #6b7280;">Avg Compliance</div>
        </div>
      </div>
      
      <!-- Summary Stats -->
      <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 10px 0;">SUMMARY</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Total Equipment</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
            ${data.summary.total_equipment}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Equipment with Schedules</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
            ${data.summary.equipment_with_schedules}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Total Records (12mo)</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
            ${data.summary.total_records}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Preventive Maintenance</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
            ${data.summary.total_preventive}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Inspections</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
            ${data.summary.total_inspections}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Receipts/Documents</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
            ${data.summary.total_receipts}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Total Cost (12mo)</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;" colspan="3">
            $${data.summary.total_cost.toLocaleString()}
          </td>
        </tr>
      </table>
      
      <!-- Strengths -->
      ${data.strengths.length > 0 ? `
        <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; color: #22c55e;">✓ STRENGTHS</h2>
        <ul style="font-size: 12px; margin: 0 0 20px 20px; padding: 0;">
          ${data.strengths.map(s => `<li style="margin-bottom: 5px;">${s}</li>`).join('')}
        </ul>
      ` : ''}
      
      <!-- Gaps -->
      ${data.gaps.length > 0 ? `
        <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; color: #ef4444;">⚠ GAPS & RECOMMENDATIONS</h2>
        ${data.gaps.map(g => `
          <div style="border-left: 3px solid ${severityColor[g.severity as keyof typeof severityColor] || '#6b7280'}; padding-left: 10px; margin-bottom: 10px;">
            <div style="font-size: 11px; text-transform: uppercase; color: ${severityColor[g.severity as keyof typeof severityColor] || '#6b7280'}; font-weight: bold;">
              ${g.severity}${g.affected_count > 0 ? ` (${g.affected_count} affected)` : ''}
            </div>
            <div style="font-size: 12px; font-weight: bold;">${g.description}</div>
            <div style="font-size: 11px; color: #6b7280;">Action: ${g.action_required}</div>
          </div>
        `).join('')}
      ` : ''}
      
      <!-- Equipment Details -->
      <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 10px 0;">EQUIPMENT DETAILS</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Equipment</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">Schedule</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">Records</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">Prev</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">Insp</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">Receipts</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">Compliance</th>
          </tr>
        </thead>
        <tbody>
          ${data.equipment_details.map(e => `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">
                <div style="font-weight: bold;">${e.equipment_code}</div>
                <div style="color: #6b7280;">${e.equipment_name}</div>
              </td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb;">
                ${e.has_schedule ? '✓' : '✗'}
              </td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb;">
                ${e.records_count}
              </td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb;">
                ${e.preventive_count}
              </td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb;">
                ${e.inspection_count}
              </td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb;">
                ${e.receipts_count}
              </td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb; color: ${
                e.compliance_score >= 80 ? '#22c55e' : e.compliance_score >= 50 ? '#eab308' : '#ef4444'
              }; font-weight: bold;">
                ${e.compliance_score}%
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">
        Generated: ${new Date().toLocaleString()} | Element 7 - Preventive Maintenance & Inspection
      </div>
    </div>
  `;
}

/**
 * Generate maintenance evidence as structured data for PDF-lib
 */
export async function getMaintenanceEvidenceForPDF(
  companyId: string
): Promise<{
  pages: Array<{
    title: string;
    content: Array<{
      type: 'text' | 'table' | 'list' | 'heading';
      data: any;
      style?: any;
    }>;
  }>;
}> {
  const data = await generateMaintenanceEvidenceData(companyId);
  
  return {
    pages: [
      {
        title: data.title,
        content: [
          {
            type: 'heading',
            data: 'Summary',
            style: { fontSize: 14, bold: true }
          },
          {
            type: 'table',
            data: {
              headers: ['Metric', 'Value'],
              rows: [
                ['Total Equipment', data.summary.total_equipment.toString()],
                ['Equipment with Schedules', data.summary.equipment_with_schedules.toString()],
                ['Maintenance Records (12mo)', data.summary.total_records.toString()],
                ['Preventive Maintenance', data.summary.total_preventive.toString()],
                ['Inspections', data.summary.total_inspections.toString()],
                ['Receipts/Documents', data.summary.total_receipts.toString()],
                ['Average Compliance', `${data.summary.average_compliance.toFixed(0)}%`],
                ['Total Cost (12mo)', `$${data.summary.total_cost.toLocaleString()}`]
              ]
            }
          },
          {
            type: 'heading',
            data: `Score: ${data.score.grade} (${data.score.earned_points}/${data.score.max_points} points - ${data.score.percentage.toFixed(0)}%)`,
            style: { fontSize: 12, bold: true }
          },
          ...(data.strengths.length > 0 ? [{
            type: 'heading' as const,
            data: 'Strengths',
            style: { fontSize: 12, bold: true, color: 'green' }
          }, {
            type: 'list' as const,
            data: data.strengths
          }] : []),
          ...(data.gaps.length > 0 ? [{
            type: 'heading' as const,
            data: 'Gaps & Recommendations',
            style: { fontSize: 12, bold: true, color: 'red' }
          }, {
            type: 'list' as const,
            data: data.gaps.map(g => `[${g.severity.toUpperCase()}] ${g.description} - ${g.action_required}`)
          }] : []),
          {
            type: 'heading',
            data: 'Equipment Details',
            style: { fontSize: 12, bold: true }
          },
          {
            type: 'table',
            data: {
              headers: ['Equipment', 'Schedule', 'Records', 'Prev', 'Insp', 'Receipts', 'Compliance'],
              rows: data.equipment_details.map(e => [
                `${e.equipment_code}: ${e.equipment_name}`,
                e.has_schedule ? 'Yes' : 'No',
                e.records_count.toString(),
                e.preventive_count.toString(),
                e.inspection_count.toString(),
                e.receipts_count.toString(),
                `${e.compliance_score}%`
              ])
            }
          }
        ]
      }
    ]
  };
}
