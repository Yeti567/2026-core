/**
 * COR Element 7: Maintenance
 * Form Configurations
 */

export { maintenanceScheduleChecklist } from './maintenance-schedule-checklist';
export { correctiveActionForm } from './corrective-action-form';

import { maintenanceScheduleChecklist } from './maintenance-schedule-checklist';
import { correctiveActionForm } from './corrective-action-form';
import type { FormConfig } from '../../import-forms';

export const element7Forms: FormConfig[] = [
  maintenanceScheduleChecklist,
  correctiveActionForm,
];
