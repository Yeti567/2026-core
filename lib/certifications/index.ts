// ============================================================================
// Certification & Training Tracker Library
// ============================================================================

// Types
export * from './types';

// Alert utilities
export * from './expiry-alerts';

// Image processing
export * from './image-processor';

// Notification system
export {
  checkExpiringCertificationsDaily,
  sendManualReminder,
  sendEmail,
  getEmailTemplate,
  getNotificationRecipients,
} from './expiry-notifications';

// Re-export for convenience
export {
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_CATEGORIES,
  TRAINING_CATEGORIES,
  COMPETENCY_LEVELS,
} from './types';
