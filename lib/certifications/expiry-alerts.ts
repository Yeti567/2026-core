// ============================================================================
// Certification Expiry Alert System
// ============================================================================
// This module handles checking for expiring certifications and generating
// alerts based on configured thresholds (60 days, 30 days, 7 days, expired)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Alert thresholds in days
const ALERT_THRESHOLDS = {
  SIXTY_DAYS: 60,
  THIRTY_DAYS: 30,
  SEVEN_DAYS: 7,
  EXPIRED: 0,
};

export interface ExpiryAlert {
  certificationId: string;
  workerId: string;
  workerName: string;
  workerEmail: string | null;
  certificationName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  alertType: '60_day' | '30_day' | '7_day' | 'expired';
  requiredForWork: boolean;
  companyId: string;
}

export interface AlertRecipients {
  workerEmail: string | null;
  supervisorEmail: string | null;
  safetyManagerEmails: string[];
}

/**
 * Check all certifications for expiring/expired ones and generate alerts
 */
export async function checkExpiringCertifications(
  supabaseUrl: string,
  supabaseKey: string,
  companyId?: string
): Promise<{
  alerts: ExpiryAlert[];
  byThreshold: {
    sixtyDays: ExpiryAlert[];
    thirtyDays: ExpiryAlert[];
    sevenDays: ExpiryAlert[];
    expired: ExpiryAlert[];
  };
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in60Days = new Date(today);
  in60Days.setDate(in60Days.getDate() + 60);

  // Build query
  let query = supabase
    .from('certifications')
    .select(`
      id,
      name,
      expiry_date,
      status,
      alert_60_sent,
      alert_30_sent,
      alert_7_sent,
      alert_expired_sent,
      company_id,
      worker:workers(
        id,
        first_name,
        last_name,
        email,
        supervisor_id
      ),
      certification_type:certification_types(
        name,
        required_for_work,
        alert_at_60_days,
        alert_at_30_days,
        alert_at_7_days,
        alert_on_expiry
      )
    `)
    .eq('status', 'active')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', in60Days.toISOString().split('T')[0]);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: certifications, error } = await query;

  if (error) {
    console.error('Error fetching certifications for alerts:', error);
    throw error;
  }

  const alerts: ExpiryAlert[] = [];
  const byThreshold = {
    sixtyDays: [] as ExpiryAlert[],
    thirtyDays: [] as ExpiryAlert[],
    sevenDays: [] as ExpiryAlert[],
    expired: [] as ExpiryAlert[],
  };

  // Types for Supabase join relations
  interface WorkerRelation {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    supervisor_id?: string;
  }

  interface CertTypeRelation {
    name: string;
    required_for_work: boolean;
    alert_at_60_days?: boolean;
    alert_at_30_days?: boolean;
    alert_at_7_days?: boolean;
    alert_on_expiry?: boolean;
  }

  // Helper to safely extract relation data (handles array or single object from Supabase)
  function getRelation<T>(data: unknown): T | null {
    if (!data) return null;
    if (Array.isArray(data)) return (data[0] as T) || null;
    return data as T;
  }

  for (const cert of certifications || []) {
    const worker = getRelation<WorkerRelation>(cert.worker);
    const certType = getRelation<CertTypeRelation>(cert.certification_type);

    if (!worker || !cert.expiry_date) continue;

    const expiryDate = new Date(cert.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine alert type based on days until expiry
    let alertType: '60_day' | '30_day' | '7_day' | 'expired' | null = null;
    let alreadySent = false;

    const createAlert = (): ExpiryAlert => {
      const alert: ExpiryAlert = {
        certificationId: cert.id,
        workerId: worker.id,
        workerName: `${worker.first_name} ${worker.last_name}`,
        workerEmail: worker.email,
        certificationName: cert.name,
        expiryDate: cert.expiry_date,
        daysUntilExpiry,
        alertType: alertType!,
        requiredForWork: certType?.required_for_work || false,
        companyId: cert.company_id,
      };
      alerts.push(alert);
      return alert;
    };

    if (daysUntilExpiry <= 0) {
      alertType = 'expired';
      alreadySent = cert.alert_expired_sent;
      if (!alreadySent && certType?.alert_on_expiry !== false) {
        byThreshold.expired.push(createAlert());
      }
    } else if (daysUntilExpiry <= 7) {
      alertType = '7_day';
      alreadySent = cert.alert_7_sent;
      if (!alreadySent && certType?.alert_at_7_days !== false) {
        byThreshold.sevenDays.push(createAlert());
      }
    } else if (daysUntilExpiry <= 30) {
      alertType = '30_day';
      alreadySent = cert.alert_30_sent;
      if (!alreadySent && certType?.alert_at_30_days !== false) {
        byThreshold.thirtyDays.push(createAlert());
      }
    } else if (daysUntilExpiry <= 60) {
      alertType = '60_day';
      alreadySent = cert.alert_60_sent;
      if (!alreadySent && certType?.alert_at_60_days !== false) {
        byThreshold.sixtyDays.push(createAlert());
      }
    }
  }

  return { alerts, byThreshold };
}

/**
 * Mark an alert as sent in the database
 */
export async function markAlertSent(
  supabaseUrl: string,
  supabaseKey: string,
  certificationId: string,
  alertType: '60_day' | '30_day' | '7_day' | 'expired'
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Safe: alertType is a typed literal union ('60_day' | '30_day' | '7_day' | 'expired')
  // eslint-disable-next-line security/detect-object-injection
  const updateField = {
    '60_day': 'alert_60_sent',
    '30_day': 'alert_30_sent',
    '7_day': 'alert_7_sent',
    'expired': 'alert_expired_sent',
  }[alertType];

  // Safe: updateField is a controlled value derived from alertType literal mapping

  await supabase
    .from('certifications')
    .update({
      [updateField]: true,
      last_alert_sent: new Date().toISOString(),
    })
    .eq('id', certificationId);
}

/**
 * Create an alert record in the database
 */
export async function createAlertRecord(
  supabaseUrl: string,
  supabaseKey: string,
  alert: ExpiryAlert,
  recipients: AlertRecipients,
  status: 'pending' | 'sent' | 'failed' = 'pending'
): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('certification_alerts')
    .insert({
      company_id: alert.companyId,
      certification_id: alert.certificationId,
      worker_id: alert.workerId,
      alert_type: alert.alertType,
      sent_to_worker: !!recipients.workerEmail,
      sent_to_supervisor: !!recipients.supervisorEmail,
      sent_to_safety_manager: recipients.safetyManagerEmails.length > 0,
      sent_to_emails: [
        recipients.workerEmail,
        recipients.supervisorEmail,
        ...recipients.safetyManagerEmails,
      ].filter(Boolean),
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating alert record:', error);
    throw error;
  }

  return data.id;
}

/**
 * Get email content for an expiry alert
 */
export function getAlertEmailContent(alert: ExpiryAlert): {
  subject: string;
  body: string;
  urgencyLevel: 'critical' | 'warning' | 'notice';
} {
  const urgencyLevel =
    alert.alertType === 'expired' || alert.alertType === '7_day' ? 'critical' :
      alert.alertType === '30_day' ? 'warning' : 'notice';

  // Safe: urgencyLevel is a controlled string literal ('critical' | 'warning' | 'notice')
  // eslint-disable-next-line security/detect-object-injection
  const urgencyPrefix = {
    critical: '🚨 URGENT',
    warning: '⚠️ WARNING',
    notice: '📋 NOTICE',
  }[urgencyLevel];

  // Safe: alert.alertType is a typed union ('60_day' | '30_day' | '7_day' | 'expired')

  const statusText = {
    'expired': 'HAS EXPIRED',
    '7_day': 'expires in 7 days or less',
    '30_day': 'expires in 30 days',
    '60_day': 'expires in 60 days',
  }[alert.alertType];

  const subject = `${urgencyPrefix}: ${alert.certificationName} ${statusText} - ${alert.workerName}`;

  const expiryDateFormatted = new Date(alert.expiryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = `
Certification Expiry Alert
===========================

Worker: ${alert.workerName}
Certification: ${alert.certificationName}
Expiry Date: ${expiryDateFormatted}
Days Until Expiry: ${alert.daysUntilExpiry <= 0 ? 'EXPIRED' : alert.daysUntilExpiry + ' days'}
Required for Work: ${alert.requiredForWork ? 'YES' : 'No'}

${alert.requiredForWork && alert.daysUntilExpiry <= 0 ? `
⚠️ IMPORTANT: This certification is REQUIRED FOR WORK.
The worker may be restricted from certain tasks until renewed.
` : ''}

Please ensure this certification is renewed before it expires to maintain compliance.

---
This is an automated notification from the Certification Tracking System.
  `.trim();

  return { subject, body, urgencyLevel };
}

/**
 * Summary of alerts for dashboard display
 */
export function getAlertsSummary(alerts: ExpiryAlert[]): {
  total: number;
  critical: number;
  warning: number;
  notice: number;
  requiredCerts: number;
} {
  return {
    total: alerts.length,
    critical: alerts.filter(a => a.alertType === 'expired' || a.alertType === '7_day').length,
    warning: alerts.filter(a => a.alertType === '30_day').length,
    notice: alerts.filter(a => a.alertType === '60_day').length,
    requiredCerts: alerts.filter(a => a.requiredForWork).length,
  };
}
