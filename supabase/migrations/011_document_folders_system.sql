-- ============================================================================
-- DOCUMENT FOLDERS SYSTEM
-- ============================================================================
-- Hierarchical folder structure for document organization
-- - Virtual folders (don't affect storage, only organization)
-- - Predefined system folders: Policies, Procedures, SWPs, etc.
-- - Custom user-created folders
-- - Folder permissions and sharing
-- ============================================================================

-- ============================================================================
-- 1. CREATE DOCUMENT FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Folder Information
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#6366f1',
    
    -- Hierarchy
    parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL DEFAULT '/',  -- Full path like /Policies/Health-Safety/
    depth INTEGER NOT NULL DEFAULT 0,
    
    -- Classification
    is_system_folder BOOLEAN NOT NULL DEFAULT false,  -- System folders can't be deleted
    folder_type TEXT DEFAULT 'general',  -- general, policies, procedures, swp, forms, training, manual, emergency
    
    -- Linked document types (if folder should auto-categorize by type)
    linked_document_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Linked COR elements (for audit integration)
    linked_cor_elements INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    
    -- Access control
    accessible_to TEXT[] DEFAULT ARRAY['all_workers']::TEXT[],  -- Roles that can view
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique folder names per parent
    UNIQUE(company_id, parent_folder_id, slug),
    
    -- Ensure unique paths
    UNIQUE(company_id, path)
);

COMMENT ON TABLE document_folders IS 'Virtual folder structure for document organization';
COMMENT ON COLUMN document_folders.path IS 'Full hierarchical path: /Policies/Health-Safety/';
COMMENT ON COLUMN document_folders.linked_document_types IS 'Auto-categorize documents of these types into this folder';

-- ============================================================================
-- 2. LINK DOCUMENTS TO FOLDERS
-- ============================================================================

-- Add folder_id to documents table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'folder_id') THEN
        ALTER TABLE documents ADD COLUMN folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'folder_path') THEN
        ALTER TABLE documents ADD COLUMN folder_path TEXT DEFAULT '/';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_path ON documents(folder_path);

-- ============================================================================
-- 3. DOCUMENT FOLDER INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_folders_company ON document_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON document_folders(path);
CREATE INDEX IF NOT EXISTS idx_folders_type ON document_folders(folder_type);
CREATE INDEX IF NOT EXISTS idx_folders_system ON document_folders(is_system_folder);
CREATE INDEX IF NOT EXISTS idx_folders_cor ON document_folders USING gin(linked_cor_elements);

-- ============================================================================
-- 4. FOLDER HELPER FUNCTIONS
-- ============================================================================

-- Generate slug from name
CREATE OR REPLACE FUNCTION generate_folder_slug(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REPLACE(REPLACE(REPLACE(p_name, '&', 'and'), '''', ''), '"', ''),
                '[^a-zA-Z0-9\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
        )
    );
END;
$$;

-- Update folder path trigger
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_parent_path TEXT;
BEGIN
    IF NEW.parent_folder_id IS NULL THEN
        NEW.path := '/' || NEW.slug || '/';
        NEW.depth := 0;
    ELSE
        SELECT path, depth INTO v_parent_path
        FROM document_folders
        WHERE id = NEW.parent_folder_id;
        
        NEW.path := v_parent_path || NEW.slug || '/';
        NEW.depth := (SELECT depth + 1 FROM document_folders WHERE id = NEW.parent_folder_id);
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_folder_path ON document_folders;
CREATE TRIGGER tr_folder_path
    BEFORE INSERT OR UPDATE OF parent_folder_id, slug
    ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_path();

-- Get folder by path
CREATE OR REPLACE FUNCTION get_folder_by_path(
    p_company_id UUID,
    p_path TEXT
)
RETURNS document_folders
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_folder document_folders;
BEGIN
    SELECT * INTO v_folder
    FROM document_folders
    WHERE company_id = p_company_id
      AND path = p_path;
    
    RETURN v_folder;
END;
$$;

-- Get folder tree (recursive)
CREATE OR REPLACE FUNCTION get_folder_tree(
    p_company_id UUID,
    p_parent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    icon TEXT,
    color TEXT,
    path TEXT,
    depth INTEGER,
    is_system_folder BOOLEAN,
    folder_type TEXT,
    document_count BIGINT,
    parent_folder_id UUID,
    sort_order INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        SELECT 
            f.id, f.name, f.slug, f.description, f.icon, f.color,
            f.path, f.depth, f.is_system_folder, f.folder_type,
            f.parent_folder_id, f.sort_order
        FROM document_folders f
        WHERE f.company_id = p_company_id
          AND (
              (p_parent_id IS NULL AND f.parent_folder_id IS NULL) OR
              f.parent_folder_id = p_parent_id
          )
        
        UNION ALL
        
        SELECT 
            f.id, f.name, f.slug, f.description, f.icon, f.color,
            f.path, f.depth, f.is_system_folder, f.folder_type,
            f.parent_folder_id, f.sort_order
        FROM document_folders f
        INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
        WHERE f.company_id = p_company_id
    )
    SELECT 
        ft.id, ft.name, ft.slug, ft.description, ft.icon, ft.color,
        ft.path, ft.depth, ft.is_system_folder, ft.folder_type,
        COUNT(d.id) AS document_count,
        ft.parent_folder_id, ft.sort_order
    FROM folder_tree ft
    LEFT JOIN documents d ON d.folder_id = ft.id AND d.status NOT IN ('archived', 'obsolete')
    GROUP BY ft.id, ft.name, ft.slug, ft.description, ft.icon, ft.color,
             ft.path, ft.depth, ft.is_system_folder, ft.folder_type,
             ft.parent_folder_id, ft.sort_order
    ORDER BY ft.depth, ft.sort_order, ft.name;
END;
$$;

-- Auto-assign folder based on document type
CREATE OR REPLACE FUNCTION auto_assign_document_folder()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_folder_id UUID;
    v_folder_path TEXT;
BEGIN
    -- Only auto-assign if no folder specified
    IF NEW.folder_id IS NULL THEN
        -- Find folder that links to this document type
        SELECT id, path INTO v_folder_id, v_folder_path
        FROM document_folders
        WHERE company_id = NEW.company_id
          AND NEW.document_type_code = ANY(linked_document_types)
          AND is_visible = true
        ORDER BY is_system_folder DESC, sort_order
        LIMIT 1;
        
        IF v_folder_id IS NOT NULL THEN
            NEW.folder_id := v_folder_id;
            NEW.folder_path := v_folder_path;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_document_auto_folder ON documents;
CREATE TRIGGER tr_document_auto_folder
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_document_folder();

-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Folder policies
DROP POLICY IF EXISTS "folders_select" ON document_folders;
CREATE POLICY "folders_select" ON document_folders
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id() 
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "folders_manage" ON document_folders;
CREATE POLICY "folders_manage" ON document_folders
    FOR ALL TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    );

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON document_folders TO authenticated;
GRANT EXECUTE ON FUNCTION generate_folder_slug(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_by_path(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_tree(UUID, UUID) TO authenticated;

-- ============================================================================
-- 7. CREATE FUNCTION TO INITIALIZE COMPANY FOLDERS
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_company_document_folders(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert system folders only if they don't exist
    INSERT INTO document_folders (company_id, name, slug, description, icon, color, is_system_folder, folder_type, linked_document_types, linked_cor_elements, sort_order, accessible_to)
    VALUES 
        -- Level 1: Main categories
        (p_company_id, 'Policies', 'policies', 'Company-wide policies and statements', 'scroll', '#6366f1', true, 'policies', ARRAY['POL'], ARRAY[1, 2], 1, ARRAY['all_workers']),
        (p_company_id, 'Procedures', 'procedures', 'Standard operating procedures', 'clipboard-list', '#8b5cf6', true, 'procedures', ARRAY['PRC'], ARRAY[3, 4], 2, ARRAY['all_workers']),
        (p_company_id, 'Safe Work Procedures', 'safe-work-procedures', 'Task-specific safety procedures', 'shield-check', '#10b981', true, 'swp', ARRAY['SWP', 'SJP', 'WI'], ARRAY[3, 4, 5], 3, ARRAY['all_workers']),
        (p_company_id, 'Forms & Templates', 'forms-templates', 'Fillable forms and document templates', 'file-text', '#f59e0b', true, 'forms', ARRAY['FRM', 'CHK'], ARRAY[5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 4, ARRAY['all_workers']),
        (p_company_id, 'Training Materials', 'training-materials', 'Training documents and resources', 'graduation-cap', '#ec4899', true, 'training', ARRAY['TRN'], ARRAY[6, 7], 5, ARRAY['all_workers']),
        (p_company_id, 'Health & Safety Manual', 'health-safety-manual', 'Complete health and safety manual sections', 'book-open', '#0ea5e9', true, 'manual', ARRAY['MAN'], ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 6, ARRAY['all_workers']),
        (p_company_id, 'Emergency Procedures', 'emergency-procedures', 'Emergency response plans and procedures', 'alert-triangle', '#ef4444', true, 'emergency', ARRAY['PLN'], ARRAY[9], 7, ARRAY['all_workers'])
    ON CONFLICT (company_id, parent_folder_id, slug) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_company_document_folders(UUID) TO authenticated;

-- ============================================================================
-- END OF DOCUMENT FOLDERS MIGRATION
-- ============================================================================
