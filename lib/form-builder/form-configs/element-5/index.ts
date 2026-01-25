/**
 * COR Element 5: Workplace Behavior
 * Form Configurations
 */

export { progressiveDiscipline } from './progressive-discipline';
export { ruleCommunicationRecord } from './rule-communication-record';

import { progressiveDiscipline } from './progressive-discipline';
import { ruleCommunicationRecord } from './rule-communication-record';
import type { FormConfig } from '../../import-forms';

export const element5Forms: FormConfig[] = [
  progressiveDiscipline,
  ruleCommunicationRecord,
];
