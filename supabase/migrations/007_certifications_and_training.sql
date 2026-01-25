-- ============================================================================
-- Certifications and Training Tracking System
-- Migration: 007_certifications_and_training.sql
-- ============================================================================
-- This migration creates a comprehensive certification and training tracking
-- system including:
-- - Master list of certification types with legal requirements
-- - Worker certifications with file storage and verification
-- - Training records for toolbox talks, OJT, competency assessments
-- - Automated expiry reminders and status tracking
-- - Dashboard views and summary functions
-- ============================================================================

-- ============================================================================
-- 1. CERTIFICATION TYPES TABLE (Master list of certifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    certification_code TEXT UNIQUE NOT NULL,  -- "WAH", "FSA", "WHMIS", "CSE"
    certification_name TEXT NOT NULL,         -- "Working at Heights"
    issuing_organization TEXT,                -- "IHSA", "Red Cross", "CSA"
    description TEXT,
    
    -- Expiry Configuration
    default_expiry_months INTEGER,            -- 36 for 3 years, NULL for no expiry
    renewal_required BOOLEAN DEFAULT TRUE,
    
    -- Requirements
    is_mandatory BOOLEAN DEFAULT FALSE,       -- Required for all workers?
    required_for_tasks TEXT[],                -- Array of task codes: ["CONC-001", "FORM-015"]
    legal_requirement TEXT,                   -- "O.Reg.213/91 s.139", NULL if not legally required
    
    -- Validation
    certificate_number_format TEXT,           -- Pattern: "WAH-######", NULL if no number
    competency_areas TEXT[],                  -- What competencies this cert provides
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 100,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE certification_types IS 'Master list of certification types with legal requirements and expiry rules';
COMMENT ON COLUMN certification_types.certification_code IS 'Short code for the certification (e.g., WAH, FSA, WHMIS)';
COMMENT ON COLUMN certification_types.default_expiry_months IS 'Default months until expiry. NULL = no expiry';
COMMENT ON COLUMN certification_types.is_mandatory IS 'If true, all workers in the company require this certification';
COMMENT ON COLUMN certification_types.required_for_tasks IS 'Array of task codes that require this certification';
COMMENT ON COLUMN certification_types.legal_requirement IS 'Legal reference (e.g., O.Reg.213/91 s.139)';

-- ============================================================================
-- 2. WORKER CERTIFICATIONS TABLE (Individual worker's certs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS worker_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    worker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    certification_type_id UUID NOT NULL REFERENCES certification_types(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Certificate Details
    certificate_number TEXT,                  -- "WAH-123456"
    issue_date DATE NOT NULL,
    expiry_date DATE,                         -- NULL if no expiry
    issuing_organization TEXT,                -- Can override default
    instructor_name TEXT,
    course_hours DECIMAL(5, 2),
    
    -- File Storage
    certificate_file_path TEXT,               -- Path to PDF in storage
    certificate_image_path TEXT,              -- Path to photo in storage
    file_type TEXT CHECK (file_type IN ('pdf', 'image')),
    thumbnail_path TEXT,                      -- Thumbnail for quick preview
    
    -- Verification
    verified_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    status TEXT DEFAULT 'pending_verification' CHECK (status IN (
        'active', 'expired', 'expiring_soon', 'warning', 'critical', 'pending_verification', 'revoked'
    )),
    
    -- Reminder Tracking
    reminder_60_sent BOOLEAN DEFAULT FALSE,
    reminder_60_sent_at TIMESTAMPTZ,
    reminder_30_sent BOOLEAN DEFAULT FALSE,
    reminder_30_sent_at TIMESTAMPTZ,
    reminder_7_sent BOOLEAN DEFAULT FALSE,
    reminder_7_sent_at TIMESTAMPTZ,
    
    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    
    -- Prevent duplicate active certs
    UNIQUE (worker_id, certification_type_id, issue_date)
);

COMMENT ON TABLE worker_certifications IS 'Individual worker certification records with file storage and verification';
COMMENT ON COLUMN worker_certifications.certificate_file_path IS 'Supabase Storage path to PDF certificate';
COMMENT ON COLUMN worker_certifications.certificate_image_path IS 'Supabase Storage path to photo of certificate';
COMMENT ON COLUMN worker_certifications.status IS 'Calculated status based on expiry date';

-- ============================================================================
-- 3. TRAINING RECORDS TABLE (Non-certification training)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    worker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Training Details
    training_type TEXT NOT NULL CHECK (training_type IN (
        'toolbox_talk', 'orientation', 'ojt', 'competency_assessment', 
        'safety_meeting', 'emergency_drill', 'refresher', 'other'
    )),
    training_topic TEXT NOT NULL,             -- "Concrete Safety", "Fall Protection"
    training_date DATE NOT NULL,
    duration_hours DECIMAL(5, 2),
    
    -- Trainer Information
    trainer_name TEXT,
    trainer_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Linked Records
    linked_form_submission_id UUID,           -- References form_submissions if applicable
    linked_document_id UUID,                  -- References documents if applicable
    
    -- Assessment Results
    attendance_verified BOOLEAN DEFAULT TRUE,
    competency_demonstrated BOOLEAN,
    assessment_score INTEGER CHECK (assessment_score >= 0 AND assessment_score <= 100),
    passed BOOLEAN,
    
    -- Additional Info
    notes TEXT,
    attachments TEXT[],                       -- Paths to supporting files
    topics_covered TEXT[],                    -- Array of specific topics
    
    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE training_records IS 'Non-certification training records including toolbox talks, OJT, and competency assessments';
COMMENT ON COLUMN training_records.training_type IS 'Type of training: toolbox_talk, orientation, ojt, competency_assessment, etc.';
COMMENT ON COLUMN training_records.assessment_score IS 'Percentage score (0-100) for competency assessments';

-- ============================================================================
-- 4. CERTIFICATION REMINDERS TABLE (Scheduled reminders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    certification_id UUID NOT NULL REFERENCES worker_certifications(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Reminder Configuration
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('60_day', '30_day', '7_day', 'expired')),
    reminder_date DATE NOT NULL,              -- When to send reminder
    
    -- Delivery Status
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    
    -- Recipients
    recipients TEXT[] NOT NULL,               -- Email addresses: worker, supervisor, safety_manager
    notification_method TEXT DEFAULT 'email' CHECK (notification_method IN ('email', 'sms', 'in_app', 'all')),
    
    -- Response Tracking
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Error Handling
    send_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate reminders
    UNIQUE (certification_id, reminder_type)
);

COMMENT ON TABLE certification_reminders IS 'Scheduled and sent certification expiry reminders';
COMMENT ON COLUMN certification_reminders.reminder_type IS 'Reminder threshold: 60_day, 30_day, 7_day, or expired';
COMMENT ON COLUMN certification_reminders.recipients IS 'Array of email addresses to notify';

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Certification Types
CREATE INDEX IF NOT EXISTS idx_cert_types_code ON certification_types(certification_code);
CREATE INDEX IF NOT EXISTS idx_cert_types_mandatory ON certification_types(is_mandatory) WHERE is_mandatory = TRUE;
CREATE INDEX IF NOT EXISTS idx_cert_types_active ON certification_types(is_active, sort_order);

-- Worker Certifications
CREATE INDEX IF NOT EXISTS idx_worker_certs_worker ON worker_certifications(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_certs_company ON worker_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_certs_expiry ON worker_certifications(company_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_worker_certs_status ON worker_certifications(company_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_certs_type ON worker_certifications(certification_type_id);
CREATE INDEX IF NOT EXISTS idx_worker_certs_verified ON worker_certifications(company_id, verified_at) WHERE verified_by IS NOT NULL;

-- Training Records
CREATE INDEX IF NOT EXISTS idx_training_records_worker ON training_records(worker_id, training_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_records_company ON training_records(company_id, training_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_records_type ON training_records(training_type, training_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_records_topic ON training_records(company_id, training_topic);

-- Certification Reminders
CREATE INDEX IF NOT EXISTS idx_cert_reminders_pending ON certification_reminders(sent, reminder_date) WHERE sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_cert_reminders_cert ON certification_reminders(certification_id);
CREATE INDEX IF NOT EXISTS idx_cert_reminders_worker ON certification_reminders(worker_id);

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Function: Calculate certification status based on expiry date
CREATE OR REPLACE FUNCTION calculate_certification_status(cert_expiry_date DATE)
RETURNS TEXT AS $$
BEGIN
    IF cert_expiry_date IS NULL THEN
        RETURN 'active'; -- No expiry = always active
    ELSIF cert_expiry_date < CURRENT_DATE THEN
        RETURN 'expired';
    ELSIF cert_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
        RETURN 'critical'; -- Expires within 7 days
    ELSIF cert_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
        RETURN 'warning'; -- Expires within 30 days
    ELSIF cert_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN
        RETURN 'expiring_soon'; -- Expires within 60 days
    ELSE
        RETURN 'active';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_certification_status IS 'Calculate certification status based on expiry date';

-- Function: Get worker certifications summary
CREATE OR REPLACE FUNCTION get_worker_certifications_summary(p_worker_id UUID)
RETURNS TABLE (
    total_certifications INTEGER,
    active_certifications INTEGER,
    expired_certifications INTEGER,
    expiring_soon_certifications INTEGER,
    missing_mandatory_certifications TEXT[]
) AS $$
DECLARE
    v_total INTEGER;
    v_active INTEGER;
    v_expired INTEGER;
    v_expiring INTEGER;
    v_missing TEXT[];
    v_company_id UUID;
BEGIN
    -- Get worker's company
    SELECT company_id INTO v_company_id
    FROM user_profiles
    WHERE id = p_worker_id;
    
    -- Count certifications by status
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE calculate_certification_status(expiry_date) = 'active'),
        COUNT(*) FILTER (WHERE calculate_certification_status(expiry_date) = 'expired'),
        COUNT(*) FILTER (WHERE calculate_certification_status(expiry_date) IN ('expiring_soon', 'warning', 'critical'))
    INTO v_total, v_active, v_expired, v_expiring
    FROM worker_certifications
    WHERE worker_id = p_worker_id
      AND status != 'revoked';
    
    -- Find missing mandatory certifications
    SELECT ARRAY_AGG(ct.certification_name ORDER BY ct.sort_order)
    INTO v_missing
    FROM certification_types ct
    WHERE ct.is_mandatory = TRUE
      AND ct.is_active = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM worker_certifications wc
          WHERE wc.worker_id = p_worker_id
            AND wc.certification_type_id = ct.id
            AND calculate_certification_status(wc.expiry_date) = 'active'
            AND wc.status NOT IN ('revoked', 'pending_verification')
      );
    
    RETURN QUERY SELECT 
        COALESCE(v_total, 0),
        COALESCE(v_active, 0),
        COALESCE(v_expired, 0),
        COALESCE(v_expiring, 0),
        COALESCE(v_missing, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_worker_certifications_summary IS 'Get summary of worker certifications including missing mandatory certs';

-- Function: Generate expiry reminders for all certifications
CREATE OR REPLACE FUNCTION generate_expiry_reminders()
RETURNS TABLE (
    reminders_created INTEGER,
    workers_affected INTEGER,
    certifications_processed INTEGER
) AS $$
DECLARE
    v_reminders_created INTEGER := 0;
    v_workers_affected INTEGER := 0;
    v_certs_processed INTEGER := 0;
    v_cert RECORD;
    v_worker_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Loop through all active certifications with expiry dates approaching
    FOR v_cert IN 
        SELECT 
            wc.id,
            wc.worker_id,
            wc.company_id,
            wc.expiry_date,
            wc.reminder_60_sent,
            wc.reminder_30_sent,
            wc.reminder_7_sent,
            up.email as worker_email,
            up.first_name || ' ' || up.last_name as worker_name,
            ct.certification_name,
            ct.certification_code
        FROM worker_certifications wc
        JOIN user_profiles up ON up.id = wc.worker_id
        JOIN certification_types ct ON ct.id = wc.certification_type_id
        WHERE wc.expiry_date IS NOT NULL
          AND wc.expiry_date >= CURRENT_DATE
          AND wc.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
          AND wc.status NOT IN ('revoked', 'pending_verification')
    LOOP
        v_certs_processed := v_certs_processed + 1;
        
        -- 60 day reminder
        IF v_cert.expiry_date <= CURRENT_DATE + INTERVAL '60 days' 
           AND v_cert.expiry_date > CURRENT_DATE + INTERVAL '30 days'
           AND NOT v_cert.reminder_60_sent THEN
            
            INSERT INTO certification_reminders (
                certification_id, worker_id, company_id, 
                reminder_type, reminder_date, recipients
            ) VALUES (
                v_cert.id, v_cert.worker_id, v_cert.company_id,
                '60_day', CURRENT_DATE, 
                ARRAY[v_cert.worker_email]
            ) ON CONFLICT (certification_id, reminder_type) DO NOTHING;
            
            UPDATE worker_certifications
            SET reminder_60_sent = TRUE, reminder_60_sent_at = NOW()
            WHERE id = v_cert.id;
            
            v_reminders_created := v_reminders_created + 1;
            IF NOT v_cert.worker_id = ANY(v_worker_ids) THEN
                v_worker_ids := v_worker_ids || v_cert.worker_id;
            END IF;
        END IF;
        
        -- 30 day reminder (include supervisor)
        IF v_cert.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
           AND v_cert.expiry_date > CURRENT_DATE + INTERVAL '7 days'
           AND NOT v_cert.reminder_30_sent THEN
            
            INSERT INTO certification_reminders (
                certification_id, worker_id, company_id,
                reminder_type, reminder_date, recipients
            ) VALUES (
                v_cert.id, v_cert.worker_id, v_cert.company_id,
                '30_day', CURRENT_DATE,
                ARRAY[v_cert.worker_email]
            ) ON CONFLICT (certification_id, reminder_type) DO NOTHING;
            
            UPDATE worker_certifications
            SET reminder_30_sent = TRUE, reminder_30_sent_at = NOW()
            WHERE id = v_cert.id;
            
            v_reminders_created := v_reminders_created + 1;
            IF NOT v_cert.worker_id = ANY(v_worker_ids) THEN
                v_worker_ids := v_worker_ids || v_cert.worker_id;
            END IF;
        END IF;
        
        -- 7 day reminder (URGENT - include safety manager)
        IF v_cert.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
           AND v_cert.expiry_date >= CURRENT_DATE
           AND NOT v_cert.reminder_7_sent THEN
            
            INSERT INTO certification_reminders (
                certification_id, worker_id, company_id,
                reminder_type, reminder_date, recipients
            ) VALUES (
                v_cert.id, v_cert.worker_id, v_cert.company_id,
                '7_day', CURRENT_DATE,
                ARRAY[v_cert.worker_email]
            ) ON CONFLICT (certification_id, reminder_type) DO NOTHING;
            
            UPDATE worker_certifications
            SET reminder_7_sent = TRUE, reminder_7_sent_at = NOW()
            WHERE id = v_cert.id;
            
            v_reminders_created := v_reminders_created + 1;
            IF NOT v_cert.worker_id = ANY(v_worker_ids) THEN
                v_worker_ids := v_worker_ids || v_cert.worker_id;
            END IF;
        END IF;
    END LOOP;
    
    v_workers_affected := array_length(v_worker_ids, 1);
    
    RETURN QUERY SELECT v_reminders_created, COALESCE(v_workers_affected, 0), v_certs_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION generate_expiry_reminders IS 'Generate expiry reminders for all certifications. Run daily via cron.';

-- Function: Get company training hours summary
CREATE OR REPLACE FUNCTION get_company_training_hours(
    p_company_id UUID,
    p_start_date DATE DEFAULT DATE_TRUNC('year', CURRENT_DATE)::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    worker_id UUID,
    worker_name TEXT,
    total_hours DECIMAL,
    toolbox_talk_hours DECIMAL,
    orientation_hours DECIMAL,
    ojt_hours DECIMAL,
    competency_assessment_hours DECIMAL,
    other_hours DECIMAL,
    sessions_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.worker_id,
        up.first_name || ' ' || up.last_name as worker_name,
        COALESCE(SUM(tr.duration_hours), 0) as total_hours,
        COALESCE(SUM(tr.duration_hours) FILTER (WHERE tr.training_type = 'toolbox_talk'), 0) as toolbox_talk_hours,
        COALESCE(SUM(tr.duration_hours) FILTER (WHERE tr.training_type = 'orientation'), 0) as orientation_hours,
        COALESCE(SUM(tr.duration_hours) FILTER (WHERE tr.training_type = 'ojt'), 0) as ojt_hours,
        COALESCE(SUM(tr.duration_hours) FILTER (WHERE tr.training_type = 'competency_assessment'), 0) as competency_assessment_hours,
        COALESCE(SUM(tr.duration_hours) FILTER (WHERE tr.training_type NOT IN ('toolbox_talk', 'orientation', 'ojt', 'competency_assessment')), 0) as other_hours,
        COUNT(*)::INTEGER as sessions_count
    FROM training_records tr
    JOIN user_profiles up ON up.id = tr.worker_id
    WHERE tr.company_id = p_company_id
      AND tr.training_date >= p_start_date
      AND tr.training_date <= p_end_date
    GROUP BY tr.worker_id, up.first_name, up.last_name
    ORDER BY total_hours DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_company_training_hours IS 'Get training hours summary by worker for a company';

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger function: Auto-update certification status on insert/update
CREATE OR REPLACE FUNCTION update_certification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate and set status based on expiry date
    IF NEW.status != 'revoked' AND NEW.status != 'pending_verification' THEN
        NEW.status := calculate_certification_status(NEW.expiry_date);
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_certification_status ON worker_certifications;
CREATE TRIGGER trigger_update_certification_status
    BEFORE INSERT OR UPDATE OF expiry_date, status ON worker_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_certification_status();

-- Trigger function: Reset reminders when expiry date changes significantly
CREATE OR REPLACE FUNCTION reset_certification_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- If expiry date changed to a date more than 60 days out, reset reminders
    IF NEW.expiry_date IS DISTINCT FROM OLD.expiry_date 
       AND NEW.expiry_date > CURRENT_DATE + INTERVAL '60 days' THEN
        NEW.reminder_60_sent := FALSE;
        NEW.reminder_60_sent_at := NULL;
        NEW.reminder_30_sent := FALSE;
        NEW.reminder_30_sent_at := NULL;
        NEW.reminder_7_sent := FALSE;
        NEW.reminder_7_sent_at := NULL;
        
        -- Delete pending reminders
        DELETE FROM certification_reminders 
        WHERE certification_id = NEW.id AND sent = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_certification_reminders ON worker_certifications;
CREATE TRIGGER trigger_reset_certification_reminders
    BEFORE UPDATE OF expiry_date ON worker_certifications
    FOR EACH ROW
    EXECUTE FUNCTION reset_certification_reminders();

-- ============================================================================
-- 8. VIEWS
-- ============================================================================

-- View: Expiring certifications dashboard
CREATE OR REPLACE VIEW expiring_certifications_dashboard AS
SELECT 
    wc.id,
    wc.worker_id,
    up.first_name || ' ' || up.last_name as worker_name,
    up.email as worker_email,
    ct.certification_name,
    ct.certification_code,
    ct.is_mandatory,
    ct.legal_requirement,
    wc.certificate_number,
    wc.issue_date,
    wc.expiry_date,
    (wc.expiry_date - CURRENT_DATE) as days_until_expiry,
    wc.status,
    CASE 
        WHEN wc.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN wc.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Critical (≤7 days)'
        WHEN wc.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Warning (≤30 days)'
        WHEN wc.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'Expiring Soon (≤60 days)'
        ELSE 'Active'
    END as urgency_level,
    CASE 
        WHEN wc.expiry_date < CURRENT_DATE THEN 1
        WHEN wc.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
        WHEN wc.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 3
        WHEN wc.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 4
        ELSE 5
    END as urgency_sort,
    wc.company_id,
    wc.certificate_file_path,
    wc.certificate_image_path,
    wc.verified_by IS NOT NULL as is_verified,
    wc.reminder_60_sent,
    wc.reminder_30_sent,
    wc.reminder_7_sent
FROM worker_certifications wc
JOIN user_profiles up ON up.id = wc.worker_id
JOIN certification_types ct ON ct.id = wc.certification_type_id
WHERE wc.expiry_date IS NOT NULL
  AND wc.status NOT IN ('revoked')
ORDER BY urgency_sort, wc.expiry_date ASC;

COMMENT ON VIEW expiring_certifications_dashboard IS 'Dashboard view of all expiring certifications with urgency levels';

-- View: Worker certification matrix
CREATE OR REPLACE VIEW worker_certification_matrix AS
SELECT 
    up.id as worker_id,
    up.first_name || ' ' || up.last_name as worker_name,
    up.company_id,
    ct.id as certification_type_id,
    ct.certification_code,
    ct.certification_name,
    ct.is_mandatory,
    wc.id as certification_id,
    wc.expiry_date,
    wc.status,
    CASE 
        WHEN wc.id IS NULL THEN 'missing'
        WHEN wc.status = 'expired' THEN 'expired'
        WHEN wc.status IN ('critical', 'warning', 'expiring_soon') THEN 'expiring'
        WHEN wc.status = 'active' THEN 'valid'
        ELSE 'unknown'
    END as matrix_status
FROM user_profiles up
CROSS JOIN certification_types ct
LEFT JOIN worker_certifications wc ON wc.worker_id = up.id 
    AND wc.certification_type_id = ct.id
    AND wc.status NOT IN ('revoked')
WHERE ct.is_active = TRUE
ORDER BY up.last_name, up.first_name, ct.sort_order;

COMMENT ON VIEW worker_certification_matrix IS 'Matrix view showing all workers vs all certification types';

-- View: Company compliance summary
CREATE OR REPLACE VIEW company_compliance_summary AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(DISTINCT up.id) as total_workers,
    COUNT(DISTINCT wc.id) as total_certifications,
    COUNT(DISTINCT wc.id) FILTER (WHERE wc.status = 'active') as active_certifications,
    COUNT(DISTINCT wc.id) FILTER (WHERE wc.status = 'expired') as expired_certifications,
    COUNT(DISTINCT wc.id) FILTER (WHERE wc.status IN ('critical', 'warning', 'expiring_soon')) as expiring_certifications,
    COUNT(DISTINCT tr.id) as total_training_records,
    COALESCE(SUM(tr.duration_hours), 0) as total_training_hours,
    ROUND(
        (COUNT(DISTINCT wc.id) FILTER (WHERE wc.status = 'active')::DECIMAL / 
         NULLIF(COUNT(DISTINCT wc.id), 0) * 100), 1
    ) as compliance_rate
FROM companies c
LEFT JOIN user_profiles up ON up.company_id = c.id
LEFT JOIN worker_certifications wc ON wc.company_id = c.id AND wc.status != 'revoked'
LEFT JOIN training_records tr ON tr.company_id = c.id 
    AND tr.training_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY c.id, c.name;

COMMENT ON VIEW company_compliance_summary IS 'Summary of certification compliance by company';

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_reminders ENABLE ROW LEVEL SECURITY;

-- Certification Types Policies (System-wide, read by all authenticated)
DROP POLICY IF EXISTS "cert_types_select_all" ON certification_types;
CREATE POLICY "cert_types_select_all" ON certification_types
    FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "cert_types_manage_admin" ON certification_types;
CREATE POLICY "cert_types_manage_admin" ON certification_types
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Worker Certifications Policies
DROP POLICY IF EXISTS "worker_certs_select" ON worker_certifications;
CREATE POLICY "worker_certs_select" ON worker_certifications
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "worker_certs_insert" ON worker_certifications;
CREATE POLICY "worker_certs_insert" ON worker_certifications
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'super_admin'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "worker_certs_update" ON worker_certifications;
CREATE POLICY "worker_certs_update" ON worker_certifications
    FOR UPDATE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'super_admin'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "worker_certs_delete" ON worker_certifications;
CREATE POLICY "worker_certs_delete" ON worker_certifications
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

-- Training Records Policies
DROP POLICY IF EXISTS "training_records_select" ON training_records;
CREATE POLICY "training_records_select" ON training_records
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_records_insert" ON training_records;
CREATE POLICY "training_records_insert" ON training_records
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_records_update" ON training_records;
CREATE POLICY "training_records_update" ON training_records
    FOR UPDATE TO authenticated
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_records_delete" ON training_records;
CREATE POLICY "training_records_delete" ON training_records
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'super_admin'))
        OR is_super_admin()
    );

-- Certification Reminders Policies
DROP POLICY IF EXISTS "cert_reminders_select" ON certification_reminders;
CREATE POLICY "cert_reminders_select" ON certification_reminders
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "cert_reminders_manage" ON certification_reminders;
CREATE POLICY "cert_reminders_manage" ON certification_reminders
    FOR ALL TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON certification_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON worker_certifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON training_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON certification_reminders TO authenticated;

GRANT SELECT ON expiring_certifications_dashboard TO authenticated;
GRANT SELECT ON worker_certification_matrix TO authenticated;
GRANT SELECT ON company_compliance_summary TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_certification_status(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_certifications_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_expiry_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_training_hours(UUID, DATE, DATE) TO authenticated;

-- ============================================================================
-- 11. SEED DATA - Common Certification Types
-- ============================================================================

INSERT INTO certification_types (
    certification_code, certification_name, issuing_organization, 
    default_expiry_months, is_mandatory, legal_requirement, sort_order, description
) VALUES
    -- Legally Required Certifications
    ('WAH', 'Working at Heights', 'IHSA / MOL Approved Provider', 
     36, TRUE, 'O.Reg.213/91 s.139', 1,
     'Ministry of Labour approved Working at Heights training for construction workers who may use fall protection equipment'),
    
    ('CSE', 'Confined Space Entry', 'Various Approved Providers', 
     36, FALSE, 'O.Reg.632/05', 2,
     'Confined space awareness and entry procedures for workers who may enter confined spaces'),
    
    ('FSA', 'Standard First Aid', 'Red Cross / St. John Ambulance / WSIB Approved', 
     36, FALSE, 'O.Reg.1101', 3,
     'Standard First Aid certification including emergency first aid, CPR, and AED training'),
    
    ('CPR', 'CPR Level C with AED', 'Red Cross / St. John Ambulance', 
     12, FALSE, NULL, 4,
     'Cardiopulmonary resuscitation Level C with Automated External Defibrillator training'),
    
    -- WHMIS & Hazard Training
    ('WHMIS', 'WHMIS 2015', 'Various Approved Providers', 
     36, TRUE, 'O.Reg.860', 5,
     'Workplace Hazardous Materials Information System training for handling hazardous materials'),
    
    ('TDG', 'Transportation of Dangerous Goods', 'Transport Canada Certified', 
     36, FALSE, 'TDG Act', 6,
     'Training for workers who handle, offer for transport, or transport dangerous goods'),
    
    -- Equipment Operator Certifications
    ('FORK', 'Forklift/Powered Industrial Truck', 'Various Providers', 
     36, FALSE, 'O.Reg.851 s.7', 7,
     'Powered industrial truck operator training including counterbalance and reach forklifts'),
    
    ('AWP', 'Aerial Work Platform Operator', 'Various Providers / IPAF', 
     60, FALSE, 'CSA B354.1', 8,
     'Aerial work platform training including scissor lifts and boom lifts'),
    
    ('CRANE', 'Mobile Crane Operator', 'TSSA / MOL Certified', 
     60, FALSE, 'TSSA', 9,
     'Mobile crane operator certification as required by TSSA'),
    
    ('BOOM', 'Boom Truck Operator', 'Various Providers', 
     36, FALSE, NULL, 10,
     'Boom truck and knuckle boom operator training'),
    
    ('SKID', 'Skid Steer Operator', 'Various Providers', 
     36, FALSE, NULL, 11,
     'Skid steer loader operator training and certification'),
    
    ('EXCA', 'Excavator Operator', 'Various Providers', 
     36, FALSE, NULL, 12,
     'Hydraulic excavator operator training'),
    
    -- Traffic & Roadway
    ('TCP', 'Traffic Control Person', 'MTO Approved Provider', 
     36, FALSE, 'OTM Book 7', 13,
     'Traffic control person certification as per Ontario Traffic Manual Book 7'),
    
    -- Construction Safety
    ('FALL', 'Fall Protection User', 'Various Providers', 
     36, FALSE, 'O.Reg.213/91', 14,
     'Fall protection equipment user training for harness, lanyard, and anchor systems'),
    
    ('SCAF', 'Scaffold User/Erector', 'Various Providers', 
     36, FALSE, 'O.Reg.213/91 s.126', 15,
     'Scaffold erection, modification, and dismantling training'),
    
    ('RIGG', 'Hoisting & Rigging', 'Various Providers', 
     36, FALSE, NULL, 16,
     'Basic rigging, load securement, and signalling for crane operations'),
    
    -- Hazardous Materials Awareness
    ('ASBESTOS', 'Asbestos Awareness Type 1', 'MOL Approved Provider', 
     NULL, FALSE, 'O.Reg.278/05', 17,
     'Asbestos awareness training for workers who may encounter asbestos-containing materials'),
    
    ('SILICA', 'Silica Awareness', 'Various Providers', 
     NULL, FALSE, 'O.Reg.490/09', 18,
     'Crystalline silica dust hazard awareness and control measures'),
    
    ('LEAD', 'Lead Awareness', 'Various Providers', 
     NULL, FALSE, 'O.Reg.490/09', 19,
     'Lead hazard awareness for construction and renovation workers'),
    
    ('MOULD', 'Mould Awareness', 'Various Providers', 
     NULL, FALSE, NULL, 20,
     'Mould identification and remediation awareness'),
    
    -- Electrical
    ('ELEC', 'Electrical Safety Awareness', 'Various Providers', 
     36, FALSE, 'OHSA', 21,
     'Electrical hazard recognition and arc flash awareness'),
    
    -- Trenching & Excavation
    ('TRENCH', 'Trenching & Excavation Safety', 'Various Providers', 
     36, FALSE, 'O.Reg.213/91', 22,
     'Excavation safety including trench box systems and rescue awareness'),
    
    -- Propane & Compressed Gas
    ('PROP', 'Propane Handling', 'TSSA', 
     36, FALSE, 'O.Reg.211/01', 23,
     'Safe propane handling, storage, and use on construction sites'),
    
    -- Company-Specific Placeholders
    ('COMPANY-ORIENT', 'Company Orientation', 'Internal', 
     NULL, TRUE, NULL, 90,
     'Company-specific new worker orientation program'),
    
    ('COMPANY-CONC', 'Concrete Safety Training', 'Internal', 
     12, FALSE, NULL, 91,
     'Company-specific concrete placement and finishing safety');

-- ============================================================================
-- 12. STORAGE BUCKET FOR CERTIFICATIONS
-- ============================================================================

-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'certifications',
    'certifications',
    FALSE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- Storage policies
DROP POLICY IF EXISTS "cert_storage_select" ON storage.objects;
CREATE POLICY "cert_storage_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'certifications');

DROP POLICY IF EXISTS "cert_storage_insert" ON storage.objects;
CREATE POLICY "cert_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'certifications');

DROP POLICY IF EXISTS "cert_storage_update" ON storage.objects;
CREATE POLICY "cert_storage_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'certifications');

DROP POLICY IF EXISTS "cert_storage_delete" ON storage.objects;
CREATE POLICY "cert_storage_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'certifications');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

/*
 * CRON JOB SETUP (Run in Supabase Dashboard > Database > Extensions > pg_cron)
 * 
 * -- Enable pg_cron extension
 * CREATE EXTENSION IF NOT EXISTS pg_cron;
 * 
 * -- Schedule daily reminder generation at 6 AM
 * SELECT cron.schedule(
 *     'generate-certification-reminders',
 *     '0 6 * * *',
 *     $$SELECT generate_expiry_reminders()$$
 * );
 * 
 * -- Schedule daily status update at 1 AM
 * SELECT cron.schedule(
 *     'update-certification-status',
 *     '0 1 * * *',
 *     $$UPDATE worker_certifications 
 *       SET status = calculate_certification_status(expiry_date)
 *       WHERE status NOT IN ('revoked', 'pending_verification')
 *         AND expiry_date IS NOT NULL$$
 * );
 */
