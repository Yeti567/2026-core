-- ============================================================================
-- DOCUMENT FOLDERS & METADATA ENHANCEMENTS
-- ============================================================================
-- Enhanced document organization with:
-- - Improved folder structure with folder_code and theming
-- - Additional document metadata (keywords, acknowledgments, audit trail)
-- - Worker acknowledgment tracking
-- - Advanced full-text search
-- - Control number extraction and linking
-- - Performance indexes
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE DOCUMENT_FOLDERS TABLE
-- ============================================================================

-- Add missing columns to document_folders if they don't exist
DO $$ 
BEGIN
    -- folder_code for quick reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_folders' AND column_name = 'folder_code') THEN
        ALTER TABLE document_folders ADD COLUMN folder_code TEXT;
    END IF;
    
    -- default_document_type for auto-suggestion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_folders' AND column_name = 'default_document_type') THEN
        ALTER TABLE document_folders ADD COLUMN default_document_type TEXT REFERENCES document_types(code);
    END IF;
    
    -- is_active flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_folders' AND column_name = 'is_active') THEN
        ALTER TABLE document_folders ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Add unique constraint on folder_code per company
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_folder_code_per_company'
    ) THEN
        ALTER TABLE document_folders ADD CONSTRAINT unique_folder_code_per_company 
        UNIQUE (company_id, folder_code);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if constraint already exists or conflicts
END $$;

COMMENT ON COLUMN document_folders.folder_code IS 'Short code for the folder: POL, SWP, MAN, etc.';
COMMENT ON COLUMN document_folders.default_document_type IS 'Default document type to suggest when uploading to this folder';

-- ============================================================================
-- 2. ENHANCE DOCUMENTS TABLE
-- ============================================================================

-- Add additional metadata columns
DO $$ 
BEGIN
    -- Keywords for enhanced search
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'keywords') THEN
        ALTER TABLE documents ADD COLUMN keywords TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    
    -- Applicable roles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'applicable_to_roles') THEN
        ALTER TABLE documents ADD COLUMN applicable_to_roles TEXT[] DEFAULT ARRAY['all_workers']::TEXT[];
    END IF;
    
    -- Critical document flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_critical') THEN
        ALTER TABLE documents ADD COLUMN is_critical BOOLEAN DEFAULT false;
    END IF;
    
    -- Worker acknowledgment requirement
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'worker_must_acknowledge') THEN
        ALTER TABLE documents ADD COLUMN worker_must_acknowledge BOOLEAN DEFAULT false;
    END IF;
    
    -- Acknowledgment deadline
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'acknowledgment_deadline_days') THEN
        ALTER TABLE documents ADD COLUMN acknowledgment_deadline_days INTEGER;
    END IF;
    
    -- Search ranking boost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'search_rank') THEN
        ALTER TABLE documents ADD COLUMN search_rank INTEGER DEFAULT 0;
    END IF;
    
    -- View tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'view_count') THEN
        ALTER TABLE documents ADD COLUMN view_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_viewed_at') THEN
        ALTER TABLE documents ADD COLUMN last_viewed_at TIMESTAMPTZ;
    END IF;
    
    -- Related documents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'related_document_ids') THEN
        ALTER TABLE documents ADD COLUMN related_document_ids UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
    
    -- Supersession tracking (legacy control numbers)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'supersedes_control_number') THEN
        ALTER TABLE documents ADD COLUMN supersedes_control_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'superseded_by_control_number') THEN
        ALTER TABLE documents ADD COLUMN superseded_by_control_number TEXT;
    END IF;
    
    -- Audit trail
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'audit_trail') THEN
        ALTER TABLE documents ADD COLUMN audit_trail JSONB DEFAULT '[]'::JSONB;
    END IF;
END $$;

COMMENT ON COLUMN documents.keywords IS 'Searchable keywords: ["safety", "heights", "training"]';
COMMENT ON COLUMN documents.applicable_to_roles IS 'Target audience: ["all_workers", "supervisors", "management"]';
COMMENT ON COLUMN documents.is_critical IS 'Critical documents like H&S Manual, main policies';
COMMENT ON COLUMN documents.worker_must_acknowledge IS 'Requires worker signature/acknowledgment';
COMMENT ON COLUMN documents.search_rank IS 'Higher values boost document in search results';
COMMENT ON COLUMN documents.related_document_ids IS 'Links to related documents (auto-detected from content)';
COMMENT ON COLUMN documents.audit_trail IS 'Track all changes: [{"action": "uploaded", "by": "...", "at": "..."}]';

-- ============================================================================
-- 3. CREATE DOCUMENT ACKNOWLEDGMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Deadline
    required_by_date DATE,
    
    -- Acknowledgment details
    acknowledged_at TIMESTAMPTZ,
    acknowledgment_method TEXT DEFAULT 'checkbox', -- 'digital_signature', 'checkbox', 'training_session'
    signature_data TEXT, -- Base64 signature if digital_signature method
    notes TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'overdue', 'exempt')),
    
    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one acknowledgment per worker per document
    UNIQUE(document_id, worker_id)
);

COMMENT ON TABLE document_acknowledgments IS 'Tracks worker acknowledgments of critical documents';
COMMENT ON COLUMN document_acknowledgments.acknowledgment_method IS 'How the worker acknowledged: digital_signature, checkbox, training_session';
COMMENT ON COLUMN document_acknowledgments.signature_data IS 'Base64 encoded signature image for digital signatures';

-- ============================================================================
-- 4. UPDATE SYSTEM FOLDERS WITH FOLDER CODES
-- ============================================================================

-- Update existing system folders with folder_code and default_document_type
UPDATE document_folders SET 
    folder_code = 'POL',
    default_document_type = 'POL'
WHERE slug = 'policies' AND is_system_folder = true AND folder_code IS NULL;

UPDATE document_folders SET 
    folder_code = 'PRC',
    default_document_type = 'PRC'
WHERE slug = 'procedures' AND is_system_folder = true AND folder_code IS NULL;

UPDATE document_folders SET 
    folder_code = 'SWP',
    default_document_type = 'SWP'
WHERE slug = 'safe-work-procedures' AND is_system_folder = true AND folder_code IS NULL;

UPDATE document_folders SET 
    folder_code = 'FRM',
    default_document_type = 'FRM'
WHERE slug = 'forms-templates' AND is_system_folder = true AND folder_code IS NULL;

UPDATE document_folders SET 
    folder_code = 'TRN',
    default_document_type = 'TRN'
WHERE slug = 'training-materials' AND is_system_folder = true AND folder_code IS NULL;

UPDATE document_folders SET 
    folder_code = 'MAN',
    default_document_type = 'MAN'
WHERE slug = 'health-safety-manual' AND is_system_folder = true AND folder_code IS NULL;

UPDATE document_folders SET 
    folder_code = 'EMR',
    default_document_type = 'PLN'
WHERE slug = 'emergency-procedures' AND is_system_folder = true AND folder_code IS NULL;

-- ============================================================================
-- 5. INSERT ADDITIONAL SYSTEM FOLDERS
-- ============================================================================

-- Function to add system folders to a company (enhanced)
CREATE OR REPLACE FUNCTION initialize_company_document_folders_v2(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert/update system folders
    INSERT INTO document_folders (company_id, name, slug, folder_code, description, icon, color, is_system_folder, folder_type, linked_document_types, default_document_type, sort_order, accessible_to)
    VALUES 
        (p_company_id, 'Policies', 'policies', 'POL', 'Company-wide policies and statements', 'scroll', '#3b82f6', true, 'policies', ARRAY['POL'], 'POL', 1, ARRAY['all_workers']),
        (p_company_id, 'Procedures', 'procedures', 'PRC', 'Business and operational procedures', 'clipboard-list', '#8b5cf6', true, 'procedures', ARRAY['PRC'], 'PRC', 2, ARRAY['all_workers']),
        (p_company_id, 'Safe Work Procedures', 'safe-work-procedures', 'SWP', 'Step-by-step safety procedures for specific tasks', 'shield-check', '#10b981', true, 'swp', ARRAY['SWP', 'SJP', 'WI'], 'SWP', 3, ARRAY['all_workers']),
        (p_company_id, 'Forms & Templates', 'forms-templates', 'FRM', 'Blank forms and templates', 'file-text', '#f59e0b', true, 'forms', ARRAY['FRM', 'CHK'], 'FRM', 4, ARRAY['all_workers']),
        (p_company_id, 'Training Materials', 'training-materials', 'TRN', 'Training presentations and guides', 'graduation-cap', '#06b6d4', true, 'training', ARRAY['TRN'], 'TRN', 5, ARRAY['all_workers']),
        (p_company_id, 'Health & Safety Manual', 'health-safety-manual', 'MAN', 'Complete H&S program documentation', 'book-open', '#ef4444', true, 'manual', ARRAY['MAN'], 'MAN', 6, ARRAY['all_workers']),
        (p_company_id, 'Emergency Procedures', 'emergency-procedures', 'EMR', 'Emergency response plans and procedures', 'alert-triangle', '#dc2626', true, 'emergency', ARRAY['PLN'], 'PLN', 7, ARRAY['all_workers']),
        (p_company_id, 'Meeting Minutes', 'meeting-minutes', 'MIN', 'Safety committee and management meeting minutes', 'users', '#6366f1', true, 'general', ARRAY['MIN'], 'MIN', 8, ARRAY['supervisors', 'management']),
        (p_company_id, 'Reports', 'reports', 'RPT', 'Inspection reports, audit reports, statistics', 'bar-chart', '#14b8a6', true, 'general', ARRAY['RPT', 'AUD'], 'RPT', 9, ARRAY['supervisors', 'management']),
        (p_company_id, 'Certifications', 'certifications', 'CRT', 'Company and equipment certifications', 'award', '#f97316', true, 'general', ARRAY['CRT'], 'CRT', 10, ARRAY['all_workers']),
        (p_company_id, 'Other Documents', 'other-documents', 'OTH', 'Miscellaneous documents', 'folder', '#64748b', true, 'general', ARRAY[]::TEXT[], NULL, 99, ARRAY['all_workers'])
    ON CONFLICT (company_id, parent_folder_id, slug) DO UPDATE SET
        folder_code = EXCLUDED.folder_code,
        default_document_type = EXCLUDED.default_document_type,
        description = EXCLUDED.description;
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_company_document_folders_v2(UUID) TO authenticated;

-- ============================================================================
-- 6. ENHANCED SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION search_documents_advanced(
    p_company_id UUID,
    p_search_query TEXT DEFAULT NULL,
    p_folder_id UUID DEFAULT NULL,
    p_document_type TEXT DEFAULT NULL,
    p_cor_elements INTEGER[] DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_keywords TEXT[] DEFAULT NULL,
    p_roles TEXT[] DEFAULT NULL,
    p_critical_only BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    control_number TEXT,
    title TEXT,
    description TEXT,
    folder_id UUID,
    folder_name TEXT,
    folder_code TEXT,
    folder_icon TEXT,
    folder_color TEXT,
    document_type TEXT,
    document_type_name TEXT,
    version TEXT,
    status TEXT,
    is_critical BOOLEAN,
    worker_must_acknowledge BOOLEAN,
    relevance FLOAT,
    snippet TEXT,
    view_count INTEGER,
    cor_elements INTEGER[],
    tags TEXT[],
    keywords TEXT[],
    effective_date DATE,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_query tsquery;
BEGIN
    -- Build search query
    IF p_search_query IS NOT NULL AND p_search_query != '' THEN
        v_query := websearch_to_tsquery('english', p_search_query);
    END IF;
    
    RETURN QUERY
    SELECT 
        d.id,
        d.control_number,
        d.title,
        d.description,
        d.folder_id,
        f.name AS folder_name,
        f.folder_code,
        f.icon AS folder_icon,
        f.color AS folder_color,
        d.document_type_code AS document_type,
        dt.name AS document_type_name,
        d.version,
        d.status::TEXT,
        d.is_critical,
        d.worker_must_acknowledge,
        CASE 
            WHEN v_query IS NOT NULL THEN
                ts_rank(d.search_vector, v_query) + (d.search_rank::FLOAT / 100)
            ELSE d.search_rank::FLOAT / 100
        END AS relevance,
        CASE 
            WHEN v_query IS NOT NULL AND d.extracted_text IS NOT NULL THEN
                ts_headline('english', d.extracted_text, v_query, 'MaxWords=30, MinWords=15, MaxFragments=1')
            ELSE LEFT(d.description, 200)
        END AS snippet,
        d.view_count,
        d.cor_elements,
        d.tags,
        d.keywords,
        d.effective_date,
        d.updated_at
    FROM documents d
    LEFT JOIN document_folders f ON f.id = d.folder_id
    LEFT JOIN document_types dt ON dt.code = d.document_type_code
    WHERE d.company_id = p_company_id
      AND d.status IN ('active', 'approved')
      AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
      AND (p_document_type IS NULL OR d.document_type_code = p_document_type)
      AND (p_cor_elements IS NULL OR d.cor_elements && p_cor_elements)
      AND (p_tags IS NULL OR d.tags && p_tags)
      AND (p_keywords IS NULL OR d.keywords && p_keywords)
      AND (p_roles IS NULL OR d.applicable_to_roles && p_roles OR 'all_workers' = ANY(d.applicable_to_roles))
      AND (NOT p_critical_only OR d.is_critical = true)
      AND (
          v_query IS NULL 
          OR d.search_vector @@ v_query
          OR d.control_number ILIKE '%' || p_search_query || '%'
          OR d.title ILIKE '%' || p_search_query || '%'
      )
    ORDER BY 
        relevance DESC NULLS LAST,
        d.is_critical DESC,
        d.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_documents_advanced IS 'Advanced document search with folder, type, COR element, tag, keyword, and role filtering';

-- ============================================================================
-- 7. FIND DOCUMENT BY CONTROL NUMBER
-- ============================================================================

CREATE OR REPLACE FUNCTION find_document_by_control_number(
    p_company_id UUID,
    p_control_number TEXT
)
RETURNS TABLE (
    id UUID,
    control_number TEXT,
    title TEXT,
    description TEXT,
    file_path TEXT,
    file_name TEXT,
    version TEXT,
    status TEXT,
    folder_id UUID,
    folder_name TEXT,
    folder_code TEXT,
    cor_elements INTEGER[],
    tags TEXT[],
    is_critical BOOLEAN,
    effective_date DATE
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
        d.description,
        d.file_path,
        d.file_name,
        d.version,
        d.status::TEXT,
        d.folder_id,
        f.name AS folder_name,
        f.folder_code,
        d.cor_elements,
        d.tags,
        d.is_critical,
        d.effective_date
    FROM documents d
    LEFT JOIN document_folders f ON f.id = d.folder_id
    WHERE d.company_id = p_company_id
      AND UPPER(TRIM(d.control_number)) = UPPER(TRIM(p_control_number))
      AND d.status IN ('active', 'approved')
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION find_document_by_control_number IS 'Find active document by control number (case-insensitive)';

-- ============================================================================
-- 8. EXTRACT CONTROL NUMBERS FROM DOCUMENT CONTENT
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_control_numbers_from_text(
    p_text TEXT,
    p_company_initials TEXT DEFAULT NULL
)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_pattern TEXT;
    v_matches TEXT[];
    v_match TEXT;
BEGIN
    -- Build regex pattern: company initials (if provided) or any 2-6 letter prefix
    IF p_company_initials IS NOT NULL THEN
        v_pattern := p_company_initials || E'-[A-Z]{2,4}-\\d{3,4}';
    ELSE
        v_pattern := E'[A-Z]{2,6}-[A-Z]{2,4}-\\d{3,4}';
    END IF;
    
    -- Find all matches
    SELECT ARRAY_AGG(DISTINCT UPPER(m[1]))
    INTO v_matches
    FROM regexp_matches(UPPER(p_text), v_pattern, 'g') AS m;
    
    RETURN COALESCE(v_matches, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION extract_control_numbers_from_text IS 'Extracts control numbers (e.g., NCCI-POL-001) from text content';

-- ============================================================================
-- 9. AUTO-LINK RELATED DOCUMENTS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_link_related_documents(p_document_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_document RECORD;
    v_control_numbers TEXT[];
    v_related_ids UUID[];
    v_linked_count INTEGER;
BEGIN
    -- Get document details
    SELECT d.id, d.company_id, d.control_number, d.extracted_text, c.name
    INTO v_document
    FROM documents d
    JOIN companies c ON c.id = d.company_id
    WHERE d.id = p_document_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Skip if no extracted text
    IF v_document.extracted_text IS NULL OR v_document.extracted_text = '' THEN
        RETURN 0;
    END IF;
    
    -- Get company initials
    DECLARE
        v_initials TEXT;
    BEGIN
        SELECT UPPER(
            SUBSTRING(
                string_agg(SUBSTRING(word, 1, 1), '')
                FROM regexp_split_to_table(v_document.name, '\s+') AS word
            ), 1, 4
        ) INTO v_initials;
        
        -- Extract control numbers from document content
        v_control_numbers := extract_control_numbers_from_text(v_document.extracted_text, v_initials);
        
        -- Remove the document's own control number
        v_control_numbers := array_remove(v_control_numbers, UPPER(v_document.control_number));
    END;
    
    -- Find related document IDs
    SELECT ARRAY_AGG(id)
    INTO v_related_ids
    FROM documents
    WHERE company_id = v_document.company_id
      AND UPPER(control_number) = ANY(v_control_numbers)
      AND id != p_document_id
      AND status IN ('active', 'approved', 'draft');
    
    -- Update the document with related IDs
    UPDATE documents
    SET related_document_ids = COALESCE(v_related_ids, ARRAY[]::UUID[])
    WHERE id = p_document_id;
    
    v_linked_count := COALESCE(array_length(v_related_ids, 1), 0);
    
    -- Also update audit trail
    UPDATE documents
    SET audit_trail = audit_trail || jsonb_build_object(
        'action', 'auto_linked_documents',
        'linked_count', v_linked_count,
        'at', NOW()
    )
    WHERE id = p_document_id;
    
    RETURN v_linked_count;
END;
$$;

COMMENT ON FUNCTION auto_link_related_documents IS 'Automatically finds and links related documents based on control number references in content';

-- ============================================================================
-- 10. TRIGGER FOR AUTO-LINKING ON DOCUMENT UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_auto_link_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only run if extracted_text changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.extracted_text IS DISTINCT FROM OLD.extracted_text) THEN
        IF NEW.extracted_text IS NOT NULL AND NEW.extracted_text != '' THEN
            PERFORM auto_link_related_documents(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS tr_auto_link_documents ON documents;
CREATE TRIGGER tr_auto_link_documents
    AFTER INSERT OR UPDATE OF extracted_text
    ON documents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_link_documents();

-- ============================================================================
-- 11. AUDIT TRAIL TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_document_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_action TEXT;
    v_changes JSONB;
    v_user_id UUID;
BEGIN
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine what changed
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
        ELSIF OLD.version IS DISTINCT FROM NEW.version THEN
            v_action := 'version_updated';
        ELSIF OLD.file_path IS DISTINCT FROM NEW.file_path THEN
            v_action := 'file_updated';
        ELSE
            v_action := 'updated';
        END IF;
    END IF;
    
    -- Get user ID from session (fallback to created_by)
    v_user_id := COALESCE(
        auth.uid(),
        CASE WHEN TG_OP = 'INSERT' THEN NEW.created_by ELSE OLD.created_by END
    );
    
    -- Build changes object
    v_changes := jsonb_build_object(
        'action', v_action,
        'by', v_user_id,
        'at', NOW()
    );
    
    -- Add specific changes for updates
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status);
        END IF;
        IF OLD.version IS DISTINCT FROM NEW.version THEN
            v_changes := v_changes || jsonb_build_object('from_version', OLD.version, 'to_version', NEW.version);
        END IF;
    END IF;
    
    -- Append to audit trail
    NEW.audit_trail := COALESCE(NEW.audit_trail, '[]'::JSONB) || v_changes;
    
    RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS tr_document_audit_trail ON documents;
CREATE TRIGGER tr_document_audit_trail
    BEFORE INSERT OR UPDATE
    ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_audit_trail();

-- ============================================================================
-- 12. WORKER DOCUMENT PORTAL VIEW
-- ============================================================================

DROP VIEW IF EXISTS worker_document_portal;
CREATE VIEW worker_document_portal AS
SELECT 
    d.id,
    d.company_id,
    d.control_number,
    d.title,
    d.description,
    d.document_type_code,
    dt.name AS document_type_name,
    d.version,
    d.file_path,
    d.file_name,
    d.effective_date,
    d.cor_elements,
    d.tags,
    d.keywords,
    d.is_critical,
    d.worker_must_acknowledge,
    d.applicable_to_roles,
    d.folder_id,
    f.name AS folder_name,
    f.folder_code,
    f.icon AS folder_icon,
    f.color AS folder_color,
    f.sort_order AS folder_sort_order,
    d.view_count,
    d.updated_at
FROM documents d
LEFT JOIN document_folders f ON f.id = d.folder_id
LEFT JOIN document_types dt ON dt.code = d.document_type_code
WHERE d.status = 'active';

COMMENT ON VIEW worker_document_portal IS 'View for worker document portal - shows active documents with folder info';

-- ============================================================================
-- 13. WORKER ACKNOWLEDGMENT STATUS VIEW
-- ============================================================================

DROP VIEW IF EXISTS worker_acknowledgment_status;
CREATE VIEW worker_acknowledgment_status AS
SELECT 
    d.id AS document_id,
    d.company_id,
    d.control_number,
    d.title,
    d.is_critical,
    da.worker_id,
    da.required_by_date,
    da.acknowledged_at,
    da.status AS acknowledgment_status,
    CASE 
        WHEN da.acknowledged_at IS NOT NULL THEN 'acknowledged'
        WHEN da.required_by_date IS NOT NULL AND da.required_by_date < CURRENT_DATE THEN 'overdue'
        WHEN da.status = 'pending' THEN 'pending'
        ELSE 'not_required'
    END AS computed_status,
    CASE 
        WHEN da.required_by_date IS NOT NULL THEN 
            da.required_by_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_due
FROM documents d
LEFT JOIN document_acknowledgments da ON da.document_id = d.id
WHERE d.worker_must_acknowledge = true
  AND d.status = 'active';

COMMENT ON VIEW worker_acknowledgment_status IS 'View showing worker acknowledgment status for required documents';

-- ============================================================================
-- 14. INCREMENT VIEW COUNT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_document_view_count(p_document_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE documents
    SET view_count = COALESCE(view_count, 0) + 1,
        last_viewed_at = NOW()
    WHERE id = p_document_id;
END;
$$;

COMMENT ON FUNCTION increment_document_view_count IS 'Increments view count when document is opened';

-- ============================================================================
-- 15. PERFORMANCE INDEXES
-- ============================================================================

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_folder_status ON documents(company_id, folder_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_control_upper ON documents(company_id, UPPER(control_number));
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_documents_applicable_roles ON documents USING gin(applicable_to_roles);
CREATE INDEX IF NOT EXISTS idx_documents_is_critical ON documents(company_id, is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_documents_must_acknowledge ON documents(company_id, worker_must_acknowledge) WHERE worker_must_acknowledge = true;
CREATE INDEX IF NOT EXISTS idx_documents_related ON documents USING gin(related_document_ids);
CREATE INDEX IF NOT EXISTS idx_documents_fulltext_enhanced ON documents USING gin(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(extracted_text, '') || ' ' ||
        COALESCE(array_to_string(keywords, ' '), '') || ' ' ||
        COALESCE(array_to_string(tags, ' '), '')
    )
);

-- Acknowledgment indexes
CREATE INDEX IF NOT EXISTS idx_acknowledgments_worker_status ON document_acknowledgments(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_acknowledgments_document ON document_acknowledgments(document_id, status);
CREATE INDEX IF NOT EXISTS idx_acknowledgments_overdue ON document_acknowledgments(required_by_date, status) 
    WHERE status = 'pending' AND required_by_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acknowledgments_company ON document_acknowledgments(company_id);

-- Folder indexes
CREATE INDEX IF NOT EXISTS idx_folders_company_code ON document_folders(company_id, folder_code);
CREATE INDEX IF NOT EXISTS idx_folders_active ON document_folders(company_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 16. RLS POLICIES FOR NEW TABLE
-- ============================================================================

ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Workers can see their own acknowledgments
CREATE POLICY "acknowledgments_own" ON document_acknowledgments
    FOR SELECT TO authenticated
    USING (
        worker_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    );

-- Workers can update their own acknowledgments (to acknowledge)
CREATE POLICY "acknowledgments_update_own" ON document_acknowledgments
    FOR UPDATE TO authenticated
    USING (
        worker_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        worker_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    );

-- Admins can manage all acknowledgments in their company
CREATE POLICY "acknowledgments_admin" ON document_acknowledgments
    FOR ALL TO authenticated
    USING (
        company_id = get_user_company_id() 
        AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor')
    )
    WITH CHECK (
        company_id = get_user_company_id() 
        AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor')
    );

-- Super admin access
CREATE POLICY "acknowledgments_super_admin" ON document_acknowledgments
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- ============================================================================
-- 17. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON document_acknowledgments TO authenticated;
GRANT SELECT ON worker_document_portal TO authenticated;
GRANT SELECT ON worker_acknowledgment_status TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents_advanced TO authenticated;
GRANT EXECUTE ON FUNCTION find_document_by_control_number TO authenticated;
GRANT EXECUTE ON FUNCTION extract_control_numbers_from_text TO authenticated;
GRANT EXECUTE ON FUNCTION auto_link_related_documents TO authenticated;
GRANT EXECUTE ON FUNCTION increment_document_view_count TO authenticated;

-- ============================================================================
-- END OF ENHANCED DOCUMENT FOLDERS & METADATA MIGRATION
-- ============================================================================
