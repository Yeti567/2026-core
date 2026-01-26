-- ============================================================================
-- PDF Form Conversion System Migration
-- ============================================================================
-- Enables AI-powered conversion of PDF forms to digital form templates:
-- - pdf_form_conversions: Track PDF upload and OCR/AI processing
-- - form_field_mappings: Manual field adjustments during mapping
-- ============================================================================

-- ============================================================================
-- 1. PDF FORM CONVERSIONS TABLE
-- ============================================================================
-- Tracks the entire conversion process from PDF upload to published form

CREATE TABLE IF NOT EXISTS pdf_form_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Original PDF Info
    original_pdf_path TEXT NOT NULL,
    original_pdf_name TEXT NOT NULL,
    pdf_page_count INTEGER,
    pdf_size_bytes BIGINT,
    
    -- OCR Processing Status
    ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    ocr_started_at TIMESTAMPTZ,
    ocr_completed_at TIMESTAMPTZ,
    ocr_error TEXT,
    
    -- Extracted Content
    extracted_text TEXT,
    detected_fields JSONB DEFAULT '[]'::jsonb,
    /*
    Example detected_fields structure:
    [
      {
        "field_id": "field_1",
        "label": "Worker Name",
        "field_type": "text",
        "position": {"page": 1, "x": 50, "y": 100, "width": 200, "height": 30},
        "confidence": 0.95,
        "validation_rules": {"required": true},
        "auto_detected": true
      },
      {
        "field_id": "field_2",
        "label": "Date",
        "field_type": "date",
        "position": {"page": 1, "x": 300, "y": 100, "width": 150, "height": 30},
        "confidence": 0.88,
        "auto_detected": true
      }
    ]
    */
    
    -- AI Suggestions
    ai_suggested_metadata JSONB DEFAULT '{}'::jsonb,
    /*
    {
      "suggested_form_name": "Daily Hazard Assessment",
      "suggested_cor_elements": [2, 3],
      "suggested_category": "hazard_assessment",
      "confidence": 0.92,
      "reasoning": "Form contains hazard identification checklist..."
    }
    */
    
    -- Conversion Workflow Status
    conversion_status TEXT NOT NULL DEFAULT 'draft' CHECK (conversion_status IN (
        'draft',           -- Initial upload
        'mapping_fields',  -- OCR complete, user is mapping fields
        'ready_to_publish', -- Fields mapped, ready for final review
        'published',       -- Form template created
        'archived'         -- No longer needed
    )),
    
    -- Result
    mapped_form_template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    
    -- Audit Trail
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pdf_form_conversions IS 'Tracks PDF upload and OCR/AI conversion process';
COMMENT ON COLUMN pdf_form_conversions.detected_fields IS 'JSON array of auto-detected form fields with positions';
COMMENT ON COLUMN pdf_form_conversions.ai_suggested_metadata IS 'AI-generated suggestions for form name, COR elements, category';

-- ============================================================================
-- 2. FORM FIELD MAPPINGS TABLE
-- ============================================================================
-- Stores manual field adjustments during the mapping phase

CREATE TABLE IF NOT EXISTS form_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id UUID NOT NULL REFERENCES pdf_form_conversions(id) ON DELETE CASCADE,
    
    -- Field Identity
    field_id TEXT NOT NULL,
    field_code TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text', 'textarea', 'number', 'date', 'time', 'datetime',
        'dropdown', 'radio', 'checkbox', 'multiselect',
        'signature', 'photo', 'file', 'gps',
        'worker_select', 'jobsite_select', 'equipment_select',
        'rating', 'slider', 'yes_no', 'yes_no_na',
        'email', 'tel', 'currency', 'body_diagram',
        'weather', 'temperature', 'hidden'
    )),
    
    -- Position on PDF (for visual mapping)
    position_page INTEGER,
    position_x INTEGER,
    position_y INTEGER,
    position_width INTEGER,
    position_height INTEGER,
    
    -- Field Configuration
    validation_rules JSONB DEFAULT '{}'::jsonb,
    options JSONB,               -- For dropdown/radio/checkbox
    conditional_logic JSONB,     -- Show/hide conditions
    placeholder TEXT,
    help_text TEXT,
    default_value TEXT,
    
    -- Section Organization
    section_name TEXT DEFAULT 'Section 1',
    section_order INTEGER DEFAULT 1,
    field_order INTEGER DEFAULT 0,
    
    -- Tracking
    auto_detected BOOLEAN NOT NULL DEFAULT false,
    manually_added BOOLEAN NOT NULL DEFAULT false,
    edited_by_user BOOLEAN NOT NULL DEFAULT false,
    confidence DECIMAL(5, 4),    -- OCR confidence score (0-1)
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique field per conversion
    UNIQUE(conversion_id, field_id)
);

COMMENT ON TABLE form_field_mappings IS 'Manual field adjustments during PDF-to-form conversion';
COMMENT ON COLUMN form_field_mappings.field_code IS 'Snake_case identifier used in form_data JSON';
COMMENT ON COLUMN form_field_mappings.confidence IS 'OCR confidence score from 0 to 1';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pdf_conversions_company ON pdf_form_conversions(company_id, conversion_status);
CREATE INDEX IF NOT EXISTS idx_pdf_conversions_status ON pdf_form_conversions(ocr_status);
CREATE INDEX IF NOT EXISTS idx_pdf_conversions_created ON pdf_form_conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_conversions_user ON pdf_form_conversions(created_by);
CREATE INDEX IF NOT EXISTS idx_field_mappings_conversion ON form_field_mappings(conversion_id, field_order);
CREATE INDEX IF NOT EXISTS idx_field_mappings_section ON form_field_mappings(conversion_id, section_order, field_order);

-- ============================================================================
-- 4. UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pdf_conversion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pdf_conversions_updated_at ON pdf_form_conversions;
CREATE TRIGGER pdf_conversions_updated_at
    BEFORE UPDATE ON pdf_form_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_conversion_timestamp();

DROP TRIGGER IF EXISTS field_mappings_updated_at ON form_field_mappings;
CREATE TRIGGER field_mappings_updated_at
    BEFORE UPDATE ON form_field_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_conversion_timestamp();

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pdf_form_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_field_mappings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLICIES - PDF FORM CONVERSIONS
-- ============================================================================

-- SELECT: Users can see their company's conversions
DROP POLICY IF EXISTS "pdf_conversions_select" ON pdf_form_conversions;
CREATE POLICY "pdf_conversions_select" ON pdf_form_conversions
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Admins can create conversions
DROP POLICY IF EXISTS "pdf_conversions_insert" ON pdf_form_conversions;
CREATE POLICY "pdf_conversions_insert" ON pdf_form_conversions
    FOR INSERT WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

-- UPDATE: Admins can update conversions
DROP POLICY IF EXISTS "pdf_conversions_update" ON pdf_form_conversions;
CREATE POLICY "pdf_conversions_update" ON pdf_form_conversions
    FOR UPDATE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

-- DELETE: Only admins can delete
DROP POLICY IF EXISTS "pdf_conversions_delete" ON pdf_form_conversions;
CREATE POLICY "pdf_conversions_delete" ON pdf_form_conversions
    FOR DELETE USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );

-- ============================================================================
-- 7. RLS POLICIES - FORM FIELD MAPPINGS
-- ============================================================================

-- SELECT: Users can see mappings for their company's conversions
DROP POLICY IF EXISTS "field_mappings_select" ON form_field_mappings;
CREATE POLICY "field_mappings_select" ON form_field_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_form_conversions pfc
            WHERE pfc.id = conversion_id
            AND (pfc.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- INSERT: Admins can create mappings
DROP POLICY IF EXISTS "field_mappings_insert" ON form_field_mappings;
CREATE POLICY "field_mappings_insert" ON form_field_mappings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pdf_form_conversions pfc
            WHERE pfc.id = conversion_id
            AND ((pfc.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR is_super_admin())
        )
    );

-- UPDATE: Admins can update mappings
DROP POLICY IF EXISTS "field_mappings_update" ON form_field_mappings;
CREATE POLICY "field_mappings_update" ON form_field_mappings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pdf_form_conversions pfc
            WHERE pfc.id = conversion_id
            AND ((pfc.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR is_super_admin())
        )
    );

-- DELETE: Admins can delete mappings
DROP POLICY IF EXISTS "field_mappings_delete" ON form_field_mappings;
CREATE POLICY "field_mappings_delete" ON form_field_mappings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pdf_form_conversions pfc
            WHERE pfc.id = conversion_id
            AND ((pfc.company_id = get_user_company_id() AND get_user_role() = 'admin')
                 OR is_super_admin())
        )
    );

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to publish a conversion to a form template
CREATE OR REPLACE FUNCTION publish_pdf_conversion(
    p_conversion_id UUID,
    p_form_name TEXT DEFAULT NULL,
    p_form_code TEXT DEFAULT NULL,
    p_cor_element INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conversion RECORD;
    v_template_id UUID;
    v_section_id UUID;
    v_current_section TEXT := '';
    v_mapping RECORD;
BEGIN
    -- Get conversion data
    SELECT * INTO v_conversion FROM pdf_form_conversions WHERE id = p_conversion_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversion not found';
    END IF;
    
    IF v_conversion.conversion_status = 'published' THEN
        RAISE EXCEPTION 'Conversion already published';
    END IF;
    
    -- Generate form code if not provided
    IF p_form_code IS NULL THEN
        p_form_code := 'pdf_' || LOWER(REPLACE(
            COALESCE(p_form_name, v_conversion.original_pdf_name),
            ' ', '_'
        )) || '_' || SUBSTRING(v_conversion.id::TEXT, 1, 8);
    END IF;
    
    -- Create form template
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
        v_conversion.company_id,
        p_form_code,
        COALESCE(p_form_name, (v_conversion.ai_suggested_metadata->>'suggested_form_name'), v_conversion.original_pdf_name),
        COALESCE(p_description, 'Converted from PDF: ' || v_conversion.original_pdf_name),
        COALESCE(p_cor_element, ((v_conversion.ai_suggested_metadata->'suggested_cor_elements'->>0)::INTEGER)),
        'as_needed',
        10,
        'file-scan',
        '#8b5cf6',
        true,
        false,
        v_conversion.created_by
    )
    RETURNING id INTO v_template_id;
    
    -- Create sections and fields from mappings
    FOR v_mapping IN
        SELECT DISTINCT section_name, section_order
        FROM form_field_mappings
        WHERE conversion_id = p_conversion_id
        ORDER BY section_order
    LOOP
        -- Create section
        INSERT INTO form_sections (
            form_template_id,
            title,
            order_index,
            is_repeatable
        )
        VALUES (
            v_template_id,
            v_mapping.section_name,
            v_mapping.section_order - 1,
            false
        )
        RETURNING id INTO v_section_id;
        
        -- Create fields for this section
        INSERT INTO form_fields (
            form_section_id,
            field_code,
            label,
            field_type,
            placeholder,
            help_text,
            default_value,
            options,
            validation_rules,
            conditional_logic,
            order_index,
            width
        )
        SELECT
            v_section_id,
            fm.field_code,
            fm.label,
            fm.field_type,
            fm.placeholder,
            fm.help_text,
            fm.default_value,
            fm.options,
            COALESCE(fm.validation_rules, '{}'::jsonb),
            fm.conditional_logic,
            fm.field_order,
            'full'
        FROM form_field_mappings fm
        WHERE fm.conversion_id = p_conversion_id
          AND fm.section_name = v_mapping.section_name
        ORDER BY fm.field_order;
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
        'supervisor',
        ARRAY['admin']::TEXT[],
        false,
        false,
        3,
        p_cor_element IS NOT NULL,
        CASE WHEN p_cor_element IS NOT NULL THEN 'Element ' || p_cor_element ELSE NULL END
    );
    
    -- Update conversion status
    UPDATE pdf_form_conversions
    SET conversion_status = 'published',
        mapped_form_template_id = v_template_id,
        published_at = NOW()
    WHERE id = p_conversion_id;
    
    RETURN v_template_id;
END;
$$;

COMMENT ON FUNCTION publish_pdf_conversion IS 'Publishes a PDF conversion as a form template';

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON pdf_form_conversions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON form_field_mappings TO authenticated;
GRANT EXECUTE ON FUNCTION publish_pdf_conversion TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
