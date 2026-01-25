/**
 * Supabase Edge Function: Check Expiring Certifications
 * 
 * This function runs daily via cron to check for expiring certifications
 * and send email notifications to workers, supervisors, and safety managers.
 * 
 * Schedule: 0 6 * * * (Daily at 6 AM UTC)
 * 
 * To deploy:
 * supabase functions deploy check-expiring-certs
 * 
 * To schedule (in Supabase Dashboard or via SQL):
 * SELECT cron.schedule(
 *   'check-expiring-certs-daily',
 *   '0 6 * * *',
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://<project-ref>.supabase.co/functions/v1/check-expiring-certs',
 *     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('supabase.service_role_key')),
 *     body := '{}'::jsonb
 *   );
 *   $$
 * );
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// TYPES
// =============================================================================

interface CertificationReminder {
  id: string;
  certification_id: string;
  reminder_type: string;
  scheduled_date: string;
  status: string;
  company_id: string;
  worker_certification?: {
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

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔔 Starting daily certification expiry check...');

    const result = {
      remindersCreated: 0,
      emailsSent: 0,
      emailsFailed: 0,
      errors: [] as string[],
    };

    // Step 1: Generate new reminder records
    console.log('📋 Generating expiry reminders...');
    const { data: remindersData, error: remindersError } = await supabase
      .rpc('generate_expiry_reminders');

    if (remindersError) {
      console.error('Error generating reminders:', remindersError);
      result.errors.push(`Generate reminders: ${remindersError.message}`);
    } else {
      result.remindersCreated = remindersData || 0;
      console.log(`✅ Created ${result.remindersCreated} new reminders`);
    }

    // Step 2: Get pending reminders to send
    console.log('📧 Fetching pending reminders...');
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
      .order('scheduled_date', { ascending: true })
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      throw new Error(`Failed to fetch reminders: ${fetchError.message}`);
    }

    console.log(`📬 Found ${pendingReminders?.length || 0} pending reminders`);

    // Step 3: Process each reminder
    for (const reminder of pendingReminders || []) {
      try {
        await processReminder(supabase, reminder as CertificationReminder);
        result.emailsSent++;
      } catch (error: any) {
        console.error(`Failed to process reminder ${reminder.id}:`, error);
        result.emailsFailed++;
        result.errors.push(`Reminder ${reminder.id}: ${error.message}`);

        // Mark as failed
        await supabase
          .from('certification_reminders')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', reminder.id);
      }
    }

    // Step 4: Check for newly expired certifications
    console.log('🔍 Checking for newly expired certifications...');
    await checkExpiredCertifications(supabase, result);

    console.log('✅ Daily check completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expiry check completed',
        ...result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error in expiry check:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// =============================================================================
// PROCESS REMINDER
// =============================================================================

async function processReminder(
  supabase: ReturnType<typeof createClient>,
  reminder: CertificationReminder
): Promise<void> {
  const cert = reminder.worker_certification;
  if (!cert || !cert.worker || !cert.certification_type) {
    throw new Error('Missing certification or worker data');
  }

  // Get company
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, domain, phone, safety_manager_email, safety_manager_name')
    .eq('id', reminder.company_id)
    .single();

  if (!company) {
    throw new Error('Company not found');
  }

  // Get recipients
  const recipients = await getRecipients(supabase, reminder, company.id);

  if (recipients.length === 0) {
    throw new Error('No valid recipients');
  }

  // Generate email
  const emailContent = generateEmail(reminder, cert, company);

  // Send email
  await sendEmail({
    from: company.domain
      ? `${company.name} Safety <safety@${company.domain}>`
      : `${company.name} Safety <noreply@safetytracker.app>`,
    to: recipients,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  // Mark as sent
  await supabase
    .from('certification_reminders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', reminder.id);

  console.log(`✉️ Sent ${reminder.reminder_type} to ${recipients.join(', ')}`);
}

// =============================================================================
// GET RECIPIENTS
// =============================================================================

async function getRecipients(
  supabase: ReturnType<typeof createClient>,
  reminder: CertificationReminder,
  companyId: string
): Promise<string[]> {
  const recipients: string[] = [];
  const worker = reminder.worker_certification?.worker;

  // Always notify worker
  if (worker?.email) {
    recipients.push(worker.email);
  }

  // Get supervisor
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

  // Add safety manager for 30/7 day and expired
  if (['30_day', '7_day', 'expired'].includes(reminder.reminder_type)) {
    const { data: admin } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('company_id', companyId)
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (admin?.email && !recipients.includes(admin.email)) {
      recipients.push(admin.email);
    }
  }

  // Add auditor for 7 day and expired
  if (['7_day', 'expired'].includes(reminder.reminder_type)) {
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
// GENERATE EMAIL
// =============================================================================

interface EmailContent {
  subject: string;
  html: string;
}

function generateEmail(
  reminder: CertificationReminder,
  cert: CertificationReminder['worker_certification'],
  company: Company
): EmailContent {
  const worker = cert!.worker;
  const certType = cert!.certification_type;
  const daysUntilExpiry = Math.ceil(
    (new Date(cert!.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const expiryDate = new Date(cert!.expiry_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const certName = certType.certification_name;
  const certCode = certType.certification_code;
  const certNumber = cert!.certificate_number || 'N/A';

  // Get urgency color based on reminder type
  const urgencyColors = {
    '60_day': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', header: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
    '30_day': { bg: '#ffedd5', border: '#f97316', text: '#9a3412', header: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)' },
    '7_day': { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', header: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)' },
    'expired': { bg: '#fee2e2', border: '#991b1b', text: '#991b1b', header: '#991b1b' },
  };

  const colors = urgencyColors[reminder.reminder_type as keyof typeof urgencyColors] || urgencyColors['60_day'];
  
  const urgencyLabels = {
    '60_day': '⚠️ Certification Expiring in 60 Days',
    '30_day': '⚠️ IMPORTANT: Certification Expiring in 30 Days',
    '7_day': `🚨 URGENT: Certification Expires in ${daysUntilExpiry} Days`,
    'expired': '❌ CERTIFICATION EXPIRED',
  };

  const subject = {
    '60_day': `Reminder: ${certName} (${certCode}) expires in 60 days`,
    '30_day': `⚠️ IMPORTANT: ${certName} (${certCode}) expires in 30 days`,
    '7_day': `🚨 URGENT: ${certName} (${certCode}) expires in ${daysUntilExpiry} days`,
    'expired': `❌ ${certName} (${certCode}) HAS EXPIRED - Work Restriction Applied`,
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: ${colors.header}; padding: 30px; text-align: center; ${reminder.reminder_type === 'expired' ? 'color: white;' : ''}">
          <h2 style="color: ${reminder.reminder_type === 'expired' ? 'white' : colors.text}; margin: 0; font-size: 22px;">
            ${urgencyLabels[reminder.reminder_type as keyof typeof urgencyLabels]}
          </h2>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${worker.first_name},</p>
          
          ${reminder.reminder_type === 'expired' 
            ? `<p><strong style="color: ${colors.text};">Your ${certName} certification has EXPIRED.</strong></p>`
            : `<p>Your <strong>${certName}</strong> certification will expire ${reminder.reminder_type === '7_day' ? `in <strong style="color: ${colors.text};">${daysUntilExpiry} days</strong>` : `in approximately <strong>${daysUntilExpiry} days</strong>`}.</p>`
          }
          
          <!-- Certificate Details Box -->
          <div style="background-color: ${colors.bg}; padding: 15px; border-left: 4px solid ${colors.border}; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <strong style="font-size: 14px; color: ${colors.text};">📋 Certificate Details</strong><br><br>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 4px 0; color: #6b7280; width: 40%;">Certification:</td><td style="padding: 4px 0;"><strong>${certName}</strong></td></tr>
              <tr><td style="padding: 4px 0; color: #6b7280;">Code:</td><td style="padding: 4px 0;">${certCode}</td></tr>
              <tr><td style="padding: 4px 0; color: #6b7280;">Certificate #:</td><td style="padding: 4px 0;">${certNumber}</td></tr>
              <tr><td style="padding: 4px 0; color: #6b7280;">${reminder.reminder_type === 'expired' ? 'Expired On:' : 'Expiry Date:'}</td><td style="padding: 4px 0;"><strong style="color: ${colors.text};">${expiryDate}</strong></td></tr>
              ${reminder.reminder_type !== 'expired' ? `<tr><td style="padding: 4px 0; color: #6b7280;">Days Remaining:</td><td style="padding: 4px 0;"><strong style="color: ${colors.text};">${daysUntilExpiry} days</strong></td></tr>` : ''}
            </table>
          </div>
          
          <!-- Action Required Box -->
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; ${reminder.reminder_type === 'expired' || reminder.reminder_type === '7_day' ? `border: 2px solid ${colors.border};` : ''}">
            <strong>${reminder.reminder_type === 'expired' ? '✅ Required Actions:' : reminder.reminder_type === '7_day' ? '🚨 IMMEDIATE Action Required:' : '📌 Recommended Actions:'}</strong>
            <ul style="margin: 10px 0 0; padding-left: 20px;">
              ${reminder.reminder_type === 'expired' ? `
                <li style="margin: 8px 0;">Contact Safety Manager IMMEDIATELY</li>
                <li style="margin: 8px 0;">Schedule renewal training</li>
                <li style="margin: 8px 0;">Complete training and upload new certificate</li>
              ` : reminder.reminder_type === '7_day' ? `
                <li style="margin: 8px 0;"><strong>Contact your supervisor TODAY</strong></li>
                <li style="margin: 8px 0;"><strong>Arrange renewal training IMMEDIATELY</strong></li>
                <li style="margin: 8px 0;">If already renewed, upload new certificate NOW</li>
              ` : `
                <li style="margin: 8px 0;">Contact your supervisor to schedule renewal training</li>
                <li style="margin: 8px 0;">Check available training dates</li>
                <li style="margin: 8px 0;">If already renewed, upload new certificate to the system</li>
              `}
            </ul>
          </div>
          
          ${reminder.reminder_type === 'expired' ? `
            <div style="background-color: #fee2e2; border: 2px solid #991b1b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <strong style="color: #991b1b;">⛔ WORK RESTRICTION IN EFFECT</strong><br>
              <p style="margin: 10px 0 0;">You are NOT permitted to perform tasks requiring this certification until renewed.</p>
            </div>
          ` : ''}
          
          <!-- Contact Box -->
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>📞 ${reminder.reminder_type === '7_day' || reminder.reminder_type === 'expired' ? 'Emergency Contact:' : 'Need Help?'}</strong><br><br>
            ${company.safety_manager_name || 'Safety Manager'}<br>
            Email: safety@${company.domain || 'safetytracker.app'}<br>
            Phone: ${company.phone || '(Contact your supervisor)'}
          </div>
          
          <p>Best regards,<br><strong>${company.name} Safety Team</strong></p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">This is an automated message from ${company.name} Safety Management System.</p>
          ${['30_day', '7_day', 'expired'].includes(reminder.reminder_type) ? 
            `<p style="margin: 8px 0 0;">This notification has been sent to you, your supervisor${reminder.reminder_type !== '30_day' ? ', safety manager, and internal auditor' : ' and safety manager'}.</p>` 
            : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: subject[reminder.reminder_type as keyof typeof subject] || `Certification Reminder: ${certName}`,
    html,
  };
}

// =============================================================================
// SEND EMAIL
// =============================================================================

interface EmailParams {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

async function sendEmail(params: EmailParams): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');

  if (resendApiKey) {
    // Use Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend error: ${error.message || response.statusText}`);
    }
  } else if (sendgridApiKey) {
    // Use SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: params.to.map(email => ({ email })) }],
        from: { email: params.from.match(/<(.+)>/)?.[1] || params.from },
        subject: params.subject,
        content: [{ type: 'text/html', value: params.html }],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.statusText}`);
    }
  } else {
    // Development mode - just log
    console.log('📧 Email (no provider configured):', {
      to: params.to,
      subject: params.subject,
    });
  }
}

// =============================================================================
// CHECK EXPIRED CERTIFICATIONS
// =============================================================================

async function checkExpiredCertifications(
  supabase: ReturnType<typeof createClient>,
  result: { emailsSent: number; emailsFailed: number; errors: string[] }
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Find certifications that expired today
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
      // Check if already notified
      const { data: existing } = await supabase
        .from('certification_reminders')
        .select('id')
        .eq('certification_id', cert.id)
        .eq('reminder_type', 'expired')
        .single();

      if (existing) continue;

      // Create and send expired notification
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
        // Update cert status
        await supabase
          .from('worker_certifications')
          .update({ status: 'expired' })
          .eq('id', cert.id);

        // Process the reminder
        await processReminder(supabase, {
          ...reminder,
          worker_certification: cert,
        } as CertificationReminder);

        result.emailsSent++;
      }
    } catch (error: any) {
      console.error(`Failed to process expired cert ${cert.id}:`, error);
      result.emailsFailed++;
      result.errors.push(`Expired ${cert.id}: ${error.message}`);
    }
  }
}
