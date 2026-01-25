/**
 * Push Notification Triggers
 * 
 * Pre-defined notification triggers for common events in COR Pathways.
 */

import { sendPushNotification, sendPushToCompany, type PushNotificationPayload } from './send';

// =============================================================================
// CERTIFICATION NOTIFICATIONS
// =============================================================================

/**
 * Notify user when their certification is expiring
 */
export async function notifyCertificationExpiring(
  userId: string,
  certificationName: string,
  daysUntilExpiry: number
) {
  const urgency = daysUntilExpiry <= 7 ? '🚨' : daysUntilExpiry <= 30 ? '⚠️' : '📋';
  
  return sendPushNotification(userId, {
    title: `${urgency} Certification Expiring`,
    body: `Your ${certificationName} expires in ${daysUntilExpiry} days`,
    url: '/certifications',
    tag: `cert-expiry-${certificationName.replace(/\s+/g, '-').toLowerCase()}`,
    requireInteraction: daysUntilExpiry <= 7,
    actions: [
      { action: 'renew', title: 'Renew Now' },
      { action: 'dismiss', title: 'Remind Later' }
    ]
  });
}

/**
 * Notify when certification is renewed
 */
export async function notifyCertificationRenewed(
  userId: string,
  certificationName: string,
  newExpiryDate: string
) {
  return sendPushNotification(userId, {
    title: '✅ Certification Renewed',
    body: `Your ${certificationName} has been renewed. Valid until ${newExpiryDate}`,
    url: '/certifications',
    tag: 'cert-renewed'
  });
}

// =============================================================================
// FORM NOTIFICATIONS
// =============================================================================

/**
 * Notify supervisor when form needs approval
 */
export async function notifyFormPendingApproval(
  supervisorId: string,
  formName: string,
  submitterName: string,
  formId: string
) {
  return sendPushNotification(supervisorId, {
    title: '📋 Form Awaiting Approval',
    body: `${submitterName} submitted "${formName}"`,
    url: `/forms/review/${formId}`,
    tag: `form-approval-${formId}`,
    actions: [
      { action: 'review', title: 'Review Now' },
      { action: 'later', title: 'Later' }
    ]
  });
}

/**
 * Notify worker when their form is approved
 */
export async function notifyFormApproved(
  userId: string,
  formName: string,
  approverName: string
) {
  return sendPushNotification(userId, {
    title: '✅ Form Approved',
    body: `Your "${formName}" has been approved by ${approverName}`,
    url: '/forms/submissions',
    tag: 'form-approved'
  });
}

/**
 * Notify worker when their form is rejected
 */
export async function notifyFormRejected(
  userId: string,
  formName: string,
  reason: string
) {
  return sendPushNotification(userId, {
    title: '❌ Form Requires Revision',
    body: `Your "${formName}" needs changes: ${reason}`,
    url: '/forms/submissions',
    tag: 'form-rejected',
    requireInteraction: true
  });
}

// =============================================================================
// AUDIT NOTIFICATIONS
// =============================================================================

/**
 * Notify company of upcoming audit
 */
export async function notifyAuditReminder(
  companyId: string,
  daysUntilAudit: number,
  auditType: string = 'COR'
) {
  const urgency = daysUntilAudit <= 7 ? '🚨' : daysUntilAudit <= 30 ? '⚠️' : '📅';
  
  return sendPushToCompany(
    companyId,
    {
      title: `${urgency} ${auditType} Audit Coming Up`,
      body: `Your audit is scheduled in ${daysUntilAudit} days. Ensure all evidence is ready.`,
      url: '/audit/dashboard',
      tag: 'audit-reminder',
      requireInteraction: daysUntilAudit <= 7
    },
    { roles: ['admin', 'supervisor', 'safety_manager'] }
  );
}

/**
 * Notify of audit results
 */
export async function notifyAuditResults(
  companyId: string,
  passed: boolean,
  score: number
) {
  const emoji = passed ? '🎉' : '📋';
  
  return sendPushToCompany(
    companyId,
    {
      title: `${emoji} Audit Results Available`,
      body: passed 
        ? `Congratulations! You passed with a score of ${score}%` 
        : `Audit completed with score ${score}%. Action items generated.`,
      url: '/audit/results',
      tag: 'audit-results',
      requireInteraction: true
    },
    { roles: ['admin', 'supervisor', 'safety_manager'] }
  );
}

// =============================================================================
// SAFETY NOTIFICATIONS
// =============================================================================

/**
 * Daily safety reminder
 */
export async function sendDailySafetyReminder(companyId: string) {
  return sendPushToCompany(
    companyId,
    {
      title: '👷 Daily Safety Check',
      body: "Start your day safely! Complete your hazard assessment.",
      url: '/forms/hazard-assessment',
      tag: 'daily-safety-reminder'
    }
  );
}

/**
 * Notify of incident report
 */
export async function notifyIncidentReported(
  companyId: string,
  severity: 'minor' | 'moderate' | 'serious' | 'critical',
  location: string,
  incidentId: string
) {
  const severityEmoji = {
    minor: '⚠️',
    moderate: '🟠',
    serious: '🔴',
    critical: '🚨'
  };
  
  // Safe: severity is a typed union ('minor' | 'moderate' | 'serious' | 'critical')
  // eslint-disable-next-line security/detect-object-injection
  const emoji = severityEmoji[severity];
  
  return sendPushToCompany(
    companyId,
    {
      title: `${emoji} Incident Reported`,
      body: `${severity.charAt(0).toUpperCase() + severity.slice(1)} incident at ${location}`,
      url: `/incidents/${incidentId}`,
      tag: `incident-${incidentId}`,
      requireInteraction: severity === 'serious' || severity === 'critical'
    },
    { roles: ['admin', 'supervisor', 'safety_manager'] }
  );
}

/**
 * Notify of hazard identified
 */
export async function notifyHazardIdentified(
  companyId: string,
  hazardType: string,
  location: string,
  reportedBy: string
) {
  return sendPushToCompany(
    companyId,
    {
      title: '⚠️ Hazard Identified',
      body: `${hazardType} reported at ${location} by ${reportedBy}`,
      url: '/hazards',
      tag: 'hazard-reported'
    },
    { roles: ['admin', 'supervisor', 'safety_manager'] }
  );
}

// =============================================================================
// DOCUMENT NOTIFICATIONS
// =============================================================================

/**
 * Notify when document requires acknowledgment
 */
export async function notifyDocumentRequiresAcknowledgment(
  userId: string,
  documentTitle: string,
  documentId: string,
  deadlineDays: number
) {
  return sendPushNotification(userId, {
    title: '📄 Document Requires Acknowledgment',
    body: `Please review and acknowledge "${documentTitle}" within ${deadlineDays} days`,
    url: `/documents/${documentId}`,
    tag: `doc-ack-${documentId}`,
    requireInteraction: true,
    actions: [
      { action: 'acknowledge', title: 'Review Now' },
      { action: 'later', title: 'Remind Later' }
    ]
  });
}

/**
 * Notify when document is updated
 */
export async function notifyDocumentUpdated(
  companyId: string,
  documentTitle: string,
  documentId: string
) {
  return sendPushToCompany(
    companyId,
    {
      title: '📝 Document Updated',
      body: `"${documentTitle}" has been updated. Please review the changes.`,
      url: `/documents/${documentId}`,
      tag: `doc-updated-${documentId}`
    }
  );
}

// =============================================================================
// TRAINING NOTIFICATIONS
// =============================================================================

/**
 * Notify of training due
 */
export async function notifyTrainingDue(
  userId: string,
  trainingName: string,
  dueDate: string
) {
  return sendPushNotification(userId, {
    title: '📚 Training Due',
    body: `"${trainingName}" is due by ${dueDate}`,
    url: '/training',
    tag: 'training-due',
    actions: [
      { action: 'start', title: 'Start Training' },
      { action: 'later', title: 'Later' }
    ]
  });
}

/**
 * Notify of training completion
 */
export async function notifyTrainingCompleted(
  supervisorId: string,
  workerName: string,
  trainingName: string
) {
  return sendPushNotification(supervisorId, {
    title: '✅ Training Completed',
    body: `${workerName} has completed "${trainingName}"`,
    url: '/training/records',
    tag: 'training-completed'
  });
}

// =============================================================================
// SYSTEM NOTIFICATIONS
// =============================================================================

/**
 * Welcome notification for new users
 */
export async function sendWelcomeNotification(userId: string, userName: string) {
  return sendPushNotification(userId, {
    title: '👋 Welcome to COR Pathways!',
    body: `Hi ${userName}! Let's get you set up for safety success.`,
    url: '/onboarding',
    tag: 'welcome'
  });
}

/**
 * Test notification
 */
export async function sendTestNotification(userId: string) {
  return sendPushNotification(userId, {
    title: '✅ Test Notification',
    body: "Push notifications are working! You'll receive important updates here.",
    url: '/settings/notifications',
    tag: 'test'
  });
}
