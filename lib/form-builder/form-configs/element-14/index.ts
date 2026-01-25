/**
 * COR Element 14: Management System
 * Form Configurations
 */

export { managementReviewMinutes } from './management-review-minutes';
export { kpiReview } from './kpi-review';
export { changeEvaluation } from './change-evaluation';
export { managementActionPlan } from './management-action-plan';

import { managementReviewMinutes } from './management-review-minutes';
import { kpiReview } from './kpi-review';
import { changeEvaluation } from './change-evaluation';
import { managementActionPlan } from './management-action-plan';
import type { FormConfig } from '../../import-forms';

export const element14Forms: FormConfig[] = [
  managementReviewMinutes,
  kpiReview,
  changeEvaluation,
  managementActionPlan,
];
