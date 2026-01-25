-- ============================================================================
-- PDF Form Converter System Migration
-- ============================================================================
-- Provides AI-powered conversion of PDF forms to digital form templates:
-- - pdf_form_uploads: Stores uploaded PDFs and their processing status
-- - pdf_detected_fields: AI-detected fields from PDF analysis
-- - pdf_conversion_sessions: Tracks conversion workflow state
-- ============================================================================

-- ============================================================================
-- 1. PDF FORM UPLOADS TABLE
-- ============================================================================
-- Stores uploaded PDF files and their OCR/processing status

CREATE TABLE pdf_form_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- File Information
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,  -- Supabase storage path
    thumbnail_path TEXT,          -- Generated thumbnail
    
    -- Processing Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',        -- Uploaded, awaiting processing
        'processing',     -- OCR/AI analysis in progress
        'analyzed',       -- Analysis complete, fields detected
        'mapping',        -- User is mapping fields
        'converting',     -- Converting to form template
        'completed',      -- Conversion successful
        'failed',         -- Processing failed
        'cancelled'       -- User cancelled
    )),
    
    -- OCR Results
    ocr_text TEXT,                   -- Full extracted text
    ocr_confidence DECIMAL(5, 2),    -- Overall OCR confidence (0-100)
    page_count INTEGER DEFAULT 1,
    
    -- AI Analysis Results
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "form_title": "Safety Inspection Checklist",
    --   "form_description": "...",
    --   "suggested_cor_element": 9,
    --   "suggested_frequency": "weekly",
    --   "detected_sections": [...],
    --   "processing_notes": "..."
    -- }
    
    -- Error Tracking
    error_message TEXT,
    processing_attempts INTEGER DEFAULT 0,
    
    -- Timestamps
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Resulting Template (if conversion successful)
    result_template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL
);

COMMENT ON TABLE pdf_form_uploads IS 'Uploaded PDF forms for conversion to digital templates';
COMMENT ON COLUMN pdf_form_uploads.ocr_text IS 'Full text extracted via OCR';
COMMENT ON COLUMN pdf_form_uploads.ai_analysis IS 'AI analysis results including suggestions';


-- ============================================================================
-- 2. PDF DETECTED FIELDS TABLE
-- ============================================================================
-- Stores AI-detected fields from PDF analysis

CREATE TABLE pdf_detected_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdf_upload_id UUID NOT NULL REFERENCES pdf_form_uploads(id) ON DELETE CASCADE,
    
    -- Field Identification
    field_code TEXT NOT NULL,         -- Auto-generated code
    detected_label TEXT NOT NULL,     -- Label extracted from PDF
    
    -- Field Type (AI-suggested)
    suggested_type TEXT NOT NULL DEFAULT 'text' CHECK (suggested_type IN (
        'text', 'textarea', 'number', 'date', 'time', 'datetime',
        'dropdown', 'radio', 'checkbox', 'multiselect',
        'signature', 'photo', 'file', 'gps',
        'worker_select', 'jobsite_select', 'equipment_select',
        'rating', 'slider', 'yes_no', 'yes_no_na',
        'email', 'phone', 'currency', 'body_diagram',
        'weather', 'temperature', 'hidden'
    )),
    
    -- AI Confidence
    type_confidence DECIMAL(5, 2) DEFAULT 0,  -- Confidence in type detection (0-100)
    
    -- Position on PDF (for visual mapping)
    page_number INTEGER DEFAULT 1,
    bbox_x DECIMAL(10, 4),      -- Bounding box X (% of page width)
    bbox_y DECIMAL(10, 4),      -- Bounding box Y (% of page height)
    bbox_width DECIMAL(10, 4),  -- Width (% of page width)
    bbox_height DECIMAL(10, 4), -- Height (% of page height)
    
    -- Suggested Configuration
    suggested_options JSONB,     -- For dropdown/radio fields
    suggested_validation JSONB,  -- Validation rules
    suggested_help_text TEXT,
    
    -- Section Grouping
    section_label TEXT,          -- Detected section this belongs to
    section_order INTEGER DEFAULT 0,
    field_order INTEGER DEFAULT 0,
    
    -- User Override (after manual mapping)
    user_label TEXT,             -- User's corrected label
    user_type TEXT,              -- User's selected type
    user_options JSONB,          -- User's options
    user_validation JSONB,       -- User's validation rules
    
    -- Status
    is_confirmed BOOLEAN NOT NULL DEFAULT false,
    is_excluded BOOLEAN NOT NULL DEFAULT false,  -- User chose to exclude
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pdf_detected_fields IS 'AI-detected fields from PDF analysis';
COMMENT ON COLUMN pdf_detected_fields.bbox_x IS 'Field position X as percentage of page width';
COMMENT ON COLUMN pdf_detected_fields.user_label IS 'User-corrected label (overrides detected_label)';


-- ============================================================================
-- 3. PDF CONVERSION SESSIONS TABLE
-- ============================================================================
-- Tracks the conversion workflow state for each upload

CREATE TABLE pdf_conversion_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdf_upload_id UUID NOT NULL REFERENCES pdf_form_uploads(id) ON DELETE CASCADE,
    
    -- Current Step
    current_step TEXT NOT NULL DEFAULT 'upload' CHECK (current_step IN (
        'upload',        -- Step 1: PDF uploaded
        'review_ocr',    -- Step 2: Review OCR results
        'map_fields',    -- Step 3: Map and edit fields
        'cor_mapping',   -- Step 4: Map to COR elements
        'preview',       -- Step 5: Preview form
        'publish'        -- Step 6: Publish form
    )),
    
    -- Form Metadata (user-editable)
    form_name TEXT,
    form_description TEXT,
    form_code TEXT,
    
    -- COR Mapping
    cor_element INTEGER CHECK (cor_element >= 1 AND cor_element <= 14),
    cor_element_confirmed BOOLEAN DEFAULT false,
    linked_audit_questions TEXT[],  -- Array of audit question IDs
    is_cor_related BOOLEAN DEFAULT true,
    custom_category TEXT,  -- For non-COR forms
    
    -- Section Configuration
    sections_config JSONB DEFAULT '[]'::jsonb,
    -- Format: [
    --   {
    --     "id": "uuid",
    --     "title": "Section 1",
    --     "description": "...",
    --     "order": 0,
    --     "field_ids": ["uuid1", "uuid2"]
    --   }
    -- ]
    
    -- Workflow Configuration
    workflow_config JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "submit_to_role": "supervisor",
    --   "notify_roles": ["safety_manager"],
    --   "requires_approval": true,
    --   "sync_priority": 3
    -- }
    
    -- Preview State
    preview_generated_at TIMESTAMPTZ,
    preview_data JSONB,
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- User
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE pdf_conversion_sessions IS 'Tracks conversion workflow state';
COMMENT ON COLUMN pdf_conversion_sessions.current_step IS 'Current step in conversion wizard';
COMMENT ON COLUMN pdf_conversion_sessions.linked_audit_questions IS 'COR audit questions this form supports';


-- ============================================================================
-- 4. PDF FORM REFERENCE STORAGE (for original PDF attachment)
-- ============================================================================
-- Links converted forms back to their original PDF source

CREATE TABLE pdf_form_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    pdf_upload_id UUID REFERENCES pdf_form_uploads(id) ON DELETE SET NULL,
    
    -- Original PDF Info
    original_file_name TEXT NOT NULL,
    original_storage_path TEXT NOT NULL,
    
    -- Metadata
    conversion_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Notes
    conversion_notes TEXT,
    
    UNIQUE(form_template_id)  -- One reference per template
);

COMMENT ON TABLE pdf_form_references IS 'Links form templates to their original PDF source';


-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_pdf_uploads_company ON pdf_form_uploads(company_id, status);
CREATE INDEX idx_pdf_uploads_status ON pdf_form_uploads(status, uploaded_at DESC);
CREATE INDEX idx_pdf_detected_fields_upload ON pdf_detected_fields(pdf_upload_id, section_order, field_order);
CREATE INDEX idx_pdf_conversion_sessions_upload ON pdf_conversion_sessions(pdf_upload_id);
CREATE INDEX idx_pdf_conversion_sessions_step ON pdf_conversion_sessions(current_step, last_activity_at DESC);
CREATE INDEX idx_pdf_form_references_template ON pdf_form_references(form_template_id);


-- ============================================================================
-- 6. UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

CREATE TRIGGER pdf_detected_fields_updated_at
    BEFORE UPDATE ON pdf_detected_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_form_updated_at();

CREATE TRIGGER pdf_conversion_sessions_last_activity
    BEFORE UPDATE ON pdf_conversion_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_form_updated_at();


-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pdf_form_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_detected_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_conversion_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_form_references ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 8. RLS POLICIES - PDF FORM UPLOADS
-- ============================================================================

CREATE POLICY "pdf_uploads_select" ON pdf_form_uploads
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

CREATE POLICY "pdf_uploads_insert" ON pdf_form_uploads
    FOR INSERT WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

CREATE POLICY "pdf_uploads_update" ON pdf_form_uploads
    FOR UPDATE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

CREATE POLICY "pdf_uploads_delete" ON pdf_form_uploads
    FOR DELETE USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );


-- ============================================================================
-- 9. RLS POLICIES - PDF DETECTED FIELDS
-- ============================================================================

CREATE POLICY "pdf_detected_fields_select" ON pdf_detected_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "pdf_detected_fields_insert" ON pdf_detected_fields
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        )
        OR is_super_admin()
    );

CREATE POLICY "pdf_detected_fields_update" ON pdf_detected_fields
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        )
        OR is_super_admin()
    );

CREATE POLICY "pdf_detected_fields_delete" ON pdf_detected_fields
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() AND get_user_role() = 'admin')
        )
        OR is_super_admin()
    );


-- ============================================================================
-- 10. RLS POLICIES - PDF CONVERSION SESSIONS
-- ============================================================================

CREATE POLICY "pdf_conversion_sessions_select" ON pdf_conversion_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "pdf_conversion_sessions_insert" ON pdf_conversion_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        )
        OR is_super_admin()
    );

CREATE POLICY "pdf_conversion_sessions_update" ON pdf_conversion_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        )
        OR is_super_admin()
    );

CREATE POLICY "pdf_conversion_sessions_delete" ON pdf_conversion_sessions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pdf_form_uploads pfu
            WHERE pfu.id = pdf_upload_id
            AND (pfu.company_id = get_user_company_id() AND get_user_role() = 'admin')
        )
        OR is_super_admin()
    );


-- ============================================================================
-- 11. RLS POLICIES - PDF FORM REFERENCES
-- ============================================================================

CREATE POLICY "pdf_form_references_select" ON pdf_form_references
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND (ft.company_id IS NULL OR ft.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "pdf_form_references_insert" ON pdf_form_references
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

CREATE POLICY "pdf_form_references_delete" ON pdf_form_references
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() = 'admin')
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );


-- ============================================================================
-- 12. HELPER FUNCTIONS
-- ============================================================================

-- Generate a unique form code from PDF filename
CREATE OR REPLACE FUNCTION generate_form_code_from_pdf(
    p_filename TEXT,
    p_company_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_code TEXT;
    v_code TEXT;
    v_suffix INTEGER := 0;
BEGIN
    -- Clean filename: remove extension, replace spaces/special chars
    v_base_code := LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(p_filename, '\.[^.]+$', ''),  -- Remove extension
        '[^a-z0-9]+', '_', 'g'                        -- Replace non-alphanumeric
    ));
    
    -- Truncate to reasonable length
    v_base_code := SUBSTRING(v_base_code, 1, 30);
    v_code := v_base_code;
    
    -- Check for uniqueness, add suffix if needed
    WHILE EXISTS (
        SELECT 1 FROM form_templates 
        WHERE form_code = v_code 
        AND (company_id = p_company_id OR company_id IS NULL)
    ) LOOP
        v_suffix := v_suffix + 1;
        v_code := v_base_code || '_' || v_suffix;
    END LOOP;
    
    RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_form_code_from_pdf IS 'Generates unique form code from PDF filename';


-- Convert detected fields to form template
CREATE OR REPLACE FUNCTION convert_pdf_to_form_template(
    p_session_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_upload RECORD;
    v_template_id UUID;
    v_section JSONB;
    v_section_id UUID;
    v_field RECORD;
    v_section_order INTEGER := 0;
BEGIN
    -- Get session and upload data
    SELECT * INTO v_session FROM pdf_conversion_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversion session not found';
    END IF;
    
    SELECT * INTO v_upload FROM pdf_form_uploads WHERE id = v_session.pdf_upload_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PDF upload not found';
    END IF;
    
    -- Create the form template
    INSERT INTO form_templates (
        company_id,
        form_code,
        name,
        description,
        cor_element,
        frequency,
        estimated_time_minutes,
        icon,
        color,
        is_active,
        is_mandatory,
        created_by
    )
    VALUES (
        v_upload.company_id,
        COALESCE(v_session.form_code, generate_form_code_from_pdf(v_upload.file_name, v_upload.company_id)),
        COALESCE(v_session.form_name, v_upload.file_name),
        v_session.form_description,
        CASE WHEN v_session.is_cor_related THEN v_session.cor_element ELSE NULL END,
        COALESCE((v_upload.ai_analysis->>'suggested_frequency')::TEXT, 'as_needed'),
        10,
        'file-scan',
        '#6366f1',
        true,
        false,
        v_session.created_by
    )
    RETURNING id INTO v_template_id;
    
    -- Create sections and fields from detected fields
    FOR v_section IN SELECT * FROM jsonb_array_elements(v_session.sections_config)
    LOOP
        -- Create section
        INSERT INTO form_sections (
            form_template_id,
            title,
            description,
            order_index,
            is_repeatable
        )
        VALUES (
            v_template_id,
            v_section->>'title',
            v_section->>'description',
            v_section_order,
            COALESCE((v_section->>'is_repeatable')::BOOLEAN, false)
        )
        RETURNING id INTO v_section_id;
        
        -- Create fields for this section
        FOR v_field IN 
            SELECT * FROM pdf_detected_fields 
            WHERE pdf_upload_id = v_session.pdf_upload_id
            AND id::TEXT = ANY(
                SELECT jsonb_array_elements_text(v_section->'field_ids')
            )
            AND NOT is_excluded
            ORDER BY field_order
        LOOP
            INSERT INTO form_fields (
                form_section_id,
                field_code,
                label,
                field_type,
                help_text,
                options,
                validation_rules,
                order_index,
                width
            )
            VALUES (
                v_section_id,
                v_field.field_code,
                COALESCE(v_field.user_label, v_field.detected_label),
                COALESCE(v_field.user_type, v_field.suggested_type),
                v_field.suggested_help_text,
                COALESCE(v_field.user_options, v_field.suggested_options),
                COALESCE(v_field.user_validation, v_field.suggested_validation, '{"required": false}'::jsonb),
                v_field.field_order,
                'full'
            );
        END LOOP;
        
        v_section_order := v_section_order + 1;
    END LOOP;
    
    -- Create workflow
    INSERT INTO form_workflows (
        form_template_id,
        submit_to_role,
        notify_roles,
        creates_task,
        requires_approval,
        sync_priority,
        auto_create_evidence,
        evidence_audit_element
    )
    VALUES (
        v_template_id,
        COALESCE(v_session.workflow_config->>'submit_to_role', 'supervisor'),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_session.workflow_config->'notify_roles')), ARRAY['admin']::TEXT[]),
        COALESCE((v_session.workflow_config->>'creates_task')::BOOLEAN, false),
        COALESCE((v_session.workflow_config->>'requires_approval')::BOOLEAN, false),
        COALESCE((v_session.workflow_config->>'sync_priority')::INTEGER, 3),
        v_session.is_cor_related,
        CASE WHEN v_session.is_cor_related THEN 'Element ' || v_session.cor_element ELSE NULL END
    );
    
    -- Create PDF reference
    INSERT INTO pdf_form_references (
        form_template_id,
        pdf_upload_id,
        original_file_name,
        original_storage_path,
        converted_by
    )
    VALUES (
        v_template_id,
        v_session.pdf_upload_id,
        v_upload.file_name,
        v_upload.storage_path,
        v_session.created_by
    );
    
    -- Update upload status
    UPDATE pdf_form_uploads
    SET status = 'completed',
        completed_at = NOW(),
        result_template_id = v_template_id
    WHERE id = v_session.pdf_upload_id;
    
    -- Update session
    UPDATE pdf_conversion_sessions
    SET current_step = 'publish',
        completed_at = NOW()
    WHERE id = p_session_id;
    
    RETURN v_template_id;
END;
$$;

COMMENT ON FUNCTION convert_pdf_to_form_template IS 'Converts a PDF conversion session into a form template';


-- ============================================================================
-- 13. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON pdf_form_uploads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pdf_detected_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pdf_conversion_sessions TO authenticated;
GRANT SELECT, INSERT, DELETE ON pdf_form_references TO authenticated;

GRANT EXECUTE ON FUNCTION generate_form_code_from_pdf TO authenticated;
GRANT EXECUTE ON FUNCTION convert_pdf_to_form_template TO authenticated;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
