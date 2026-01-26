-- ============================================================================
-- Certification & Training Tracker Migration
-- ============================================================================
-- This migration establishes a comprehensive employee certification and
-- training tracking system including:
-- - Certification types with expiry rules
-- - Worker certifications with file storage
-- - Training records (toolbox talks, OJT, competency assessments)
-- - Expiry alert tracking
-- - Work restrictions based on certification status
-- ============================================================================

-- ============================================================================
-- 1. CREATE CERTIFICATION TYPES TABLE (Master list of certification types)
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = system default
    
    -- Certification details
    name TEXT NOT NULL,
    short_code TEXT,  -- e.g., 'WAH', 'FA', 'WHMIS'
    description TEXT,
    category TEXT DEFAULT 'safety',  -- safety, operational, regulatory, company-specific
    
    -- Expiry configuration
    default_expiry_months INTEGER,  -- NULL = no expiry
    expiry_warning_days INTEGER[] DEFAULT ARRAY[60, 30, 7],  -- Days before expiry to warn
    
    -- Alert configuration
    alert_at_60_days BOOLEAN DEFAULT TRUE,
    alert_at_30_days BOOLEAN DEFAULT TRUE,
    alert_at_7_days BOOLEAN DEFAULT TRUE,
    alert_on_expiry BOOLEAN DEFAULT TRUE,
    
    -- Work restriction
    required_for_work BOOLEAN DEFAULT FALSE,  -- If true, worker can't work with expired cert
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_default BOOLEAN DEFAULT FALSE,  -- System-provided templates
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    -- Handle renaming from 00700 schema to 013 schema
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'certification_name') THEN
        ALTER TABLE certification_types RENAME COLUMN certification_name TO name;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'certification_code') THEN
        ALTER TABLE certification_types RENAME COLUMN certification_code TO short_code;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'company_id') THEN
        ALTER TABLE certification_types ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'category') THEN
        ALTER TABLE certification_types ADD COLUMN category TEXT DEFAULT 'safety';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'required_for_work') THEN
        ALTER TABLE certification_types ADD COLUMN required_for_work BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'short_code') THEN
        ALTER TABLE certification_types ADD COLUMN short_code TEXT;
    END IF;

    -- Ensure is_system_default column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'is_system_default') THEN
        ALTER TABLE certification_types ADD COLUMN is_system_default BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ensure alert columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'alert_at_60_days') THEN
        ALTER TABLE certification_types ADD COLUMN alert_at_60_days BOOLEAN DEFAULT TRUE;
        ALTER TABLE certification_types ADD COLUMN alert_at_30_days BOOLEAN DEFAULT TRUE;
        ALTER TABLE certification_types ADD COLUMN alert_at_7_days BOOLEAN DEFAULT TRUE;
        ALTER TABLE certification_types ADD COLUMN alert_on_expiry BOOLEAN DEFAULT TRUE;
    END IF;

     -- Ensure expiry_warning_days column exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certification_types' AND column_name = 'expiry_warning_days') THEN
        ALTER TABLE certification_types ADD COLUMN expiry_warning_days INTEGER[] DEFAULT ARRAY[60, 30, 7];
    END IF;

    -- Drop legacy unique constraint from 00700 which conflicts with 013 inserts (name mismatch but code match)
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'certification_types_certification_code_key'
    ) THEN
        ALTER TABLE certification_types DROP CONSTRAINT certification_types_certification_code_key;
    END IF;
END $$;

-- ============================================================================
-- 2. EXTEND CERTIFICATIONS TABLE (Worker's actual certifications)
-- ============================================================================

-- Add new columns to existing certifications table
ALTER TABLE certifications 
    ADD COLUMN IF NOT EXISTS certification_type_id UUID REFERENCES certification_types(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending_verification')),
    ADD COLUMN IF NOT EXISTS file_type TEXT,  -- 'image', 'pdf'
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_size INTEGER,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,  -- For image previews
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_alert_sent TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS alert_60_sent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS alert_30_sent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS alert_7_sent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS alert_expired_sent BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 3. CREATE TRAINING RECORD TYPES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_record_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = system default
    
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('toolbox_talk', 'ojt', 'competency_assessment', 'orientation', 'course', 'other')),
    description TEXT,
    
    -- Duration tracking
    requires_hours BOOLEAN DEFAULT FALSE,
    default_hours DECIMAL(5,2),
    
    -- Recurrence
    recurrence_months INTEGER,  -- NULL = one-time
    
    is_active BOOLEAN DEFAULT TRUE,
    is_system_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CREATE TRAINING RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    training_type_id UUID REFERENCES training_record_types(id) ON DELETE SET NULL,
    
    -- Training details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('toolbox_talk', 'ojt', 'competency_assessment', 'orientation', 'course', 'other')),
    
    -- Date & duration
    completed_date DATE NOT NULL,
    hours_completed DECIMAL(5,2),
    
    -- Instructor/supervisor
    instructor_name TEXT,
    instructor_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    
    -- Competency specific
    competency_level TEXT CHECK (competency_level IN ('not_competent', 'developing', 'competent', 'proficient', 'expert')),
    assessment_passed BOOLEAN,
    
    -- File attachments
    file_path TEXT,
    file_type TEXT,
    file_name TEXT,
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    
    -- Topics covered (for toolbox talks)
    topics TEXT[],
    
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    -- Handle renaming from 00700 schema to 013 schema for training_records
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'training_topic') THEN
        ALTER TABLE training_records RENAME COLUMN training_topic TO title;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'training_date') THEN
        ALTER TABLE training_records RENAME COLUMN training_date TO completed_date;
    END IF;

     IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'duration_hours') THEN
        ALTER TABLE training_records RENAME COLUMN duration_hours TO hours_completed;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'training_type_id') THEN
        ALTER TABLE training_records ADD COLUMN training_type_id UUID REFERENCES training_record_types(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'category') THEN
        ALTER TABLE training_records ADD COLUMN category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'completed_date') THEN
         -- If it didn't exist and wasn't renamed (fresh table?)
         NULL;
    END IF;
    
    -- Ensure other columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'instructor_name') THEN
        ALTER TABLE training_records ADD COLUMN instructor_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_records' AND column_name = 'competency_level') THEN
        ALTER TABLE training_records ADD COLUMN competency_level TEXT;
    END IF;
END $$;

-- ============================================================================
-- 5. CREATE CERTIFICATION ALERTS TABLE (Tracking sent alerts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    
    alert_type TEXT NOT NULL CHECK (alert_type IN ('60_day', '30_day', '7_day', 'expired', 'custom')),
    
    -- Who was notified
    sent_to_worker BOOLEAN DEFAULT FALSE,
    sent_to_supervisor BOOLEAN DEFAULT FALSE,
    sent_to_safety_manager BOOLEAN DEFAULT FALSE,
    sent_to_emails TEXT[],  -- Additional email recipients
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'acknowledged')),
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Error tracking
    error_message TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. CREATE WORK RESTRICTIONS TABLE (Track workers restricted from tasks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    
    -- Reason for restriction
    reason TEXT NOT NULL CHECK (reason IN ('expired_certification', 'missing_certification', 'failed_assessment', 'safety_concern', 'other')),
    
    -- Related certification (if applicable)
    certification_id UUID REFERENCES certifications(id) ON DELETE SET NULL,
    certification_type_id UUID REFERENCES certification_types(id) ON DELETE SET NULL,
    
    -- Restriction details
    description TEXT,
    restricted_from TEXT[],  -- e.g., ['heights', 'confined_space', 'all_work']
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    auto_generated BOOLEAN DEFAULT FALSE,  -- True if system created due to expiry
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. EXTEND WORKERS TABLE FOR CERTIFICATION TRACKING
-- ============================================================================

ALTER TABLE workers
    ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS certification_status TEXT DEFAULT 'compliant' CHECK (certification_status IN ('compliant', 'expiring_soon', 'expired', 'not_checked')),
    ADD COLUMN IF NOT EXISTS has_active_restrictions BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_certification_check TIMESTAMPTZ;

-- ============================================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Certification types indexes
CREATE INDEX IF NOT EXISTS idx_certification_types_company_id ON certification_types(company_id);
CREATE INDEX IF NOT EXISTS idx_certification_types_category ON certification_types(category);
CREATE INDEX IF NOT EXISTS idx_certification_types_active ON certification_types(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_certification_types_system_unique ON certification_types(name) WHERE company_id IS NULL;

-- Certifications indexes (additional)
CREATE INDEX IF NOT EXISTS idx_certifications_type_id ON certifications(certification_type_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_expiring ON certifications(expiry_date) 
    WHERE status = 'active' AND expiry_date IS NOT NULL;

-- Training record types indexes
CREATE INDEX IF NOT EXISTS idx_training_record_types_company_id ON training_record_types(company_id);
CREATE INDEX IF NOT EXISTS idx_training_record_types_category ON training_record_types(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_record_types_system_unique ON training_record_types(name) WHERE company_id IS NULL;

-- Training records indexes
CREATE INDEX IF NOT EXISTS idx_training_records_company_id ON training_records(company_id);
CREATE INDEX IF NOT EXISTS idx_training_records_worker_id ON training_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_training_records_type_id ON training_records(training_type_id);
CREATE INDEX IF NOT EXISTS idx_training_records_category ON training_records(category);
CREATE INDEX IF NOT EXISTS idx_training_records_completed_date ON training_records(completed_date);

-- Certification alerts indexes
CREATE INDEX IF NOT EXISTS idx_certification_alerts_company_id ON certification_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_certification_alerts_certification_id ON certification_alerts(certification_id);
CREATE INDEX IF NOT EXISTS idx_certification_alerts_worker_id ON certification_alerts(worker_id);
CREATE INDEX IF NOT EXISTS idx_certification_alerts_status ON certification_alerts(status) WHERE status = 'pending';

-- Work restrictions indexes
CREATE INDEX IF NOT EXISTS idx_work_restrictions_company_id ON work_restrictions(company_id);
CREATE INDEX IF NOT EXISTS idx_work_restrictions_worker_id ON work_restrictions(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_restrictions_active ON work_restrictions(is_active) WHERE is_active = TRUE;

-- Workers supervisor index
CREATE INDEX IF NOT EXISTS idx_workers_supervisor_id ON workers(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_workers_certification_status ON workers(certification_status);

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_record_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_restrictions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. CREATE RLS POLICIES
-- ============================================================================

-- Certification Types Policies
DROP POLICY IF EXISTS "certification_types_select" ON certification_types;
CREATE POLICY "certification_types_select" ON certification_types
    FOR SELECT USING (
        company_id IS NULL  -- System defaults visible to all
        OR company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "certification_types_insert" ON certification_types;
CREATE POLICY "certification_types_insert" ON certification_types
    FOR INSERT WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "certification_types_update" ON certification_types;
CREATE POLICY "certification_types_update" ON certification_types
    FOR UPDATE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "certification_types_delete" ON certification_types;
CREATE POLICY "certification_types_delete" ON certification_types
    FOR DELETE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin') AND is_system_default = FALSE)
        OR is_super_admin()
    );

-- Training Record Types Policies
DROP POLICY IF EXISTS "training_record_types_select" ON training_record_types;
CREATE POLICY "training_record_types_select" ON training_record_types
    FOR SELECT USING (
        company_id IS NULL
        OR company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_record_types_insert" ON training_record_types;
CREATE POLICY "training_record_types_insert" ON training_record_types
    FOR INSERT WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_record_types_update" ON training_record_types;
CREATE POLICY "training_record_types_update" ON training_record_types
    FOR UPDATE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_record_types_delete" ON training_record_types;
CREATE POLICY "training_record_types_delete" ON training_record_types
    FOR DELETE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin') AND is_system_default = FALSE)
        OR is_super_admin()
    );

-- Training Records Policies
DROP POLICY IF EXISTS "training_records_select" ON training_records;
CREATE POLICY "training_records_select" ON training_records
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_records_insert" ON training_records;
CREATE POLICY "training_records_insert" ON training_records
    FOR INSERT WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_records_update" ON training_records;
CREATE POLICY "training_records_update" ON training_records
    FOR UPDATE USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "training_records_delete" ON training_records;
CREATE POLICY "training_records_delete" ON training_records
    FOR DELETE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'super_admin'))
        OR is_super_admin()
    );

-- Certification Alerts Policies
DROP POLICY IF EXISTS "certification_alerts_select" ON certification_alerts;
CREATE POLICY "certification_alerts_select" ON certification_alerts
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "certification_alerts_insert" ON certification_alerts;
CREATE POLICY "certification_alerts_insert" ON certification_alerts
    FOR INSERT WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "certification_alerts_update" ON certification_alerts;
CREATE POLICY "certification_alerts_update" ON certification_alerts
    FOR UPDATE USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- Work Restrictions Policies
DROP POLICY IF EXISTS "work_restrictions_select" ON work_restrictions;
CREATE POLICY "work_restrictions_select" ON work_restrictions
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "work_restrictions_insert" ON work_restrictions;
CREATE POLICY "work_restrictions_insert" ON work_restrictions
    FOR INSERT WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'super_admin'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "work_restrictions_update" ON work_restrictions;
CREATE POLICY "work_restrictions_update" ON work_restrictions
    FOR UPDATE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'super_admin'))
        OR is_super_admin()
    );

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON certification_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON training_record_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON training_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON certification_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON work_restrictions TO authenticated;

-- ============================================================================
-- 12. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a worker has valid certification
CREATE OR REPLACE FUNCTION worker_has_valid_certification(
    p_worker_id UUID,
    p_certification_type_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM certifications
        WHERE worker_id = p_worker_id
          AND certification_type_id = p_certification_type_id
          AND status = 'active'
          AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
    );
END;
$$;

-- Function to get worker's certification status summary
CREATE OR REPLACE FUNCTION get_worker_certification_summary(p_worker_id UUID)
RETURNS TABLE (
    total_certifications INTEGER,
    active_certifications INTEGER,
    expiring_30_days INTEGER,
    expiring_60_days INTEGER,
    expired_certifications INTEGER,
    has_restrictions BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_certifications,
        COUNT(*) FILTER (WHERE status = 'active' AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE))::INTEGER as active_certifications,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date > CURRENT_DATE)::INTEGER as expiring_30_days,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '60 days' AND expiry_date > CURRENT_DATE)::INTEGER as expiring_60_days,
        COUNT(*) FILTER (WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE))::INTEGER as expired_certifications,
        EXISTS (SELECT 1 FROM work_restrictions WHERE worker_id = p_worker_id AND is_active = TRUE) as has_restrictions
    FROM certifications
    WHERE worker_id = p_worker_id;
END;
$$;

-- Function to auto-generate work restrictions for expired certifications
CREATE OR REPLACE FUNCTION check_certification_expiry_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cert_type certification_types%ROWTYPE;
BEGIN
    -- Get the certification type
    SELECT * INTO v_cert_type
    FROM certification_types
    WHERE id = NEW.certification_type_id;
    
    -- If this certification is required for work and is now expired
    IF v_cert_type.required_for_work = TRUE AND 
       (NEW.status = 'expired' OR (NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= CURRENT_DATE)) THEN
        
        -- Create a work restriction if one doesn't exist
        INSERT INTO work_restrictions (
            company_id,
            worker_id,
            reason,
            certification_id,
            certification_type_id,
            description,
            auto_generated
        )
        SELECT 
            NEW.company_id,
            NEW.worker_id,
            'expired_certification',
            NEW.id,
            NEW.certification_type_id,
            'Auto-generated: ' || v_cert_type.name || ' certification has expired',
            TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM work_restrictions
            WHERE certification_id = NEW.id
              AND is_active = TRUE
        );
        
        -- Update worker status
        UPDATE workers
        SET certification_status = 'expired',
            has_active_restrictions = TRUE,
            last_certification_check = NOW()
        WHERE id = NEW.worker_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-create restrictions on certification update
DROP TRIGGER IF EXISTS trg_certification_expiry_check ON certifications;
CREATE TRIGGER trg_certification_expiry_check
    AFTER INSERT OR UPDATE OF status, expiry_date ON certifications
    FOR EACH ROW
    EXECUTE FUNCTION check_certification_expiry_restrictions();

-- Function to update certification status based on expiry
CREATE OR REPLACE FUNCTION update_expired_certifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE certifications
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date < CURRENT_DATE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Update worker statuses
    UPDATE workers w
    SET certification_status = 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM certifications c
                WHERE c.worker_id = w.id
                  AND (c.status = 'expired' OR (c.expiry_date IS NOT NULL AND c.expiry_date < CURRENT_DATE))
            ) THEN 'expired'
            WHEN EXISTS (
                SELECT 1 FROM certifications c
                WHERE c.worker_id = w.id
                  AND c.status = 'active'
                  AND c.expiry_date IS NOT NULL
                  AND c.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
            ) THEN 'expiring_soon'
            ELSE 'compliant'
        END,
        last_certification_check = NOW();
    
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION worker_has_valid_certification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_certification_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_expired_certifications() TO authenticated;

-- ============================================================================
-- 13. SEED DEFAULT CERTIFICATION TYPES
-- ============================================================================

INSERT INTO certification_types (
    company_id, name, short_code, description, category,
    default_expiry_months, required_for_work, is_system_default
) VALUES
    -- Safety Certifications
    (NULL, 'Working at Heights (WAH)', 'WAH', 
     'Ministry of Labour approved Working at Heights training for construction workers', 
     'safety', 36, TRUE, TRUE),
    
    (NULL, 'Standard First Aid & CPR', 'FA-CPR', 
     'Standard First Aid with CPR Level C and AED certification', 
     'safety', 36, FALSE, TRUE),
    
    (NULL, 'WHMIS 2015', 'WHMIS', 
     'Workplace Hazardous Materials Information System training', 
     'safety', 36, FALSE, TRUE),
    
    (NULL, 'Confined Space Entry', 'CSE', 
     'Confined space awareness and entry procedures', 
     'safety', 36, TRUE, TRUE),
    
    (NULL, 'Fall Protection', 'FP', 
     'Fall protection awareness and equipment training', 
     'safety', 36, TRUE, TRUE),
    
    (NULL, 'Forklift Operator', 'FORK', 
     'Powered industrial truck (forklift) operator certification', 
     'operational', 36, TRUE, TRUE),
    
    (NULL, 'Aerial Work Platform', 'AWP', 
     'Scissor lift and boom lift operator certification', 
     'operational', 36, TRUE, TRUE),
    
    (NULL, 'Traffic Control Person (TCP)', 'TCP', 
     'Traffic control and flagging certification', 
     'safety', 36, TRUE, TRUE),
    
    (NULL, 'Asbestos Awareness', 'ASB', 
     'Asbestos identification and safety procedures', 
     'safety', NULL, FALSE, TRUE),  -- No expiry
    
    (NULL, 'Silica Awareness', 'SIL', 
     'Crystalline silica hazard awareness', 
     'safety', NULL, FALSE, TRUE),  -- No expiry
    
    (NULL, 'Propane Handling', 'PROP', 
     'Safe propane handling and storage', 
     'operational', 36, FALSE, TRUE),
    
    (NULL, 'Hoisting & Rigging', 'RIG', 
     'Basic rigging and load securement', 
     'operational', 36, TRUE, TRUE),
    
    (NULL, 'Electrical Safety Awareness', 'ELEC', 
     'Electrical hazard recognition and arc flash awareness', 
     'safety', 36, FALSE, TRUE),
    
    (NULL, 'Trenching & Excavation', 'TRENCH', 
     'Excavation safety and trench rescue awareness', 
     'safety', 36, TRUE, TRUE)
ON CONFLICT (name) WHERE company_id IS NULL DO NOTHING;

-- ============================================================================
-- 14. SEED DEFAULT TRAINING RECORD TYPES
-- ============================================================================

INSERT INTO training_record_types (
    company_id, name, category, description, requires_hours, is_system_default
) VALUES
    (NULL, 'Safety Toolbox Talk', 'toolbox_talk', 'Weekly or daily safety meeting', FALSE, TRUE),
    (NULL, 'Job Hazard Analysis Review', 'toolbox_talk', 'JHA/JSA review with crew', FALSE, TRUE),
    (NULL, 'Equipment Operation OJT', 'ojt', 'On-the-job training for equipment operation', TRUE, TRUE),
    (NULL, 'Task-Specific OJT', 'ojt', 'On-the-job training for specific work tasks', TRUE, TRUE),
    (NULL, 'Competency Assessment', 'competency_assessment', 'Formal competency evaluation', FALSE, TRUE),
    (NULL, 'New Worker Orientation', 'orientation', 'Company safety and site orientation', TRUE, TRUE),
    (NULL, 'Site-Specific Orientation', 'orientation', 'Project/site specific safety orientation', TRUE, TRUE),
    (NULL, 'Annual Safety Refresher', 'course', 'Annual safety training refresher', TRUE, TRUE),
    (NULL, 'Emergency Response Drill', 'other', 'Participation in emergency drill', FALSE, TRUE),
    (NULL, 'Safety Meeting', 'other', 'Monthly or quarterly safety meeting', TRUE, TRUE)
ON CONFLICT (name) WHERE company_id IS NULL DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
