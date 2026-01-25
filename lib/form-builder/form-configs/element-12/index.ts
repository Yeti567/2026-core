/**
 * COR Element 12: Statistics & Records
 * Form Configurations
 */

export { injuryIllnessStatistics } from './injury-illness-statistics';
export { safetyPerformanceSummary } from './safety-performance-summary';
export { trendAnalysisReport } from './trend-analysis-report';

import { injuryIllnessStatistics } from './injury-illness-statistics';
import { safetyPerformanceSummary } from './safety-performance-summary';
import { trendAnalysisReport } from './trend-analysis-report';
import type { FormConfig } from '../../import-forms';

export const element12Forms: FormConfig[] = [
  injuryIllnessStatistics,
  safetyPerformanceSummary,
  trendAnalysisReport,
];
