/**
 * COR Element 8: Training & Communication
 * Form Configurations
 */

export { trainingEvaluation } from './training-evaluation';
export { competencyAssessment } from './competency-assessment';

import { trainingEvaluation } from './training-evaluation';
import { competencyAssessment } from './competency-assessment';
import type { FormConfig } from '../../import-forms';

export const element8Forms: FormConfig[] = [
  trainingEvaluation,
  competencyAssessment,
];
