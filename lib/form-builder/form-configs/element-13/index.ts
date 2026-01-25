/**
 * COR Element 13: Regulatory Awareness
 * Form Configurations
 */

export { regulatoryComplianceChecklist } from './regulatory-compliance-checklist';
export { legalPostingChecklist } from './legal-posting-checklist';
export { regulatoryChangeLog } from './regulatory-change-log';

import { regulatoryComplianceChecklist } from './regulatory-compliance-checklist';
import { legalPostingChecklist } from './legal-posting-checklist';
import { regulatoryChangeLog } from './regulatory-change-log';
import type { FormConfig } from '../../import-forms';

export const element13Forms: FormConfig[] = [
  regulatoryComplianceChecklist,
  legalPostingChecklist,
  regulatoryChangeLog,
];
