/**
 * COR Element 10: Incident Investigation
 * Form Configurations
 */

export { incidentInvestigation } from './incident-investigation';
export { correctiveActionLog } from './corrective-action-log';
export { postIncidentTrainingRecord } from './post-incident-training-record';

import { incidentInvestigation } from './incident-investigation';
import { correctiveActionLog } from './corrective-action-log';
import { postIncidentTrainingRecord } from './post-incident-training-record';
import type { FormConfig } from '../../import-forms';

export const element10Forms: FormConfig[] = [
  incidentInvestigation,
  correctiveActionLog,
  postIncidentTrainingRecord,
];
