-- ============================================================================
-- COR 2020 Audit Questions Table
-- ============================================================================
-- Stores all audit questions from the COR 2020 audit tool.
-- Each element has multiple questions with verification methods and evidence requirements.
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Element reference
    element_number INTEGER NOT NULL CHECK (element_number >= 1 AND element_number <= 14),
    question_number TEXT NOT NULL, -- e.g., "2.1", "2.2", "3.1"
    
    -- Question content
    question_text TEXT NOT NULL,
    
    -- Verification methods auditor will use
    verification_methods TEXT[] NOT NULL DEFAULT '{}', -- ['document', 'observation', 'interview']
    
    -- What evidence types satisfy this question
    required_evidence_types TEXT[] NOT NULL DEFAULT '{}', -- Form codes or document types
    
    -- Scoring
    point_value INTEGER NOT NULL DEFAULT 5,
    
    -- Sampling guidance for auditors
    sampling_requirements TEXT,
    
    -- Additional metadata
    category TEXT, -- 'documentation', 'implementation', 'effectiveness'
    guidance_notes TEXT, -- Tips for auditors
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique question number per element
    UNIQUE(element_number, question_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_questions_element ON audit_questions(element_number);
CREATE INDEX IF NOT EXISTS idx_audit_questions_evidence ON audit_questions USING GIN (required_evidence_types);

-- Enable RLS (read-only for authenticated users)
ALTER TABLE audit_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_questions_select" ON audit_questions;
CREATE POLICY "audit_questions_select" ON audit_questions
    FOR SELECT TO authenticated
    USING (true); -- All authenticated users can read audit questions

-- Grant permissions
GRANT SELECT ON audit_questions TO authenticated;

-- Comments
COMMENT ON TABLE audit_questions IS 'COR 2020 audit questions with evidence requirements';
COMMENT ON COLUMN audit_questions.verification_methods IS 'How auditor verifies: document, observation, interview';
COMMENT ON COLUMN audit_questions.required_evidence_types IS 'Form codes and document types that answer this question';
COMMENT ON COLUMN audit_questions.sampling_requirements IS 'How many samples auditor needs to review';

-- ============================================================================
-- Evidence Mapping Table (tracks which submissions answer which questions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_question_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- What evidence
    evidence_type TEXT NOT NULL, -- 'form_submission', 'document', 'training_record'
    evidence_id UUID NOT NULL,
    
    -- Which question it answers
    audit_question_id UUID NOT NULL REFERENCES audit_questions(id) ON DELETE CASCADE,
    
    -- Mapping metadata
    relevance_score INTEGER DEFAULT 100, -- 0-100, how well this evidence answers the question
    auto_mapped BOOLEAN DEFAULT true, -- Was this mapped automatically or manually
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent duplicate mappings
    UNIQUE(company_id, evidence_type, evidence_id, audit_question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_mappings_company ON evidence_question_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_evidence_mappings_question ON evidence_question_mappings(audit_question_id);
CREATE INDEX IF NOT EXISTS idx_evidence_mappings_evidence ON evidence_question_mappings(evidence_type, evidence_id);

-- Enable RLS
ALTER TABLE evidence_question_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence_mappings_select" ON evidence_question_mappings;
CREATE POLICY "evidence_mappings_select" ON evidence_question_mappings
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "evidence_mappings_insert" ON evidence_question_mappings;
CREATE POLICY "evidence_mappings_insert" ON evidence_question_mappings
    FOR INSERT WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "evidence_mappings_delete" ON evidence_question_mappings;
CREATE POLICY "evidence_mappings_delete" ON evidence_question_mappings
    FOR DELETE USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON evidence_question_mappings TO authenticated;

COMMENT ON TABLE evidence_question_mappings IS 'Links evidence items to audit questions they help answer';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
