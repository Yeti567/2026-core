-- ============================================================================
-- ONBOARDING PROGRESS TRACKING SYSTEM
-- ============================================================================
-- Tracks the 5-step onboarding wizard progress for each company:
-- 1. Company Registration
-- 2. Employees (CSV/Manual)
-- 3. Equipment (CSV/Manual)
-- 4. Documents
-- 5. Forms Setup
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    completed_steps INTEGER[] NOT NULL DEFAULT '{}',
    skipped_steps INTEGER[] NOT NULL DEFAULT '{}',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see their own company's onboarding progress
CREATE POLICY "onboarding_progress_select_policy" ON onboarding_progress
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT/UPDATE: Admins and Super Admins can manage onboarding progress
CREATE POLICY "onboarding_progress_insert_policy" ON onboarding_progress
    FOR INSERT
    WITH CHECK (
        (company_id = get_user_company_id() AND (get_user_role() = 'admin' OR get_user_role() = 'super_admin'))
        OR is_super_admin()
    );

CREATE POLICY "onboarding_progress_update_policy" ON onboarding_progress
    FOR UPDATE
    USING (
        (company_id = get_user_company_id() AND (get_user_role() = 'admin' OR get_user_role() = 'super_admin'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND (get_user_role() = 'admin' OR get_user_role() = 'super_admin'))
        OR is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_onboarding_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_last_updated
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_last_updated();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON onboarding_progress TO authenticated;

COMMENT ON TABLE onboarding_progress IS 'Tracks the guided onboarding flow progress for each company';
