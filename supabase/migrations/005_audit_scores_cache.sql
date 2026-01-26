-- ============================================================================
-- Audit Scores Cache Table
-- ============================================================================
-- Caches calculated COR compliance scores to improve performance.
-- Scores are recalculated daily and on-demand when admin requests refresh.
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Score data stored as JSONB for flexibility
    score_data JSONB NOT NULL,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Ensure one cache entry per company
    UNIQUE(company_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_audit_scores_company ON audit_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_scores_expires ON audit_scores(expires_at);

-- Enable RLS
ALTER TABLE audit_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "audit_scores_select" ON audit_scores;
CREATE POLICY "audit_scores_select" ON audit_scores
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "audit_scores_insert" ON audit_scores;
CREATE POLICY "audit_scores_insert" ON audit_scores
    FOR INSERT WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "audit_scores_update" ON audit_scores;
CREATE POLICY "audit_scores_update" ON audit_scores
    FOR UPDATE USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "audit_scores_delete" ON audit_scores;
CREATE POLICY "audit_scores_delete" ON audit_scores
    FOR DELETE USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_scores TO authenticated;

-- Comment
COMMENT ON TABLE audit_scores IS 'Cached COR compliance scores for each company. Recalculated daily.';
COMMENT ON COLUMN audit_scores.score_data IS 'JSON containing full OverallScore object with element breakdowns';
COMMENT ON COLUMN audit_scores.expires_at IS 'Score expires at midnight and triggers recalculation';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
