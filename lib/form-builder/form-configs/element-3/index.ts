/**
 * COR Element 3: Hazard Control
 * Form Configurations
 */

export { controlImplementation } from './control-implementation';
export { controlCommunicationRecord } from './control-communication-record';
export { controlReviewApproval } from './control-review-approval';

import { controlImplementation } from './control-implementation';
import { controlCommunicationRecord } from './control-communication-record';
import { controlReviewApproval } from './control-review-approval';
import type { FormConfig } from '../../import-forms';

export const element3Forms: FormConfig[] = [
  controlImplementation,
  controlCommunicationRecord,
  controlReviewApproval,
];
