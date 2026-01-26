-- ============================================================================
-- DOCUMENT CONTROL SYSTEM - COMPREHENSIVE SCHEMA
-- ============================================================================
-- Full document management system including:
-- - Configurable document types with approval workflows
-- - Document registry with control numbers (NCCI-POL-001)
-- - Version control and revision history
-- - Multi-step approval workflows
-- - Scheduled reviews with notifications
-- - Distribution tracking and acknowledgments
-- - Legal-compliant archive system
-- - Full-text search across all documents
-- - Audit trail integration
-- ============================================================================

-- ============================================================================
-- 1. CREATE SEQUENCES FOR CONTROL NUMBER GENERATION
-- ============================================================================

-- Sequence table to track control numbers per company and document type
CREATE TABLE IF NOT EXISTS document_control_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_type_code TEXT NOT NULL,
    current_sequence INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, document_type_code)
);

COMMENT ON TABLE document_control_sequences IS 'Tracks the next sequence number for control number generation per company and document type';

-- ============================================================================
-- 2. CREATE DOCUMENT TYPES TABLE
-- ============================================================================

-- Configurable document types with approval and review settings
CREATE TABLE IF NOT EXISTS document_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    approval_roles TEXT[] DEFAULT ARRAY['safety_manager'],
    review_frequency_months INTEGER DEFAULT 12,
    prefix_format TEXT NOT NULL DEFAULT '{company}-{type}-{sequence}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    icon TEXT, -- Optional icon identifier for UI
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_types IS 'Master list of document types with configurable approval and review requirements';
COMMENT ON COLUMN document_types.code IS 'Short code used in control numbers: POL, SWP, FRM, etc.';
COMMENT ON COLUMN document_types.approval_roles IS 'Array of roles that can approve: [''safety_manager'', ''management'']';
COMMENT ON COLUMN document_types.prefix_format IS 'Control number format template with placeholders';

-- ============================================================================
-- 3. CREATE MAIN DOCUMENTS TABLE
-- ============================================================================

-- Document status enum for type safety
CREATE TYPE document_status AS ENUM (
    'draft',           -- Initial creation, not visible to workers
    'pending_review',  -- Submitted for review/approval
    'under_review',    -- Currently being reviewed
    'approved',        -- Approved but not yet effective
    'active',          -- Published and in effect
    'under_revision',  -- Being updated, new version in progress
    'obsolete',        -- No longer in use, superseded
    'archived'         -- Moved to archive, retained for legal purposes
);

-- Change type enum for revision tracking
CREATE TYPE document_change_type AS ENUM (
    'initial',         -- First version
    'minor_edit',      -- Small corrections, formatting
    'major_revision',  -- Significant content changes
    'complete_rewrite' -- Complete document replacement
);

-- Archive reason enum
CREATE TYPE archive_reason AS ENUM (
    'superseded',      -- Replaced by newer version
    'obsolete',        -- No longer applicable
    'expired',         -- Reached expiry date
    'regulatory_change', -- Due to regulation changes
    'manual'           -- Manually archived
);

-- Main documents table (Master Index)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Control Number (e.g., NCCI-POL-001)
    control_number TEXT NOT NULL,
    document_type_code TEXT NOT NULL REFERENCES document_types(code),
    sequence_number INTEGER NOT NULL,
    
    -- Document Metadata
    title TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    status document_status NOT NULL DEFAULT 'draft',
    
    -- File Information
    file_path TEXT,                    -- Path in Supabase Storage
    file_name TEXT,                    -- Original filename
    file_size_bytes BIGINT,
    file_type TEXT,                    -- MIME type: application/pdf, etc.
    page_count INTEGER,
    
    -- Extracted Content (for search)
    extracted_text TEXT,               -- Full text extracted from PDF
    search_vector tsvector,            -- Full-text search vector
    
    -- Ownership & Creation
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Approval Information
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Effective Dates
    effective_date DATE,               -- When document becomes active
    expiry_date DATE,                  -- When document expires (if applicable)
    
    -- Review Schedule
    next_review_date DATE,             -- When to review again
    last_reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES user_profiles(id),
    
    -- Version Chain
    supersedes_document_id UUID REFERENCES documents(id),  -- Previous version this replaces
    superseded_by_document_id UUID REFERENCES documents(id), -- Newer version that replaced this
    
    -- Classification & Tagging
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],           -- Keywords for searching
    cor_elements INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- COR elements: [1, 2, 3]
    applicable_to TEXT[] DEFAULT ARRAY['all_workers']::TEXT[], -- Who needs this document
    department TEXT,                   -- Owning department
    category TEXT,                     -- Additional categorization
    
    -- Ensure unique control numbers per company
    UNIQUE(company_id, control_number)
);

COMMENT ON TABLE documents IS 'Master document registry - central table for all controlled documents';
COMMENT ON COLUMN documents.control_number IS 'Unique identifier like NCCI-POL-001, auto-generated';
COMMENT ON COLUMN documents.extracted_text IS 'Full text from PDF for full-text search';
COMMENT ON COLUMN documents.cor_elements IS 'COR audit elements this document supports [1-14]';
COMMENT ON COLUMN documents.applicable_to IS 'Audience: [''all_workers'', ''supervisors'', ''concrete_crew'']';

-- ============================================================================
-- 4. CREATE DOCUMENT REVISIONS TABLE (Version History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Version Information
    version TEXT NOT NULL,
    revision_number INTEGER NOT NULL,  -- Auto-increment per document
    previous_version TEXT,
    
    -- File Archive
    file_path TEXT,                    -- Archived version file path
    file_name TEXT,
    file_size_bytes BIGINT,
    
    -- Change Tracking
    change_type document_change_type NOT NULL DEFAULT 'minor_edit',
    change_summary TEXT NOT NULL,      -- Why was it changed (required)
    change_details TEXT,               -- Detailed description of changes
    
    -- Who & When
    changed_by UUID REFERENCES user_profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata snapshot at time of revision
    metadata_snapshot JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(document_id, revision_number)
);

COMMENT ON TABLE document_revisions IS 'Complete version history - every change creates a revision record';
COMMENT ON COLUMN document_revisions.change_summary IS 'Brief description of changes (required for audit trail)';
COMMENT ON COLUMN document_revisions.metadata_snapshot IS 'JSON snapshot of document state at this revision';

-- ============================================================================
-- 5. CREATE DOCUMENT APPROVALS TABLE (Approval Workflow)
-- ============================================================================

CREATE TYPE approval_status AS ENUM (
    'pending',         -- Awaiting action
    'approved',        -- Approved by this approver
    'rejected',        -- Rejected by this approver
    'skipped',         -- Skipped (optional approver)
    'delegated'        -- Delegated to another approver
);

CREATE TABLE IF NOT EXISTS document_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Approver Information
    approver_role TEXT NOT NULL,       -- Required role: safety_manager, director
    approver_id UUID REFERENCES user_profiles(id), -- Assigned approver (if specific)
    delegated_to UUID REFERENCES user_profiles(id), -- If delegated
    
    -- Workflow Position
    approval_order INTEGER NOT NULL DEFAULT 1, -- Sequence: 1, 2, 3
    required BOOLEAN NOT NULL DEFAULT true,    -- Must this person approve?
    
    -- Status
    status approval_status NOT NULL DEFAULT 'pending',
    
    -- Approval Details
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    approval_comments TEXT,
    
    -- Signature (digital)
    signature_data TEXT,               -- Base64 encoded signature image
    signature_type TEXT,               -- 'drawn', 'typed', 'certificate'
    
    -- Notifications
    notified_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(document_id, approval_order)
);

COMMENT ON TABLE document_approvals IS 'Multi-step approval workflow tracking';
COMMENT ON COLUMN document_approvals.approval_order IS 'Sequential order for approval chain';
COMMENT ON COLUMN document_approvals.signature_data IS 'Base64 encoded digital signature';

-- ============================================================================
-- 6. CREATE DOCUMENT REVIEWS TABLE (Scheduled Reviews)
-- ============================================================================

CREATE TYPE review_status AS ENUM (
    'scheduled',       -- Future review scheduled
    'pending',         -- Due now, not started
    'in_progress',     -- Currently being reviewed
    'completed',       -- Review finished
    'overdue',         -- Past due date
    'cancelled'        -- Review cancelled
);

CREATE TYPE review_outcome AS ENUM (
    'no_change',       -- Document is still current
    'minor_update',    -- Small corrections made
    'major_revision',  -- Significant updates needed
    'obsolete',        -- Document should be retired
    'extend_review'    -- Extend review period
);

CREATE TABLE IF NOT EXISTS document_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Review Schedule
    review_due_date DATE NOT NULL,
    review_type TEXT DEFAULT 'scheduled', -- scheduled, adhoc, regulatory
    
    -- Assignment
    review_assigned_to UUID REFERENCES user_profiles(id),
    review_assigned_at TIMESTAMPTZ,
    
    -- Status Tracking
    review_status review_status NOT NULL DEFAULT 'scheduled',
    
    -- Progress
    review_started_at TIMESTAMPTZ,
    review_completed_at TIMESTAMPTZ,
    
    -- Outcome
    review_outcome review_outcome,
    reviewer_notes TEXT,
    action_items TEXT[],               -- List of follow-up actions
    
    -- Next Review
    next_review_date DATE,
    
    -- Notifications
    reminder_sent_at TIMESTAMPTZ,
    escalation_sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_reviews IS 'Scheduled review tracking - ensures documents stay current';
COMMENT ON COLUMN document_reviews.action_items IS 'Array of follow-up tasks from the review';

-- ============================================================================
-- 7. CREATE DOCUMENT DISTRIBUTIONS TABLE (Acknowledgments)
-- ============================================================================

CREATE TYPE distribution_method AS ENUM (
    'email',           -- Sent via email
    'in_person',       -- Physical handout
    'posted',          -- Posted on notice board
    'system_notification', -- In-app notification
    'training_session' -- Distributed during training
);

CREATE TABLE IF NOT EXISTS document_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Recipient
    distributed_to UUID NOT NULL REFERENCES user_profiles(id),
    worker_id UUID REFERENCES workers(id), -- Link to worker record if applicable
    
    -- Distribution Details
    distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    distributed_by UUID REFERENCES user_profiles(id),
    distribution_method distribution_method NOT NULL DEFAULT 'system_notification',
    distribution_notes TEXT,
    
    -- Acknowledgment
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledgment_method TEXT,        -- 'signature', 'checkbox', 'quiz'
    acknowledgment_signature TEXT,     -- Base64 encoded signature
    
    -- Quiz/Test (if required)
    quiz_required BOOLEAN DEFAULT false,
    quiz_passed BOOLEAN,
    quiz_score NUMERIC(5,2),
    quiz_completed_at TIMESTAMPTZ,
    
    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(document_id, distributed_to)
);

COMMENT ON TABLE document_distributions IS 'Tracks who received documents and their acknowledgments';
COMMENT ON COLUMN document_distributions.acknowledgment_signature IS 'Base64 digital signature confirming receipt';

-- ============================================================================
-- 8. CREATE DOCUMENT ARCHIVE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Keep archive even if doc deleted
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Document Snapshot
    control_number TEXT NOT NULL,
    document_type_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    
    -- File Archive
    file_path TEXT,                    -- Path in archive storage bucket
    file_name TEXT,
    file_size_bytes BIGINT,
    extracted_text TEXT,
    
    -- Archive Information
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_by UUID REFERENCES user_profiles(id),
    archive_reason archive_reason NOT NULL,
    archive_notes TEXT,
    
    -- Retention Policy
    retention_period_years INTEGER NOT NULL DEFAULT 7, -- Legal retention
    can_be_destroyed_after DATE,       -- Earliest destruction date
    destruction_hold BOOLEAN DEFAULT false, -- Legal hold prevents destruction
    destruction_hold_reason TEXT,
    
    -- Original Metadata
    original_created_at TIMESTAMPTZ,
    original_created_by UUID,
    original_approved_at TIMESTAMPTZ,
    original_approved_by UUID,
    
    -- Full metadata snapshot
    metadata_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_archive IS 'Permanent archive - documents are never deleted, only archived';
COMMENT ON COLUMN document_archive.retention_period_years IS 'Legal retention requirement in years';
COMMENT ON COLUMN document_archive.destruction_hold IS 'If true, document cannot be destroyed (legal hold)';

-- ============================================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Document control sequences
CREATE INDEX IF NOT EXISTS idx_doc_seq_company ON document_control_sequences(company_id);

-- Documents - Primary indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_control_number ON documents(company_id, control_number);
CREATE INDEX IF NOT EXISTS idx_doc_type ON documents(company_id, document_type_code);
CREATE INDEX IF NOT EXISTS idx_doc_status ON documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_review_date ON documents(company_id, next_review_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_doc_effective_date ON documents(company_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_doc_expiry_date ON documents(company_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_doc_updated_at ON documents(updated_at DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_doc_search ON documents USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_doc_text_search ON documents USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(extracted_text, '')));

-- Array indexes (GIN for containment queries)
CREATE INDEX IF NOT EXISTS idx_doc_cor_elements ON documents USING gin(cor_elements);
CREATE INDEX IF NOT EXISTS idx_doc_tags ON documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_doc_applicable_to ON documents USING gin(applicable_to);

-- Revisions
CREATE INDEX IF NOT EXISTS idx_revision_document ON document_revisions(document_id);
CREATE INDEX IF NOT EXISTS idx_revision_company ON document_revisions(company_id);
CREATE INDEX IF NOT EXISTS idx_revision_changed_at ON document_revisions(changed_at DESC);

-- Approvals
CREATE INDEX IF NOT EXISTS idx_approval_document ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_company ON document_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_approver ON document_approvals(approver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approval_status ON document_approvals(status);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_review_document ON document_reviews(document_id);
CREATE INDEX IF NOT EXISTS idx_review_company ON document_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_review_due_date ON document_reviews(review_due_date) WHERE review_status IN ('scheduled', 'pending', 'overdue');
CREATE INDEX IF NOT EXISTS idx_review_assigned ON document_reviews(review_assigned_to) WHERE review_status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_review_status ON document_reviews(review_status);

-- Distributions
CREATE INDEX IF NOT EXISTS idx_dist_document ON document_distributions(document_id);
CREATE INDEX IF NOT EXISTS idx_dist_company ON document_distributions(company_id);
CREATE INDEX IF NOT EXISTS idx_dist_recipient ON document_distributions(distributed_to);
CREATE INDEX IF NOT EXISTS idx_dist_unacknowledged ON document_distributions(company_id, acknowledged) WHERE acknowledged = false;

-- Archive
CREATE INDEX IF NOT EXISTS idx_archive_company ON document_archive(company_id);
CREATE INDEX IF NOT EXISTS idx_archive_control ON document_archive(control_number);
CREATE INDEX IF NOT EXISTS idx_archive_document ON document_archive(document_id);
CREATE INDEX IF NOT EXISTS idx_archive_destruction ON document_archive(can_be_destroyed_after) WHERE destruction_hold = false;

-- ============================================================================
-- 10. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Generate control number for a document
CREATE OR REPLACE FUNCTION generate_control_number(
    p_company_id UUID,
    p_doc_type_code TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_initials TEXT;
    v_sequence INTEGER;
    v_prefix_format TEXT;
    v_control_number TEXT;
BEGIN
    -- Get company initials (first letters of each word, up to 4 chars)
    SELECT UPPER(
        SUBSTRING(
            string_agg(SUBSTRING(word, 1, 1), ''),
            1, 4
        )
    )
    INTO v_company_initials
    FROM companies,
    regexp_split_to_table(name, '\s+') AS word
    WHERE id = p_company_id;
    
    -- Default to 'DOC' if no initials found
    IF v_company_initials IS NULL OR v_company_initials = '' THEN
        v_company_initials := 'DOC';
    END IF;
    
    -- Get the prefix format from document_types
    SELECT COALESCE(prefix_format, '{company}-{type}-{sequence}')
    INTO v_prefix_format
    FROM document_types
    WHERE code = p_doc_type_code;
    
    IF v_prefix_format IS NULL THEN
        v_prefix_format := '{company}-{type}-{sequence}';
    END IF;
    
    -- Get and increment sequence
    INSERT INTO document_control_sequences (company_id, document_type_code, current_sequence)
    VALUES (p_company_id, p_doc_type_code, 1)
    ON CONFLICT (company_id, document_type_code) DO UPDATE
    SET current_sequence = document_control_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_sequence;
    
    -- Build control number from format
    v_control_number := v_prefix_format;
    v_control_number := REPLACE(v_control_number, '{company}', v_company_initials);
    v_control_number := REPLACE(v_control_number, '{type}', p_doc_type_code);
    v_control_number := REPLACE(v_control_number, '{sequence}', LPAD(v_sequence::TEXT, 3, '0'));
    
    RETURN v_control_number;
END;
$$;

COMMENT ON FUNCTION generate_control_number IS 'Generates unique control number like NCCI-POL-001';

-- Increment version number
CREATE OR REPLACE FUNCTION increment_version(
    p_current_version TEXT,
    p_change_type document_change_type
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_parts TEXT[];
    v_major INTEGER;
    v_minor INTEGER;
BEGIN
    -- Parse current version (e.g., "1.2" -> major=1, minor=2)
    v_parts := string_to_array(p_current_version, '.');
    v_major := COALESCE(v_parts[1]::INTEGER, 1);
    v_minor := COALESCE(v_parts[2]::INTEGER, 0);
    
    -- Increment based on change type
    CASE p_change_type
        WHEN 'complete_rewrite' THEN
            v_major := v_major + 1;
            v_minor := 0;
        WHEN 'major_revision' THEN
            v_major := v_major + 1;
            v_minor := 0;
        WHEN 'minor_edit' THEN
            v_minor := v_minor + 1;
        ELSE
            v_minor := v_minor + 1;
    END CASE;
    
    RETURN v_major::TEXT || '.' || v_minor::TEXT;
END;
$$;

COMMENT ON FUNCTION increment_version IS 'Increments version based on change type: major (2.0) or minor (1.3)';

-- Archive a document
CREATE OR REPLACE FUNCTION archive_document(
    p_document_id UUID,
    p_archive_reason archive_reason DEFAULT 'manual',
    p_archive_notes TEXT DEFAULT NULL,
    p_archived_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_doc RECORD;
    v_archive_id UUID;
    v_retention_years INTEGER;
BEGIN
    -- Get document data
    SELECT * INTO v_doc FROM documents WHERE id = p_document_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found: %', p_document_id;
    END IF;
    
    -- Determine retention period based on document type
    SELECT COALESCE(review_frequency_months / 12 + 5, 7)
    INTO v_retention_years
    FROM document_types
    WHERE code = v_doc.document_type_code;
    
    IF v_retention_years IS NULL THEN
        v_retention_years := 7;
    END IF;
    
    -- Create archive entry
    INSERT INTO document_archive (
        document_id,
        company_id,
        control_number,
        document_type_code,
        title,
        description,
        version,
        file_path,
        file_name,
        file_size_bytes,
        extracted_text,
        archived_by,
        archive_reason,
        archive_notes,
        retention_period_years,
        can_be_destroyed_after,
        original_created_at,
        original_created_by,
        original_approved_at,
        original_approved_by,
        metadata_snapshot
    ) VALUES (
        p_document_id,
        v_doc.company_id,
        v_doc.control_number,
        v_doc.document_type_code,
        v_doc.title,
        v_doc.description,
        v_doc.version,
        v_doc.file_path,
        v_doc.file_name,
        v_doc.file_size_bytes,
        v_doc.extracted_text,
        COALESCE(p_archived_by, v_doc.created_by),
        p_archive_reason,
        p_archive_notes,
        v_retention_years,
        CURRENT_DATE + (v_retention_years || ' years')::INTERVAL,
        v_doc.created_at,
        v_doc.created_by,
        v_doc.approved_at,
        v_doc.approved_by,
        jsonb_build_object(
            'tags', v_doc.tags,
            'cor_elements', v_doc.cor_elements,
            'applicable_to', v_doc.applicable_to,
            'effective_date', v_doc.effective_date,
            'expiry_date', v_doc.expiry_date,
            'department', v_doc.department,
            'category', v_doc.category
        )
    )
    RETURNING id INTO v_archive_id;
    
    -- Update document status
    UPDATE documents
    SET status = 'archived',
        updated_at = NOW()
    WHERE id = p_document_id;
    
    RETURN v_archive_id;
END;
$$;

COMMENT ON FUNCTION archive_document IS 'Archives a document with full metadata preservation';

-- Check documents needing review
CREATE OR REPLACE FUNCTION check_document_reviews(
    p_company_id UUID DEFAULT NULL,
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    document_id UUID,
    control_number TEXT,
    title TEXT,
    document_type TEXT,
    next_review_date DATE,
    days_until_review INTEGER,
    review_status TEXT,
    assigned_to UUID
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.control_number,
        d.title,
        dt.name,
        d.next_review_date,
        (d.next_review_date - CURRENT_DATE)::INTEGER,
        CASE 
            WHEN d.next_review_date < CURRENT_DATE THEN 'overdue'
            WHEN d.next_review_date <= CURRENT_DATE + p_days_ahead THEN 'due_soon'
            ELSE 'scheduled'
        END,
        dr.review_assigned_to
    FROM documents d
    LEFT JOIN document_types dt ON dt.code = d.document_type_code
    LEFT JOIN document_reviews dr ON dr.document_id = d.id 
        AND dr.review_status IN ('scheduled', 'pending')
    WHERE d.status = 'active'
      AND d.next_review_date IS NOT NULL
      AND d.next_review_date <= CURRENT_DATE + p_days_ahead
      AND (p_company_id IS NULL OR d.company_id = p_company_id)
    ORDER BY d.next_review_date ASC;
END;
$$;

COMMENT ON FUNCTION check_document_reviews IS 'Returns documents due for review within specified days';

-- Search documents with full-text search
CREATE OR REPLACE FUNCTION search_documents(
    p_company_id UUID,
    p_search_query TEXT,
    p_status document_status[] DEFAULT ARRAY['active', 'approved']::document_status[],
    p_document_types TEXT[] DEFAULT NULL,
    p_cor_elements INTEGER[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    control_number TEXT,
    title TEXT,
    description TEXT,
    document_type_code TEXT,
    document_type_name TEXT,
    version TEXT,
    status document_status,
    relevance_rank REAL,
    headline TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_query tsquery;
BEGIN
    -- Parse search query
    v_query := websearch_to_tsquery('english', p_search_query);
    
    RETURN QUERY
    SELECT 
        d.id,
        d.control_number,
        d.title,
        d.description,
        d.document_type_code,
        dt.name,
        d.version,
        d.status,
        ts_rank(d.search_vector, v_query) AS relevance_rank,
        ts_headline('english', 
            COALESCE(d.title, '') || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(d.extracted_text, ''),
            v_query,
            'MaxWords=50, MinWords=20, MaxFragments=2'
        ) AS headline
    FROM documents d
    LEFT JOIN document_types dt ON dt.code = d.document_type_code
    WHERE d.company_id = p_company_id
      AND d.status = ANY(p_status)
      AND (p_document_types IS NULL OR d.document_type_code = ANY(p_document_types))
      AND (p_cor_elements IS NULL OR d.cor_elements && p_cor_elements)
      AND (
          d.search_vector @@ v_query
          OR d.control_number ILIKE '%' || p_search_query || '%'
          OR d.title ILIKE '%' || p_search_query || '%'
      )
    ORDER BY relevance_rank DESC, d.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_documents IS 'Full-text search across documents with ranking and highlighting';

-- Get next revision number for a document
CREATE OR REPLACE FUNCTION get_next_revision_number(p_document_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_next INTEGER;
BEGIN
    SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO v_next
    FROM document_revisions
    WHERE document_id = p_document_id;
    
    RETURN v_next;
END;
$$;

-- ============================================================================
-- 11. CREATE TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- Update search vector trigger function
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.control_number, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.extracted_text, '')), 'C');
    RETURN NEW;
END;
$$;

-- Create revision on document update
CREATE OR REPLACE FUNCTION create_revision_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only create revision if significant fields changed
    IF OLD.version IS DISTINCT FROM NEW.version 
       OR OLD.file_path IS DISTINCT FROM NEW.file_path 
       OR OLD.title IS DISTINCT FROM NEW.title THEN
        
        INSERT INTO document_revisions (
            document_id,
            company_id,
            version,
            revision_number,
            previous_version,
            file_path,
            file_name,
            file_size_bytes,
            change_type,
            change_summary,
            changed_by,
            metadata_snapshot
        ) VALUES (
            OLD.id,
            OLD.company_id,
            OLD.version,
            get_next_revision_number(OLD.id),
            OLD.version,
            OLD.file_path,
            OLD.file_name,
            OLD.file_size_bytes,
            'minor_edit',
            'Document updated',
            NEW.created_by,
            jsonb_build_object(
                'title', OLD.title,
                'description', OLD.description,
                'status', OLD.status,
                'tags', OLD.tags
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update review status to overdue
CREATE OR REPLACE FUNCTION update_overdue_reviews()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if review is now overdue
    IF NEW.review_due_date < CURRENT_DATE 
       AND NEW.review_status IN ('scheduled', 'pending') THEN
        NEW.review_status := 'overdue';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply triggers
CREATE TRIGGER tr_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

CREATE TRIGGER tr_documents_search_vector
    BEFORE INSERT OR UPDATE OF title, description, extracted_text, tags, control_number
    ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

CREATE TRIGGER tr_documents_create_revision
    AFTER UPDATE ON documents
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION create_revision_on_update();

CREATE TRIGGER tr_approvals_updated_at
    BEFORE UPDATE ON document_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

CREATE TRIGGER tr_reviews_updated_at
    BEFORE UPDATE ON document_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

CREATE TRIGGER tr_reviews_check_overdue
    BEFORE INSERT OR UPDATE OF review_due_date, review_status
    ON document_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_overdue_reviews();

-- ============================================================================
-- 12. CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active documents view
CREATE VIEW active_documents AS
SELECT 
    d.*,
    dt.name AS document_type_name,
    dt.requires_approval,
    dt.review_frequency_months
FROM documents d
JOIN document_types dt ON dt.code = d.document_type_code
WHERE d.status = 'active'
ORDER BY d.control_number;

COMMENT ON VIEW active_documents IS 'All currently active documents with type information';

-- Documents needing review
CREATE VIEW documents_needing_review AS
SELECT 
    d.id,
    d.company_id,
    d.control_number,
    d.title,
    d.document_type_code,
    dt.name AS document_type_name,
    d.version,
    d.next_review_date,
    (d.next_review_date - CURRENT_DATE) AS days_until_review,
    d.last_reviewed_at,
    CASE 
        WHEN d.next_review_date < CURRENT_DATE THEN 'overdue'
        WHEN d.next_review_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_this_week'
        WHEN d.next_review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_this_month'
        ELSE 'upcoming'
    END AS urgency
FROM documents d
JOIN document_types dt ON dt.code = d.document_type_code
WHERE d.status = 'active'
  AND d.next_review_date IS NOT NULL
  AND d.next_review_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY d.next_review_date ASC;

COMMENT ON VIEW documents_needing_review IS 'Documents with reviews due in the next 90 days';

-- Document approval status view
CREATE VIEW document_approval_status AS
SELECT 
    d.id,
    d.company_id,
    d.control_number,
    d.title,
    d.status,
    d.version,
    COUNT(da.id) AS total_approvals_required,
    COUNT(da.id) FILTER (WHERE da.status = 'approved') AS approvals_received,
    COUNT(da.id) FILTER (WHERE da.status = 'rejected') AS rejections,
    COUNT(da.id) FILTER (WHERE da.status = 'pending') AS pending_approvals,
    bool_and(da.status = 'approved') FILTER (WHERE da.required = true) AS fully_approved,
    MIN(da.approved_at) FILTER (WHERE da.status = 'approved') AS first_approval_at,
    MAX(da.approved_at) FILTER (WHERE da.status = 'approved') AS last_approval_at
FROM documents d
LEFT JOIN document_approvals da ON da.document_id = d.id
WHERE d.status IN ('pending_review', 'under_review')
GROUP BY d.id, d.company_id, d.control_number, d.title, d.status, d.version;

COMMENT ON VIEW document_approval_status IS 'Current approval status for documents under review';

-- Unacknowledged distributions
CREATE VIEW unacknowledged_distributions AS
SELECT 
    dd.*,
    d.control_number,
    d.title,
    up.user_id,
    (CURRENT_DATE - dd.distributed_at::date) AS days_since_distribution
FROM document_distributions dd
JOIN documents d ON d.id = dd.document_id
JOIN user_profiles up ON up.id = dd.distributed_to
WHERE dd.acknowledged = false
ORDER BY dd.distributed_at ASC;

COMMENT ON VIEW unacknowledged_distributions IS 'Documents distributed but not yet acknowledged';

-- ============================================================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE document_control_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_archive ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 14. CREATE RLS POLICIES
-- ============================================================================

-- Document Types (readable by all authenticated users)
CREATE POLICY "document_types_select" ON document_types
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "document_types_admin" ON document_types
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Document Control Sequences (company-scoped)
CREATE POLICY "doc_seq_company" ON document_control_sequences
    FOR ALL TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Documents Policies
CREATE POLICY "documents_select" ON documents
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id() OR is_super_admin()
    );

CREATE POLICY "documents_insert" ON documents
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    );

CREATE POLICY "documents_update" ON documents
    FOR UPDATE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    );

-- Workers can only view active/approved documents
CREATE POLICY "documents_worker_view" ON documents
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id()
        AND get_user_role() = 'worker'
        AND status IN ('active', 'approved')
    );

-- No delete policy - documents must be archived, not deleted

-- Document Revisions
CREATE POLICY "revisions_select" ON document_revisions
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "revisions_insert" ON document_revisions
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Document Approvals
CREATE POLICY "approvals_select" ON document_approvals
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "approvals_manage" ON document_approvals
    FOR ALL TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

-- Document Reviews
CREATE POLICY "reviews_select" ON document_reviews
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "reviews_manage" ON document_reviews
    FOR ALL TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    );

-- Document Distributions
CREATE POLICY "distributions_select" ON document_distributions
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id()
        OR distributed_to = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
        OR is_super_admin()
    );

CREATE POLICY "distributions_manage" ON document_distributions
    FOR ALL TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor'))
        OR is_super_admin()
    );

-- Users can acknowledge their own distributions
CREATE POLICY "distributions_acknowledge" ON document_distributions
    FOR UPDATE TO authenticated
    USING (
        distributed_to = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        distributed_to = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    );

-- Document Archive (read-only except for admins)
CREATE POLICY "archive_select" ON document_archive
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "archive_insert" ON document_archive
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );

-- ============================================================================
-- 15. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on types
GRANT USAGE ON TYPE document_status TO authenticated;
GRANT USAGE ON TYPE document_change_type TO authenticated;
GRANT USAGE ON TYPE archive_reason TO authenticated;
GRANT USAGE ON TYPE approval_status TO authenticated;
GRANT USAGE ON TYPE review_status TO authenticated;
GRANT USAGE ON TYPE review_outcome TO authenticated;
GRANT USAGE ON TYPE distribution_method TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION generate_control_number(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_version(TEXT, document_change_type) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_document(UUID, archive_reason, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_document_reviews(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents(UUID, TEXT, document_status[], TEXT[], INTEGER[], INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_revision_number(UUID) TO authenticated;

-- Grant table permissions
GRANT SELECT ON document_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_control_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON documents TO authenticated;
GRANT SELECT, INSERT ON document_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_distributions TO authenticated;
GRANT SELECT, INSERT ON document_archive TO authenticated;

-- Grant view access
GRANT SELECT ON active_documents TO authenticated;
GRANT SELECT ON documents_needing_review TO authenticated;
GRANT SELECT ON document_approval_status TO authenticated;
GRANT SELECT ON unacknowledged_distributions TO authenticated;

-- ============================================================================
-- 16. SEED DEFAULT DOCUMENT TYPES
-- ============================================================================

INSERT INTO document_types (code, name, description, requires_approval, approval_roles, review_frequency_months, prefix_format, is_active, sort_order) VALUES
('POL', 'Policy', 'Company-wide policies and statements', true, ARRAY['management', 'safety_manager'], 36, '{company}-POL-{sequence}', true, 1),
('SWP', 'Safe Work Procedure', 'Step-by-step safety procedures for specific tasks', true, ARRAY['safety_manager'], 12, '{company}-SWP-{sequence}', true, 2),
('SJP', 'Safe Job Procedure', 'Job-specific safety procedures', true, ARRAY['safety_manager', 'supervisor'], 12, '{company}-SJP-{sequence}', true, 3),
('FRM', 'Form', 'Templates and forms for data collection', false, ARRAY['safety_manager'], 12, '{company}-FRM-{sequence}', true, 4),
('CHK', 'Checklist', 'Inspection and verification checklists', false, ARRAY['safety_manager'], 12, '{company}-CHK-{sequence}', true, 5),
('WI', 'Work Instruction', 'Detailed work instructions for tasks', true, ARRAY['supervisor', 'safety_manager'], 12, '{company}-WI-{sequence}', true, 6),
('PRC', 'Process', 'Business process documentation', true, ARRAY['management'], 24, '{company}-PRC-{sequence}', true, 7),
('MAN', 'Manual', 'Comprehensive manuals and handbooks', true, ARRAY['management', 'safety_manager'], 24, '{company}-MAN-{sequence}', true, 8),
('PLN', 'Plan', 'Emergency, safety, and project plans', true, ARRAY['safety_manager', 'management'], 12, '{company}-PLN-{sequence}', true, 9),
('REG', 'Register', 'Registers and logs', false, NULL, 12, '{company}-REG-{sequence}', true, 10),
('TRN', 'Training Material', 'Training documents and materials', true, ARRAY['safety_manager'], 12, '{company}-TRN-{sequence}', true, 11),
('RPT', 'Report', 'Reports and summaries', false, NULL, NULL, '{company}-RPT-{sequence}', true, 12),
('MIN', 'Minutes', 'Meeting minutes and records', false, NULL, NULL, '{company}-MIN-{sequence}', true, 13),
('CRT', 'Certificate', 'Certifications and licenses', false, NULL, NULL, '{company}-CRT-{sequence}', true, 14),
('DWG', 'Drawing', 'Technical drawings and diagrams', true, ARRAY['engineer', 'supervisor'], 24, '{company}-DWG-{sequence}', true, 15),
('AUD', 'Audit Document', 'Audit reports and findings', true, ARRAY['internal_auditor', 'management'], 12, '{company}-AUD-{sequence}', true, 16)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- END OF DOCUMENT CONTROL SYSTEM MIGRATION
-- ============================================================================
