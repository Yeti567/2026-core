-- ============================================================================
-- Migration: Notification System Enhancement
-- Description: Adds notification logging and enhances reminder generation
-- ============================================================================

-- ============================================================================
-- Notification Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id TEXT,
  certification_id UUID REFERENCES worker_certifications(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  recipients TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_company_date 
ON notification_logs(company_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_worker 
ON notification_logs(worker_id, sent_at DESC);

-- ============================================================================
-- Update certification_reminders table
-- ============================================================================

-- Add error_message column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'certification_reminders' 
    AND column_name = 'error_message'
  ) THEN
    ALTER TABLE certification_reminders 
    ADD COLUMN error_message TEXT;
  END IF;
END
$$;

-- ============================================================================
-- Enhanced Generate Expiry Reminders Function
-- ============================================================================

DROP FUNCTION IF EXISTS generate_expiry_reminders();

CREATE OR REPLACE FUNCTION generate_expiry_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reminders_created INTEGER := 0;
  cert_record RECORD;
  reminder_date DATE;
  days_until_expiry INTEGER;
BEGIN
  -- Loop through active certifications with expiry dates
  FOR cert_record IN
    SELECT 
      wc.id AS certification_id,
      wc.expiry_date,
      wc.company_id
    FROM worker_certifications wc
    WHERE wc.expiry_date IS NOT NULL
      AND wc.status IN ('active', 'expiring_soon')
      AND wc.expiry_date >= CURRENT_DATE
      AND wc.expiry_date <= CURRENT_DATE + INTERVAL '65 days'
  LOOP
    days_until_expiry := cert_record.expiry_date - CURRENT_DATE;
    
    -- Check if we should create 60-day reminder
    IF days_until_expiry <= 60 AND days_until_expiry > 55 THEN
      -- Check if 60-day reminder already exists
      IF NOT EXISTS (
        SELECT 1 FROM certification_reminders 
        WHERE certification_id = cert_record.certification_id 
        AND reminder_type = '60_day'
      ) THEN
        INSERT INTO certification_reminders (
          certification_id, 
          reminder_type, 
          scheduled_date, 
          status, 
          company_id
        ) VALUES (
          cert_record.certification_id,
          '60_day',
          CURRENT_DATE,
          'pending',
          cert_record.company_id
        );
        reminders_created := reminders_created + 1;
      END IF;
    END IF;
    
    -- Check if we should create 30-day reminder
    IF days_until_expiry <= 30 AND days_until_expiry > 25 THEN
      IF NOT EXISTS (
        SELECT 1 FROM certification_reminders 
        WHERE certification_id = cert_record.certification_id 
        AND reminder_type = '30_day'
      ) THEN
        INSERT INTO certification_reminders (
          certification_id, 
          reminder_type, 
          scheduled_date, 
          status, 
          company_id
        ) VALUES (
          cert_record.certification_id,
          '30_day',
          CURRENT_DATE,
          'pending',
          cert_record.company_id
        );
        reminders_created := reminders_created + 1;
        
        -- Update certification status to expiring_soon
        UPDATE worker_certifications 
        SET status = 'expiring_soon'
        WHERE id = cert_record.certification_id
        AND status = 'active';
      END IF;
    END IF;
    
    -- Check if we should create 7-day reminder
    IF days_until_expiry <= 7 AND days_until_expiry >= 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM certification_reminders 
        WHERE certification_id = cert_record.certification_id 
        AND reminder_type = '7_day'
      ) THEN
        INSERT INTO certification_reminders (
          certification_id, 
          reminder_type, 
          scheduled_date, 
          status, 
          company_id
        ) VALUES (
          cert_record.certification_id,
          '7_day',
          CURRENT_DATE,
          'pending',
          cert_record.company_id
        );
        reminders_created := reminders_created + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN reminders_created;
END;
$$;

-- ============================================================================
-- Function to Mark Expired Certifications
-- ============================================================================

DROP FUNCTION IF EXISTS mark_expired_certifications();

CREATE OR REPLACE FUNCTION mark_expired_certifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE worker_certifications
  SET status = 'expired'
  WHERE expiry_date < CURRENT_DATE
    AND status IN ('active', 'expiring_soon');
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- ============================================================================
-- Function to Get Notification Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_notification_stats(p_company_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_sent BIGINT,
  by_type JSONB,
  by_day JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_sent,
    jsonb_object_agg(
      COALESCE(cr.reminder_type, 'unknown'),
      type_counts.cnt
    ) AS by_type,
    jsonb_object_agg(
      TO_CHAR(cr.sent_at::DATE, 'YYYY-MM-DD'),
      day_counts.cnt
    ) AS by_day
  FROM certification_reminders cr
  LEFT JOIN LATERAL (
    SELECT reminder_type, COUNT(*) as cnt
    FROM certification_reminders
    WHERE company_id = p_company_id
      AND sent_at >= NOW() - (p_days || ' days')::INTERVAL
      AND status = 'sent'
    GROUP BY reminder_type
  ) type_counts ON type_counts.reminder_type = cr.reminder_type
  LEFT JOIN LATERAL (
    SELECT sent_at::DATE as send_date, COUNT(*) as cnt
    FROM certification_reminders
    WHERE company_id = p_company_id
      AND sent_at >= NOW() - (p_days || ' days')::INTERVAL
      AND status = 'sent'
    GROUP BY sent_at::DATE
  ) day_counts ON day_counts.send_date = cr.sent_at::DATE
  WHERE cr.company_id = p_company_id
    AND cr.sent_at >= NOW() - (p_days || ' days')::INTERVAL
    AND cr.status = 'sent';
END;
$$;

-- ============================================================================
-- RLS Policies for Notification Logs
-- ============================================================================

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Company members can view their company's notification logs
CREATE POLICY "Company members can view notification logs"
ON notification_logs FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Only service role can insert logs
CREATE POLICY "Service role can insert notification logs"
ON notification_logs FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- Add company email settings columns
-- ============================================================================

DO $$
BEGIN
  -- Add safety_manager_email if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'safety_manager_email'
  ) THEN
    ALTER TABLE companies ADD COLUMN safety_manager_email TEXT;
  END IF;

  -- Add safety_manager_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'safety_manager_name'
  ) THEN
    ALTER TABLE companies ADD COLUMN safety_manager_name TEXT;
  END IF;

  -- Add domain if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'domain'
  ) THEN
    ALTER TABLE companies ADD COLUMN domain TEXT;
  END IF;

  -- Add phone if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE companies ADD COLUMN phone TEXT;
  END IF;
END
$$;

-- ============================================================================
-- Comment Documentation
-- ============================================================================

COMMENT ON TABLE notification_logs IS 
  'Audit trail of all certification expiry notifications sent';

COMMENT ON FUNCTION generate_expiry_reminders() IS 
  'Generates reminder records for certifications approaching expiry (60, 30, 7 days)';

COMMENT ON FUNCTION mark_expired_certifications() IS 
  'Updates status to expired for certifications past their expiry date';
