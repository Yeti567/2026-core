/**
 * Daily Notification Jobs
 * 
 * Scheduled tasks for sending daily notifications.
 * Can be triggered via Vercel Cron, AWS Lambda, or similar.
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';
import {
  sendDailySafetyReminder,
  notifyCertificationExpiring,
  notifyAuditReminder
} from '@/lib/push-notifications/triggers';

/**
 * Run all daily notification jobs
 */
export async function runDailyNotifications() {
  console.log('[Cron] Starting daily notifications...');

  const results = {
    safetyReminders: { sent: 0, failed: 0 },
    certificationAlerts: { sent: 0, failed: 0 },
    auditReminders: { sent: 0, failed: 0 },
  };

  try {
    // Send daily safety reminders
    results.safetyReminders = await sendDailySafetyReminders();

    // Check for expiring certifications
    results.certificationAlerts = await checkExpiringCertifications();

    // Send audit reminders
    results.auditReminders = await checkUpcomingAudits();

  } catch (error) {
    console.error('[Cron] Daily notifications error:', error);
  }

  console.log('[Cron] Daily notifications complete:', results);
  return results;
}

/**
 * Send daily safety reminders to all active companies
 */
async function sendDailySafetyReminders() {
  const supabase = createRouteHandlerClient();

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('is_active', true);

  if (!companies) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const company of companies) {
    try {
      const result = await sendDailySafetyReminder(company.id);
      sent += result.sent;
      failed += result.failed;
    } catch (error) {
      console.error(`[Cron] Failed to send safety reminder to ${company.name}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Check for certifications expiring in 7, 30, or 60 days
 */
async function checkExpiringCertifications() {
  const supabase = createRouteHandlerClient();

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  let sent = 0;
  let failed = 0;

  // Get certifications expiring at key milestones
  const { data: expiringCerts } = await supabase
    .from('worker_certifications')
    .select(`
      id,
      worker_id,
      expiry_date,
      certification_types (
        certification_name
      )
    `)
    .eq('status', 'active')
    .not('expiry_date', 'is', null)
    .gte('expiry_date', now.toISOString())
    .lte('expiry_date', in60Days.toISOString());

  if (!expiringCerts) return { sent: 0, failed: 0 };

  for (const cert of expiringCerts) {
    const expiryDate = new Date(cert.expiry_date);
    const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Only notify at specific milestones
    if (![7, 30, 60].includes(daysUntil)) continue;

    try {
      // Helper type and function for relation extraction
      interface CertTypeInfo { certification_name?: string; }
      const getCertType = (data: unknown): CertTypeInfo | null => {
        if (!data) return null;
        if (Array.isArray(data)) return (data[0] as CertTypeInfo) || null;
        return data as CertTypeInfo;
      };

      const certType = getCertType(cert.certification_types);
      const certName = certType?.certification_name || 'Certification';
      const result = await notifyCertificationExpiring(cert.worker_id, certName, daysUntil);
      sent += result.sent;
      failed += result.failed;
    } catch (error) {
      console.error(`[Cron] Failed to send cert expiry alert:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Check for upcoming audits
 */
async function checkUpcomingAudits() {
  const supabase = createRouteHandlerClient();

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let sent = 0;
  let failed = 0;

  // Get companies with upcoming audits
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, audit_date')
    .eq('is_active', true)
    .not('audit_date', 'is', null)
    .gte('audit_date', now.toISOString())
    .lte('audit_date', in30Days.toISOString());

  if (!companies) return { sent: 0, failed: 0 };

  for (const company of companies) {
    const auditDate = new Date(company.audit_date);
    const daysUntil = Math.ceil((auditDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Only notify at specific milestones
    if (![7, 14, 30].includes(daysUntil)) continue;

    try {
      const result = await notifyAuditReminder(company.id, daysUntil, 'COR');
      sent += result.sent;
      failed += result.failed;
    } catch (error) {
      console.error(`[Cron] Failed to send audit reminder to ${company.name}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Clean up old/inactive push subscriptions
 */
export async function cleanupOldSubscriptions() {
  const supabase = createRouteHandlerClient();

  // Delete subscriptions not used in 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('push_subscriptions')
    .delete()
    .lt('last_used_at', ninetyDaysAgo)
    .eq('is_active', false)
    .select('id');

  if (error) {
    console.error('[Cron] Failed to cleanup old subscriptions:', error);
    return { deleted: 0 };
  }

  console.log('[Cron] Cleaned up old subscriptions');
  return { deleted: data?.length || 0 };
}
