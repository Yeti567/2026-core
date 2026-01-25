/**
 * COR Form Configurations - Master Index
 * 
 * Exports all form configurations organized by COR element.
 * These configurations can be used with the bulk import system.
 */

import type { FormConfig } from '../import-forms';

// =============================================================================
// ELEMENT 2: Hazard Identification & Assessment
// =============================================================================

export { hazardAssessmentReviewLog } from './element-2/hazard-assessment-review-log';
export { element2Forms } from './element-2';

// =============================================================================
// ELEMENT 3: Hazard Control
// =============================================================================

export { controlImplementation } from './element-3/control-implementation';
export { controlCommunicationRecord } from './element-3/control-communication-record';
export { controlReviewApproval } from './element-3/control-review-approval';
export { element3Forms } from './element-3';

// =============================================================================
// ELEMENT 4: Competency & Training
// =============================================================================

export { contractorPrequalification } from './element-4/contractor-prequalification';
export { contractorEvaluation } from './element-4/contractor-evaluation';
export { changeNotification } from './element-4/change-notification';
export { element4Forms } from './element-4';

// =============================================================================
// ELEMENT 5: Workplace Behavior
// =============================================================================

export { progressiveDiscipline } from './element-5/progressive-discipline';
export { ruleCommunicationRecord } from './element-5/rule-communication-record';
export { element5Forms } from './element-5';

// =============================================================================
// ELEMENT 6: Personal Protective Equipment
// =============================================================================

export { ppeFitTestRecord } from './element-6/ppe-fit-test-record';
export { ppeMaintenanceLog } from './element-6/ppe-maintenance-log';
export { ppeTrainingSignoff } from './element-6/ppe-training-signoff';
export { element6Forms } from './element-6';

// =============================================================================
// ELEMENT 7: Maintenance
// =============================================================================

export { maintenanceScheduleChecklist } from './element-7/maintenance-schedule-checklist';
export { correctiveActionForm } from './element-7/corrective-action-form';
export { element7Forms } from './element-7';

// =============================================================================
// ELEMENT 8: Training & Communication
// =============================================================================

export { trainingEvaluation } from './element-8/training-evaluation';
export { competencyAssessment } from './element-8/competency-assessment';
export { element8Forms } from './element-8';

// =============================================================================
// ELEMENT 9: Workplace Inspections
// =============================================================================

export { jointHealthSafetyInspection } from './element-9/joint-health-safety-inspection';
export { element9Forms } from './element-9';

// =============================================================================
// ELEMENT 10: Incident Investigation
// =============================================================================

export { incidentInvestigation } from './element-10/incident-investigation';
export { correctiveActionLog } from './element-10/corrective-action-log';
export { postIncidentTrainingRecord } from './element-10/post-incident-training-record';
export { element10Forms } from './element-10';

// =============================================================================
// ELEMENT 11: Emergency Preparedness
// =============================================================================

export { emergencyEquipmentInspection } from './element-11/emergency-equipment-inspection';
export { element11Forms } from './element-11';

// =============================================================================
// ELEMENT 12: Statistics & Records
// =============================================================================

export { injuryIllnessStatistics } from './element-12/injury-illness-statistics';
export { safetyPerformanceSummary } from './element-12/safety-performance-summary';
export { trendAnalysisReport } from './element-12/trend-analysis-report';
export { element12Forms } from './element-12';

// =============================================================================
// ELEMENT 13: Regulatory Awareness
// =============================================================================

export { regulatoryComplianceChecklist } from './element-13/regulatory-compliance-checklist';
export { legalPostingChecklist } from './element-13/legal-posting-checklist';
export { regulatoryChangeLog } from './element-13/regulatory-change-log';
export { element13Forms } from './element-13';

// =============================================================================
// ELEMENT 14: Management System
// =============================================================================

export { managementReviewMinutes } from './element-14/management-review-minutes';
export { kpiReview } from './element-14/kpi-review';
export { changeEvaluation } from './element-14/change-evaluation';
export { managementActionPlan } from './element-14/management-action-plan';
export { element14Forms } from './element-14';

// =============================================================================
// AGGREGATED EXPORTS
// =============================================================================

import { element2Forms } from './element-2';
import { element3Forms } from './element-3';
import { element4Forms } from './element-4';
import { element5Forms } from './element-5';
import { element6Forms } from './element-6';
import { element7Forms } from './element-7';
import { element8Forms } from './element-8';
import { element9Forms } from './element-9';
import { element10Forms } from './element-10';
import { element11Forms } from './element-11';
import { element12Forms } from './element-12';
import { element13Forms } from './element-13';
import { element14Forms } from './element-14';

/**
 * All form configurations combined
 */
export const allFormConfigs: FormConfig[] = [
  ...element2Forms,
  ...element3Forms,
  ...element4Forms,
  ...element5Forms,
  ...element6Forms,
  ...element7Forms,
  ...element8Forms,
  ...element9Forms,
  ...element10Forms,
  ...element11Forms,
  ...element12Forms,
  ...element13Forms,
  ...element14Forms,
];

/**
 * Form configurations grouped by COR element
 */
export const formConfigsByElement: Record<number, FormConfig[]> = {
  2: element2Forms,
  3: element3Forms,
  4: element4Forms,
  5: element5Forms,
  6: element6Forms,
  7: element7Forms,
  8: element8Forms,
  9: element9Forms,
  10: element10Forms,
  11: element11Forms,
  12: element12Forms,
  13: element13Forms,
  14: element14Forms,
};

/**
 * COR element descriptions
 */
export const corElementDescriptions: Record<number, string> = {
  2: 'Hazard Identification & Assessment',
  3: 'Hazard Control',
  4: 'Competency & Training',
  5: 'Workplace Behavior',
  6: 'Personal Protective Equipment',
  7: 'Maintenance',
  8: 'Training & Communication',
  9: 'Workplace Inspections',
  10: 'Incident Investigation',
  11: 'Emergency Preparedness',
  12: 'Statistics & Records',
  13: 'Regulatory Awareness',
  14: 'Management System',
};

/**
 * Get forms for a specific COR element
 */
export function getFormsForElement(element: number): FormConfig[] {
  // Safe: element is a controlled COR element number (2-14) parameter
  // eslint-disable-next-line security/detect-object-injection
  return formConfigsByElement[element] || [];
}

/**
 * Get a specific form by code
 */
export function getFormByCode(code: string): FormConfig | undefined {
  return allFormConfigs.find(f => f.code === code);
}

/**
 * Get forms by frequency
 */
export function getFormsByFrequency(frequency: FormConfig['frequency']): FormConfig[] {
  return allFormConfigs.filter(f => f.frequency === frequency);
}

/**
 * Get mandatory forms only
 */
export function getMandatoryForms(): FormConfig[] {
  return allFormConfigs.filter(f => f.is_mandatory);
}

/**
 * Form count summary
 */
export const formCountSummary = {
  total: allFormConfigs.length,
  byElement: Object.entries(formConfigsByElement).reduce(
    (acc, [element, forms]) => {
      // Safe: element is from Object.entries of formConfigsByElement (controlled keys)
       
      acc[Number(element)] = forms.length;
      return acc;
    },
    {} as Record<number, number>
  ),
  mandatory: allFormConfigs.filter(f => f.is_mandatory).length,
  optional: allFormConfigs.filter(f => !f.is_mandatory).length,
};
