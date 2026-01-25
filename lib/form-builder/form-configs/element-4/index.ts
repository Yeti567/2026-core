/**
 * COR Element 4: Competency & Training
 * Form Configurations
 */

export { contractorPrequalification } from './contractor-prequalification';
export { contractorEvaluation } from './contractor-evaluation';
export { changeNotification } from './change-notification';

import { contractorPrequalification } from './contractor-prequalification';
import { contractorEvaluation } from './contractor-evaluation';
import { changeNotification } from './change-notification';
import type { FormConfig } from '../../import-forms';

export const element4Forms: FormConfig[] = [
  contractorPrequalification,
  contractorEvaluation,
  changeNotification,
];
