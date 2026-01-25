/**
 * COR Element 6: Personal Protective Equipment
 * Form Configurations
 */

export { ppeFitTestRecord } from './ppe-fit-test-record';
export { ppeMaintenanceLog } from './ppe-maintenance-log';
export { ppeTrainingSignoff } from './ppe-training-signoff';

import { ppeFitTestRecord } from './ppe-fit-test-record';
import { ppeMaintenanceLog } from './ppe-maintenance-log';
import { ppeTrainingSignoff } from './ppe-training-signoff';
import type { FormConfig } from '../../import-forms';

export const element6Forms: FormConfig[] = [
  ppeFitTestRecord,
  ppeMaintenanceLog,
  ppeTrainingSignoff,
];
