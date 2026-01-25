-- ============================================================================
-- Mock Audit Interview System Migration
-- ============================================================================
-- Tables for storing mock audit interview sessions and reports
-- Used to help workers prepare for real COR audits
-- ============================================================================

-- Mock Interview Sessions Table
CREATE TABLE mock_interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    audit_type TEXT NOT NULL CHECK (audit_type IN ('full', 'quick', 'element_specific')),
    focus_element INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    messages JSONB NOT NULL DEFAULT '[]',
    scores JSONB NOT NULL DEFAULT '{}',
    questions_asked TEXT[] DEFAULT '{}',
    current_question_id TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mock Interview Reports Table
CREATE TABLE mock_interview_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES mock_interview_sessions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    overall_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
    questions_asked INTEGER NOT NULL DEFAULT 0,
    questions_answered_well INTEGER NOT NULL DEFAULT 0,
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    feedback TEXT,
    ready_for_audit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mock_interview_sessions_company_id ON mock_interview_sessions(company_id);
CREATE INDEX idx_mock_interview_sessions_worker_id ON mock_interview_sessions(worker_id);
CREATE INDEX idx_mock_interview_sessions_user_profile_id ON mock_interview_sessions(user_profile_id);
CREATE INDEX idx_mock_interview_sessions_status ON mock_interview_sessions(status);
CREATE INDEX idx_mock_interview_reports_company_id ON mock_interview_reports(company_id);
CREATE INDEX idx_mock_interview_reports_session_id ON mock_interview_reports(session_id);
CREATE INDEX idx_mock_interview_reports_worker_id ON mock_interview_reports(worker_id);
CREATE INDEX idx_mock_interview_reports_ready ON mock_interview_reports(ready_for_audit);

-- Enable Row Level Security
ALTER TABLE mock_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interview_reports ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- MOCK_INTERVIEW_SESSIONS RLS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see sessions in their company OR super_admin can see all
CREATE POLICY "mock_interview_sessions_select_policy" ON mock_interview_sessions
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Users can create sessions in their company OR super_admin can create any
CREATE POLICY "mock_interview_sessions_insert_policy" ON mock_interview_sessions
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Users can update sessions in their company OR super_admin can update any
CREATE POLICY "mock_interview_sessions_update_policy" ON mock_interview_sessions
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Users can delete sessions in their company OR super_admin can delete any
CREATE POLICY "mock_interview_sessions_delete_policy" ON mock_interview_sessions
    FOR DELETE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- MOCK_INTERVIEW_REPORTS RLS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see reports in their company OR super_admin can see all
CREATE POLICY "mock_interview_reports_select_policy" ON mock_interview_reports
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Users can create reports in their company OR super_admin can create any
CREATE POLICY "mock_interview_reports_insert_policy" ON mock_interview_reports
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Users can update reports in their company OR super_admin can update any
CREATE POLICY "mock_interview_reports_update_policy" ON mock_interview_reports
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Users can delete reports in their company OR super_admin can delete any
CREATE POLICY "mock_interview_reports_delete_policy" ON mock_interview_reports
    FOR DELETE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- Grant permissions to authenticated users (RLS will filter access)
GRANT SELECT, INSERT, UPDATE, DELETE ON mock_interview_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mock_interview_reports TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
