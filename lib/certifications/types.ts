// ============================================================================
// Certification & Training Tracker Types
// ============================================================================

export interface CertificationType {
  id: string;
  company_id: string | null;
  name: string;
  short_code: string | null;
  description: string | null;
  category: 'safety' | 'operational' | 'regulatory' | 'company-specific';
  default_expiry_months: number | null;
  expiry_warning_days: number[];
  alert_at_60_days: boolean;
  alert_at_30_days: boolean;
  alert_at_7_days: boolean;
  alert_on_expiry: boolean;
  required_for_work: boolean;
  is_active: boolean;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  company_id: string;
  worker_id: string;
  certification_type_id: string | null;
  name: string;
  issuing_organization: string | null;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string | null;
  file_type: 'image' | 'pdf' | null;
  file_name: string | null;
  file_size: number | null;
  thumbnail_path: string | null;
  status: CertificationStatus;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  alert_60_sent: boolean;
  alert_30_sent: boolean;
  alert_7_sent: boolean;
  alert_expired_sent: boolean;
  last_alert_sent: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  certification_type?: CertificationType;
  worker?: WorkerBasic;
}

export type CertificationStatus = 'active' | 'expired' | 'revoked' | 'pending_verification';

export interface TrainingRecordType {
  id: string;
  company_id: string | null;
  name: string;
  category: TrainingCategory;
  description: string | null;
  requires_hours: boolean;
  default_hours: number | null;
  recurrence_months: number | null;
  is_active: boolean;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
}

export type TrainingCategory = 
  | 'toolbox_talk'
  | 'ojt'
  | 'competency_assessment'
  | 'orientation'
  | 'course'
  | 'other';

export type CompetencyLevel = 
  | 'not_competent'
  | 'developing'
  | 'competent'
  | 'proficient'
  | 'expert';

export interface TrainingRecord {
  id: string;
  company_id: string;
  worker_id: string;
  training_type_id: string | null;
  title: string;
  description: string | null;
  category: TrainingCategory;
  completed_date: string;
  hours_completed: number | null;
  instructor_name: string | null;
  instructor_id: string | null;
  competency_level: CompetencyLevel | null;
  assessment_passed: boolean | null;
  file_path: string | null;
  file_type: string | null;
  file_name: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  topics: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  training_type?: TrainingRecordType;
  worker?: WorkerBasic;
  instructor?: WorkerBasic;
}

export interface WorkerBasic {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
}

export interface CertificationAlert {
  id: string;
  company_id: string;
  certification_id: string;
  worker_id: string;
  alert_type: '60_day' | '30_day' | '7_day' | 'expired' | 'custom';
  sent_to_worker: boolean;
  sent_to_supervisor: boolean;
  sent_to_safety_manager: boolean;
  sent_to_emails: string[] | null;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  sent_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  error_message: string | null;
  created_at: string;
}

export interface WorkRestriction {
  id: string;
  company_id: string;
  worker_id: string;
  reason: 'expired_certification' | 'missing_certification' | 'failed_assessment' | 'safety_concern' | 'other';
  certification_id: string | null;
  certification_type_id: string | null;
  description: string | null;
  restricted_from: string[] | null;
  is_active: boolean;
  auto_generated: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Dashboard & Report Types
// ============================================================================

export interface CertificationDashboardStats {
  totalWorkers: number;
  totalCertifications: number;
  activeCertifications: number;
  expiringSoon: number; // within 30 days
  expiringWarning: number; // within 60 days
  expired: number;
  pendingVerification: number;
  workersWithRestrictions: number;
  complianceRate: number; // percentage
}

export interface WorkerCertificationSummary {
  worker: WorkerBasic & {
    department: string | null;
    supervisor_id: string | null;
    certification_status: 'compliant' | 'expiring_soon' | 'expired' | 'not_checked';
    has_active_restrictions: boolean;
  };
  totalCertifications: number;
  activeCertifications: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiredCertifications: number;
  trainingHoursThisYear: number;
  lastTrainingDate: string | null;
  restrictions: WorkRestriction[];
}

export interface CertificationMatrixRow {
  worker: WorkerBasic;
  certifications: {
    [certificationTypeId: string]: {
      status: 'valid' | 'expiring' | 'expired' | 'missing';
      expiryDate: string | null;
      certificationId: string | null;
    };
  };
}

export interface ExpiryReportItem {
  certification: Certification;
  worker: WorkerBasic;
  certificationType: CertificationType | null;
  daysUntilExpiry: number;
  alertsSent: {
    day60: boolean;
    day30: boolean;
    day7: boolean;
    expired: boolean;
  };
}

export interface TrainingHoursReport {
  worker: WorkerBasic;
  totalHours: number;
  hoursByCategory: {
    toolbox_talk: number;
    ojt: number;
    competency_assessment: number;
    orientation: number;
    course: number;
    other: number;
  };
  sessionsCount: number;
}

export interface CompetencyGapReport {
  worker: WorkerBasic;
  missingCertifications: CertificationType[];
  expiredCertifications: Certification[];
  requiredTraining: TrainingRecordType[];
}

// ============================================================================
// Form/Input Types
// ============================================================================

export interface CreateCertificationInput {
  worker_id: string;
  certification_type_id?: string;
  name: string;
  issuing_organization?: string;
  certificate_number?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface CreateTrainingRecordInput {
  worker_id: string;
  training_type_id?: string;
  title: string;
  description?: string;
  category: TrainingCategory;
  completed_date: string;
  hours_completed?: number;
  instructor_name?: string;
  instructor_id?: string;
  competency_level?: CompetencyLevel;
  assessment_passed?: boolean;
  topics?: string[];
  notes?: string;
}

export interface CertificationFilterOptions {
  workerId?: string;
  certificationTypeId?: string;
  status?: CertificationStatus | 'all';
  expiringWithinDays?: number;
  verified?: boolean;
}

export interface TrainingFilterOptions {
  workerId?: string;
  trainingTypeId?: string;
  category?: TrainingCategory | 'all';
  dateFrom?: string;
  dateTo?: string;
  instructorId?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const CERTIFICATION_CATEGORIES = [
  { value: 'safety', label: 'Safety' },
  { value: 'operational', label: 'Operational' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'company-specific', label: 'Company Specific' },
] as const;

export const TRAINING_CATEGORIES = [
  { value: 'toolbox_talk', label: 'Toolbox Talk' },
  { value: 'ojt', label: 'On-the-Job Training' },
  { value: 'competency_assessment', label: 'Competency Assessment' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'course', label: 'Course/Class' },
  { value: 'other', label: 'Other' },
] as const;

export const COMPETENCY_LEVELS = [
  { value: 'not_competent', label: 'Not Competent', color: 'red' },
  { value: 'developing', label: 'Developing', color: 'amber' },
  { value: 'competent', label: 'Competent', color: 'blue' },
  { value: 'proficient', label: 'Proficient', color: 'emerald' },
  { value: 'expert', label: 'Expert', color: 'purple' },
] as const;

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'emerald' },
  expired: { label: 'Expired', color: 'red' },
  revoked: { label: 'Revoked', color: 'slate' },
  pending_verification: { label: 'Pending Verification', color: 'amber' },
};
