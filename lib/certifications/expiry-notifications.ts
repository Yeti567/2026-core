/**
 * Certification Expiry Notification System
 * 
 * Handles automated email notifications for expiring certifications.
 * Runs daily via cron job to check and send reminders.
 */

import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface CertificationReminder {
  id: string;
  certification_id: string;
  reminder_type: '60_day' | '30_day' | '7_day' | 'expired';
  scheduled_date: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  error_message: string | null;
  company_id: string;
  worker_certification?: WorkerCertificationWithDetails;
}

interface WorkerCertificationWithDetails {
  id: string;
  worker_id: string;
  certificate_number: string | null;
  expiry_date: string;
  certification_type: {
    certification_name: string;
    certification_code: string;
  };
  worker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Company {
  id: string;
  name: string;
  domain: string | null;
  phone: string | null;
  safety_manager_email: string | null;
  safety_manager_name: string | null;
}

interface EmailParams {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

interface NotificationResult {
  success: boolean;
  remindersCreated: number;
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// =============================================================================
// MAIN DAILY CHECK FUNCTION
// =============================================================================

/**
 * Main function to run daily via cron job.
 * Checks for expiring certifications and sends notifications.
 */
export async function checkExpiringCertificationsDaily(): Promise<NotificationResult> {
  console.log('🔔 Starting daily certification expiry check...');
  
  const result: NotificationResult = {
    success: true,
    remindersCreated: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
  };

  const supabase = getSupabaseClient();

  try {
    // Step 1: Generate reminder records for certifications approaching expiry
    console.log('📋 Generating expiry reminders...');
    const { data: remindersData, error: remindersError } = await supabase
      .rpc('generate_expiry_reminders');

    if (remindersError) {
      console.error('Error generating reminders:', remindersError);
      result.errors.push(`Failed to generate reminders: ${remindersError.message}`);
    } else {
      result.remindersCreated = remindersData || 0;
      console.log(`✅ Created ${result.remindersCreated} new reminders`);
    }

    // Step 2: Get pending reminders that should be sent today
    console.log('📧 Fetching pending reminders to send...');
    const today = new Date().toISOString().split('T')[0];
    
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('certification_reminders')
      .select(`
        *,
        worker_certification:worker_certifications (
          id,
          worker_id,
          certificate_number,
          expiry_date,
          certification_type:certification_types (
            certification_name,
            certification_code
          ),
          worker:user_profiles!worker_certifications_worker_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_date', today)
      .order('scheduled_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching pending reminders:', fetchError);
      result.errors.push(`Failed to fetch reminders: ${fetchError.message}`);
      result.success = false;
      return result;
    }

    console.log(`📬 Found ${pendingReminders?.length || 0} pending reminders to process`);

    // Step 3: Send notifications for each reminder
    for (const reminder of pendingReminders || []) {
      try {
        await sendExpiryNotification(supabase, reminder as CertificationReminder);
        result.emailsSent++;
      } catch (error: any) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        result.emailsFailed++;
        result.errors.push(`Reminder ${reminder.id}: ${error.message}`);

        // Update reminder status to failed
        await supabase
          .from('certification_reminders')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', reminder.id);
      }
    }

    // Step 4: Check for newly expired certifications and send expired notifications
    console.log('🔍 Checking for newly expired certifications...');
    await checkAndNotifyExpired(supabase, result);

    console.log('✅ Daily expiry check completed');
    console.log(`   Reminders created: ${result.remindersCreated}`);
    console.log(`   Emails sent: ${result.emailsSent}`);
    console.log(`   Emails failed: ${result.emailsFailed}`);

    return result;
  } catch (error: any) {
    console.error('❌ Error in daily expiry check:', error);
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
}

// =============================================================================
// SEND NOTIFICATION
// =============================================================================

/**
 * Send expiry notification email for a specific reminder
 */
async function sendExpiryNotification(
  supabase: ReturnType<typeof getSupabaseClient>,
  reminder: CertificationReminder
): Promise<void> {
  const cert = reminder.worker_certification;
  if (!cert || !cert.worker || !cert.certification_type) {
    throw new Error('Missing certification or worker data');
  }

  const worker = cert.worker;

  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, domain, phone, safety_manager_email, safety_manager_name')
    .eq('id', reminder.company_id)
    .single();

  if (!company) {
    throw new Error('Company not found');
  }

  // Get recipients based on reminder type
  const recipients = await getNotificationRecipients(
    supabase,
    reminder.reminder_type,
    worker,
    reminder.company_id
  );

  if (recipients.length === 0) {
    throw new Error('No valid recipients found');
  }

  // Generate email template
  const template = getEmailTemplate(
    reminder.reminder_type,
    cert,
    worker,
    company
  );

  if (!template) {
    throw new Error(`No template found for reminder type: ${reminder.reminder_type}`);
  }

  // Send email
  const fromEmail = company.domain
    ? `${company.name} Safety <safety@${company.domain}>`
    : `${company.name} Safety <noreply@safetytracker.app>`;

  await sendEmail({
    from: fromEmail,
    to: recipients,
    subject: template.subject,
    html: template.html,
    replyTo: company.safety_manager_email || undefined,
  });

  // Mark reminder as sent
  await supabase
    .from('certification_reminders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', reminder.id);

  // Log the notification
  await logNotification(supabase, {
    reminder_id: reminder.id,
    certification_id: cert.id,
    worker_id: worker.id,
    company_id: reminder.company_id,
    reminder_type: reminder.reminder_type,
    recipients,
    subject: template.subject,
    sent_at: new Date().toISOString(),
  });

  console.log(`✉️ Sent ${reminder.reminder_type} notification for ${cert.certification_type.certification_name} to ${recipients.join(', ')}`);
}

// =============================================================================
// RECIPIENT MANAGEMENT
// =============================================================================

/**
 * Determine notification recipients based on reminder type
 */
async function getNotificationRecipients(
  supabase: ReturnType<typeof getSupabaseClient>,
  reminderType: string,
  worker: { id: string; email: string },
  companyId: string
): Promise<string[]> {
  const recipients: string[] = [];

  // Always notify the worker
  if (worker.email) {
    recipients.push(worker.email);
  }

  // Get supervisor (worker's direct supervisor)
  const { data: supervisor } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('company_id', companyId)
    .eq('role', 'supervisor')
    .limit(1)
    .single();

  if (supervisor?.email) {
    recipients.push(supervisor.email);
  }

  // Get safety manager for 30-day and 7-day reminders
  if (reminderType === '30_day' || reminderType === '7_day' || reminderType === 'expired') {
    const { data: safetyManager } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('company_id', companyId)
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (safetyManager?.email && !recipients.includes(safetyManager.email)) {
      recipients.push(safetyManager.email);
    }
  }

  // Get internal auditor for 7-day and expired reminders
  if (reminderType === '7_day' || reminderType === 'expired') {
    const { data: auditor } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('company_id', companyId)
      .eq('role', 'internal_auditor')
      .limit(1)
      .single();

    if (auditor?.email && !recipients.includes(auditor.email)) {
      recipients.push(auditor.email);
    }
  }

  return recipients.filter(Boolean);
}

// =============================================================================
// CHECK EXPIRED CERTIFICATIONS
// =============================================================================

/**
 * Check for certifications that have just expired and send notifications
 */
async function checkAndNotifyExpired(
  supabase: ReturnType<typeof getSupabaseClient>,
  result: NotificationResult
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Find certifications that expired today and haven't been notified
  const { data: expiredCerts } = await supabase
    .from('worker_certifications')
    .select(`
      id,
      worker_id,
      certificate_number,
      expiry_date,
      company_id,
      certification_type:certification_types (
        certification_name,
        certification_code
      ),
      worker:user_profiles!worker_certifications_worker_id_fkey (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('expiry_date', today)
    .eq('status', 'active');

  for (const cert of expiredCerts || []) {
    try {
      // Check if expired notification already sent
      const { data: existingReminder } = await supabase
        .from('certification_reminders')
        .select('id')
        .eq('certification_id', cert.id)
        .eq('reminder_type', 'expired')
        .single();

      if (existingReminder) continue;

      // Create expired reminder
      const { data: reminder } = await supabase
        .from('certification_reminders')
        .insert({
          certification_id: cert.id,
          reminder_type: 'expired',
          scheduled_date: today,
          status: 'pending',
          company_id: cert.company_id,
        })
        .select()
        .single();

      if (reminder) {
        // Update certification status to expired
        await supabase
          .from('worker_certifications')
          .update({ status: 'expired' })
          .eq('id', cert.id);

        // Send expired notification
        await sendExpiryNotification(supabase, {
          ...reminder,
          worker_certification: cert as any,
        } as CertificationReminder);

        result.emailsSent++;
      }
    } catch (error: any) {
      console.error(`Failed to process expired cert ${cert.id}:`, error);
      result.emailsFailed++;
      result.errors.push(`Expired cert ${cert.id}: ${error.message}`);
    }
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Get the appropriate email template based on reminder type
 */
function getEmailTemplate(
  reminderType: string,
  cert: WorkerCertificationWithDetails,
  worker: { first_name: string; last_name: string; email: string },
  company: Company
): EmailTemplate | null {
  const daysUntilExpiry = Math.ceil(
    (new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const certName = cert.certification_type.certification_name;
  const certCode = cert.certification_type.certification_code;
  const certNumber = cert.certificate_number || 'N/A';
  const expiryDate = new Date(cert.expiry_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const companyPhone = company.phone || '(Contact your supervisor)';
  const safetyManagerName = company.safety_manager_name || 'Safety Manager';
  const companyDomain = company.domain || 'safetytracker.app';

  const baseStyles = `
    <style>
      .email-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { padding: 30px; text-align: center; }
      .content { padding: 0 30px 30px; }
      .footer { padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
      .cert-details { padding: 15px; border-radius: 8px; margin: 20px 0; }
      .contact-box { background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .action-list { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
      ul { padding-left: 20px; }
      li { margin: 8px 0; }
    </style>
  `;

  switch (reminderType) {
    case '60_day':
      return {
        subject: `Reminder: ${certName} (${certCode}) expires in 60 days`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
            <div class="email-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div class="header" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                <h2 style="color: #92400e; margin: 0; font-size: 24px;">⚠️ Certification Expiring in 60 Days</h2>
              </div>
              
              <div class="content">
                <p style="font-size: 16px;">Hi ${worker.first_name},</p>
                
                <p>This is a friendly reminder that your <strong>${certName}</strong> certification will expire in approximately <strong>60 days</strong>.</p>
                
                <div class="cert-details" style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                  <strong style="font-size: 14px; color: #92400e;">📋 Certificate Details</strong><br><br>
                  <table style="width: 100%; font-size: 14px;">
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certification:</td><td style="padding: 4px 0;"><strong>${certName}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Code:</td><td style="padding: 4px 0;">${certCode}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certificate #:</td><td style="padding: 4px 0;">${certNumber}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Expiry Date:</td><td style="padding: 4px 0;"><strong>${expiryDate}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Days Remaining:</td><td style="padding: 4px 0;"><strong style="color: #f59e0b;">${daysUntilExpiry} days</strong></td></tr>
                  </table>
                </div>
                
                <div class="action-list">
                  <strong>📌 Recommended Actions:</strong>
                  <ul>
                    <li>Start planning your certification renewal</li>
                    <li>Contact your supervisor to schedule training if needed</li>
                    <li>Check available training dates with approved providers</li>
                  </ul>
                </div>
                
                <p>Thank you for maintaining your safety certifications!</p>
                
                <p>Best regards,<br><strong>${company.name} Safety Team</strong></p>
              </div>
              
              <div class="footer">
                <p style="margin: 0;">This is an automated reminder from ${company.name} Safety Management System.</p>
                <p style="margin: 8px 0 0;">If you have already renewed this certification, please upload the new certificate to the system.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case '30_day':
      return {
        subject: `⚠️ IMPORTANT: ${certName} (${certCode}) expires in 30 days`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
            <div class="email-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div class="header" style="background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);">
                <h2 style="color: #9a3412; margin: 0; font-size: 24px;">⚠️ IMPORTANT: Certification Expiring in 30 Days</h2>
              </div>
              
              <div class="content">
                <p style="font-size: 16px;">Hi ${worker.first_name},</p>
                
                <p><strong style="color: #ea580c;">IMPORTANT:</strong> Your <strong>${certName}</strong> certification will expire in approximately <strong>30 days</strong>. Please take action now to ensure continuity.</p>
                
                <div class="cert-details" style="background-color: #ffedd5; border-left: 4px solid #f97316;">
                  <strong style="font-size: 14px; color: #9a3412;">📋 Certificate Details</strong><br><br>
                  <table style="width: 100%; font-size: 14px;">
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certification:</td><td style="padding: 4px 0;"><strong>${certName}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Code:</td><td style="padding: 4px 0;">${certCode}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certificate #:</td><td style="padding: 4px 0;">${certNumber}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Expiry Date:</td><td style="padding: 4px 0;"><strong style="color: #ea580c;">${expiryDate}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Days Remaining:</td><td style="padding: 4px 0;"><strong style="color: #ea580c;">${daysUntilExpiry} days</strong></td></tr>
                  </table>
                </div>
                
                <div class="action-list" style="background-color: #fff7ed; border: 1px solid #fed7aa;">
                  <strong style="color: #9a3412;">⚡ URGENT Action Required:</strong>
                  <ul>
                    <li><strong>Contact your supervisor immediately</strong> to arrange renewal training</li>
                    <li>Book training with an approved provider</li>
                    <li>If already renewed, upload new certificate NOW</li>
                  </ul>
                </div>
                
                <div class="contact-box">
                  <strong>📞 Need Help?</strong><br><br>
                  <strong>${safetyManagerName}</strong> (Safety Manager)<br>
                  Email: safety@${companyDomain}<br>
                  Phone: ${companyPhone}
                </div>
                
                <p>Thank you,<br><strong>${company.name} Safety Team</strong></p>
              </div>
              
              <div class="footer">
                <p style="margin: 0;">⚠️ This notification has also been sent to your supervisor and safety manager.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case '7_day':
      return {
        subject: `🚨 URGENT: ${certName} (${certCode}) expires in ${daysUntilExpiry} days - IMMEDIATE ACTION REQUIRED`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
            <div class="email-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div class="header" style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); padding: 30px;">
                <div style="background-color: #dc2626; color: white; padding: 10px 20px; border-radius: 8px; display: inline-block; margin-bottom: 15px;">
                  🚨 URGENT NOTICE
                </div>
                <h2 style="color: #991b1b; margin: 0; font-size: 24px;">Certification Expires in ${daysUntilExpiry} Days</h2>
              </div>
              
              <div class="content">
                <p style="font-size: 16px;">Hi ${worker.first_name},</p>
                
                <p><strong style="color: #dc2626;">⚠️ CRITICAL:</strong> Your <strong>${certName}</strong> certification will expire in <strong style="color: #dc2626;">${daysUntilExpiry} days</strong>.</p>
                
                <div class="cert-details" style="background-color: #fee2e2; border: 2px solid #dc2626;">
                  <strong style="font-size: 14px; color: #991b1b;">📋 Certificate Details</strong><br><br>
                  <table style="width: 100%; font-size: 14px;">
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certification:</td><td style="padding: 4px 0;"><strong>${certName}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Code:</td><td style="padding: 4px 0;">${certCode}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certificate #:</td><td style="padding: 4px 0;">${certNumber}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Expiry Date:</td><td style="padding: 4px 0;"><strong style="color: #dc2626; font-size: 16px;">${expiryDate}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Days Remaining:</td><td style="padding: 4px 0;"><strong style="color: #dc2626; font-size: 18px;">${daysUntilExpiry} DAYS</strong></td></tr>
                  </table>
                </div>
                
                <div style="background-color: #fef2f2; border: 2px solid #fca5a5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <strong style="color: #991b1b;">🚨 IMMEDIATE Action Required:</strong>
                  <ul style="margin-bottom: 0;">
                    <li><strong>Contact your supervisor TODAY</strong></li>
                    <li><strong>Arrange renewal training IMMEDIATELY</strong></li>
                    <li>If you have renewed, upload new certificate NOW</li>
                  </ul>
                </div>
                
                <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                  <strong style="color: #991b1b;">⛔ WARNING:</strong><br>
                  If this certification expires, you will <strong>NOT be permitted</strong> to perform tasks requiring this certification until it is renewed.
                </div>
                
                <div class="contact-box">
                  <strong>📞 Emergency Contact:</strong><br><br>
                  <strong>${safetyManagerName}</strong> (Safety Manager)<br>
                  Email: safety@${companyDomain}<br>
                  Phone: ${companyPhone}<br><br>
                  <strong style="color: #2563eb;">📱 CALL OR EMAIL IMMEDIATELY</strong>
                </div>
                
                <p style="font-size: 14px; color: #991b1b;"><strong>This is your final reminder before expiration.</strong></p>
                
                <p>${company.name} Safety Team</p>
              </div>
              
              <div class="footer">
                <p style="margin: 0;">🚨 This URGENT notification has been sent to:</p>
                <ul style="margin: 8px 0; padding-left: 20px;">
                  <li>You (${worker.email})</li>
                  <li>Your Supervisor</li>
                  <li>Safety Manager</li>
                  <li>Internal Auditor</li>
                </ul>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'expired':
      return {
        subject: `❌ ${certName} (${certCode}) HAS EXPIRED - Work Restriction Applied`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
            <div class="email-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="background-color: #991b1b; color: white; padding: 30px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <h2 style="margin: 0; font-size: 24px;">CERTIFICATION EXPIRED</h2>
                <p style="margin: 10px 0 0; opacity: 0.9;">Work Restriction Now in Effect</p>
              </div>
              
              <div class="content">
                <p style="font-size: 16px;">Hi ${worker.first_name},</p>
                
                <p><strong style="color: #991b1b;">Your ${certName} certification has EXPIRED.</strong></p>
                
                <div class="cert-details" style="background-color: #fee2e2; border: 2px solid #991b1b;">
                  <strong style="font-size: 14px; color: #991b1b;">📋 Certificate Details</strong><br><br>
                  <table style="width: 100%; font-size: 14px;">
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certification:</td><td style="padding: 4px 0;"><strong>${certName}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Code:</td><td style="padding: 4px 0;">${certCode}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Certificate #:</td><td style="padding: 4px 0;">${certNumber}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Expired On:</td><td style="padding: 4px 0;"><strong style="color: #991b1b;">${expiryDate}</strong></td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Status:</td><td style="padding: 4px 0;"><span style="background-color: #991b1b; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">EXPIRED</span></td></tr>
                  </table>
                </div>
                
                <div style="background-color: #fef2f2; border: 2px solid #991b1b; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <strong style="color: #991b1b; font-size: 18px;">⛔ WORK RESTRICTION IN EFFECT</strong><br><br>
                  <p style="margin: 0;">You are <strong>NOT PERMITTED</strong> to perform any tasks requiring this certification until it is renewed.</p>
                </div>
                
                <div class="action-list">
                  <strong>✅ Required Actions:</strong>
                  <ol>
                    <li><strong>Contact Safety Manager IMMEDIATELY</strong></li>
                    <li>Schedule renewal training</li>
                    <li>Complete training and upload new certificate</li>
                    <li>Work restriction will be lifted once renewed</li>
                  </ol>
                </div>
                
                <div class="contact-box">
                  <strong>📞 Contact Safety Department:</strong><br><br>
                  <strong>${safetyManagerName}</strong><br>
                  Email: safety@${companyDomain}<br>
                  Phone: ${companyPhone}
                </div>
                
                <p>${company.name} Safety Team</p>
              </div>
              
              <div class="footer" style="background-color: #fee2e2;">
                <p style="margin: 0; color: #991b1b;">⚠️ Your profile has been flagged with an expired certification.</p>
                <p style="margin: 8px 0 0;">Supervisors and project managers have been notified of this work restriction.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return null;
  }
}

// =============================================================================
// EMAIL SERVICE
// =============================================================================

/**
 * Send email using configured email service
 */
async function sendEmail(params: EmailParams): Promise<void> {
  const emailProvider = process.env.EMAIL_PROVIDER || 'resend';

  switch (emailProvider) {
    case 'resend':
      await sendWithResend(params);
      break;
    case 'sendgrid':
      await sendWithSendGrid(params);
      break;
    case 'ses':
      await sendWithAWSSES(params);
      break;
    default:
      // Log-only mode for development
      console.log('📧 Email (dev mode):', {
        to: params.to,
        subject: params.subject,
        from: params.from,
      });
  }
}

/**
 * Send email via Resend
 */
async function sendWithResend(params: EmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend error: ${error.message || response.statusText}`);
  }
}

/**
 * Send email via SendGrid
 */
async function sendWithSendGrid(params: EmailParams): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: params.to.map(email => ({ email })) }],
      from: { email: params.from.match(/<(.+)>/)?.[1] || params.from },
      subject: params.subject,
      content: [{ type: 'text/html', value: params.html }],
      reply_to: params.replyTo ? { email: params.replyTo } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }
}

/**
 * Send email via AWS SES
 */
async function sendWithAWSSES(params: EmailParams): Promise<void> {
  // AWS SES implementation would go here
  // Requires @aws-sdk/client-ses package
  throw new Error('AWS SES not yet implemented');
}

// =============================================================================
// LOGGING
// =============================================================================

interface NotificationLog {
  reminder_id: string;
  certification_id: string;
  worker_id: string;
  company_id: string;
  reminder_type: string;
  recipients: string[];
  subject: string;
  sent_at: string;
}

/**
 * Log notification for audit trail
 */
async function logNotification(
  supabase: ReturnType<typeof getSupabaseClient>,
  log: NotificationLog
): Promise<void> {
  try {
    await supabase.from('notification_logs').insert({
      ...log,
      recipients: log.recipients.join(', '),
    });
  } catch (error) {
    console.error('Failed to log notification:', error);
    // Don't throw - logging failure shouldn't stop the process
  }
}

// =============================================================================
// MANUAL TRIGGER
// =============================================================================

/**
 * Manually send a reminder for a specific certification
 */
export async function sendManualReminder(
  certificationId: string,
  reminderType: '60_day' | '30_day' | '7_day' | 'expired'
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    // Get certification details
    const { data: cert, error: certError } = await supabase
      .from('worker_certifications')
      .select(`
        id,
        worker_id,
        certificate_number,
        expiry_date,
        company_id,
        certification_type:certification_types (
          certification_name,
          certification_code
        ),
        worker:user_profiles!worker_certifications_worker_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', certificationId)
      .single();

    if (certError || !cert) {
      return { success: false, error: 'Certification not found' };
    }

    // Create a temporary reminder object
    const reminder: CertificationReminder = {
      id: `manual-${Date.now()}`,
      certification_id: certificationId,
      reminder_type: reminderType,
      scheduled_date: new Date().toISOString(),
      status: 'pending',
      sent_at: null,
      error_message: null,
      company_id: cert.company_id,
      worker_certification: cert as any,
    };

    await sendExpiryNotification(supabase, reminder);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  sendEmail,
  getEmailTemplate,
  getNotificationRecipients,
};
