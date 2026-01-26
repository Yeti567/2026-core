-- ============================================================================
-- Form Builder System Migration
-- ============================================================================
-- Creates a comprehensive dynamic form builder for COR compliance:
-- - form_templates: Master form definitions per company
-- - form_sections: Logical groupings within forms (can be repeatable)
-- - form_fields: Individual fields with validation & conditional logic
-- - form_workflows: Submission routing, approvals, notifications
-- - form_submissions: Filled form data with offline sync support
-- - form_evidence_mappings: Links submissions to COR audit elements
-- ============================================================================

-- ============================================================================
-- 1. FORM TEMPLATES TABLE
-- ============================================================================
-- Stores the master definition of each form type.
-- Companies can have their own templates or clone global ones.
-- company_id = NULL means it's a global template available to all.

CREATE TABLE IF NOT EXISTS form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership (NULL = global template available to all companies)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identification
    form_code TEXT NOT NULL,  -- e.g., "hazard_reporting", "first_aid_log"
    name TEXT NOT NULL,       -- e.g., "Hazard Report Form"
    description TEXT,         -- Purpose and instructions
    
    -- COR Integration
    cor_element INTEGER CHECK (cor_element >= 1 AND cor_element <= 14),
    
    -- Scheduling & Time
    frequency TEXT CHECK (frequency IN (
        'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'as_needed', 'per_shift'
    )) DEFAULT 'as_needed',
    estimated_time_minutes INTEGER DEFAULT 5,
    
    -- UI Customization
    icon TEXT DEFAULT 'file-text',  -- lucide-react icon name
    color TEXT DEFAULT '#3b82f6',   -- Hex color for theming
    
    -- Versioning & Status
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_mandatory BOOLEAN NOT NULL DEFAULT false,  -- Required by COR
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Unique form code per company (global templates have NULL company_id)
    UNIQUE(company_id, form_code)
);

COMMENT ON TABLE form_templates IS 'Master form definitions. company_id=NULL means global template.';
COMMENT ON COLUMN form_templates.form_code IS 'Unique identifier like hazard_reporting, first_aid_log';
COMMENT ON COLUMN form_templates.cor_element IS 'COR element number (1-14) this form supports';
COMMENT ON COLUMN form_templates.frequency IS 'How often this form should be completed';


-- ============================================================================
-- 2. FORM SECTIONS TABLE
-- ============================================================================
-- Organizes fields into logical sections within a form.
-- Sections can be repeatable (e.g., "Add another witness")
-- Sections can have conditional logic (e.g., show injury section only for injuries)

CREATE TABLE IF NOT EXISTS form_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,           -- Section heading
    description TEXT,              -- Instructions for this section
    
    -- Ordering & Behavior
    order_index INTEGER NOT NULL DEFAULT 0,
    is_repeatable BOOLEAN NOT NULL DEFAULT false,  -- Can add multiple instances
    min_repeats INTEGER DEFAULT 1,   -- Minimum instances (if repeatable)
    max_repeats INTEGER DEFAULT 10,  -- Maximum instances (if repeatable)
    
    -- Conditional Display
    -- Example: {"field_id": "uuid", "operator": "equals", "value": "injury"}
    conditional_logic JSONB DEFAULT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE form_sections IS 'Logical groupings of fields. Can be repeatable or conditional.';
COMMENT ON COLUMN form_sections.is_repeatable IS 'If true, user can add multiple instances';
COMMENT ON COLUMN form_sections.conditional_logic IS 'JSON: {field_id, operator, value} to show/hide section';


-- ============================================================================
-- 3. FORM FIELDS TABLE
-- ============================================================================
-- Individual form fields with full validation and conditional logic support.
-- Supports 15+ field types for comprehensive data collection.

CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_section_id UUID NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
    
    -- Identification
    field_code TEXT NOT NULL,  -- Unique within form, e.g., "hazard_description"
    label TEXT NOT NULL,       -- Display label
    
    -- Field Type
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text',           -- Single line text
        'textarea',       -- Multi-line text
        'number',         -- Numeric input
        'date',           -- Date picker
        'time',           -- Time picker
        'datetime',       -- Date and time
        'dropdown',       -- Single select dropdown
        'radio',          -- Radio button group
        'checkbox',       -- Single checkbox (boolean)
        'multiselect',    -- Multi-select checkboxes
        'signature',      -- Signature capture pad
        'photo',          -- Camera/photo upload
        'file',           -- File attachment
        'gps',            -- GPS coordinates capture
        'worker_select',  -- Select from company workers
        'jobsite_select', -- Select from company jobsites
        'equipment_select', -- Select from company equipment
        'rating',         -- Star rating (1-5)
        'slider',         -- Range slider
        'yes_no',         -- Yes/No toggle
        'yes_no_na',      -- Yes/No/N/A selection
        'email',          -- Email with validation
        'phone',          -- Phone number
        'currency',       -- Money amount
        'body_diagram',   -- Body part selector for injuries
        'weather',        -- Weather conditions
        'temperature',    -- Temperature with unit
        'hidden'          -- Hidden field (for calculations)
    )),
    
    -- Display Configuration
    placeholder TEXT,          -- Input placeholder
    help_text TEXT,            -- Tooltip/help text
    default_value TEXT,        -- Pre-filled value
    width TEXT CHECK (width IN ('full', 'half', 'third', 'quarter')) DEFAULT 'full',
    
    -- Options (for dropdown, radio, multiselect)
    -- Format: ["Option 1", "Option 2"] or [{"value": "opt1", "label": "Option 1"}, ...]
    options JSONB DEFAULT NULL,
    
    -- Validation Rules
    -- Format: {
    --   "required": true,
    --   "min_length": 10,
    --   "max_length": 500,
    --   "pattern": "^[0-9]{10}$",
    --   "min_value": 0,
    --   "max_value": 100,
    --   "min_date": "today",
    --   "max_date": "+30days",
    --   "allowed_extensions": ["pdf", "jpg", "png"],
    --   "max_file_size_mb": 10,
    --   "custom_message": "Please enter a valid value"
    -- }
    validation_rules JSONB DEFAULT '{"required": false}'::jsonb,
    
    -- Conditional Display
    -- Format: {"field_id": "uuid", "operator": "equals|not_equals|contains|greater_than|less_than|is_empty|is_not_empty", "value": "..."}
    conditional_logic JSONB DEFAULT NULL,
    
    -- Ordering
    order_index INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE form_fields IS 'Individual form fields with validation and conditional logic.';
COMMENT ON COLUMN form_fields.field_code IS 'Unique identifier within form for data storage';
COMMENT ON COLUMN form_fields.options IS 'JSON array for dropdown/radio options';
COMMENT ON COLUMN form_fields.validation_rules IS 'JSON object with validation config';
COMMENT ON COLUMN form_fields.conditional_logic IS 'JSON: show field when condition met';


-- ============================================================================
-- 4. FORM WORKFLOWS TABLE
-- ============================================================================
-- Defines what happens after form submission:
-- - Who receives the form
-- - Who gets notified
-- - Whether approval is required
-- - Auto-task creation

CREATE TABLE IF NOT EXISTS form_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    
    -- Routing
    submit_to_role TEXT,           -- supervisor, safety_manager, hr, admin
    notify_roles TEXT[] DEFAULT '{}',  -- Array of roles to notify
    notify_emails TEXT[] DEFAULT '{}', -- Specific email addresses
    
    -- Task Creation
    creates_task BOOLEAN NOT NULL DEFAULT false,
    task_template JSONB DEFAULT NULL,  -- Task details if creates_task=true
    -- Format: {
    --   "title": "Review {form_name}",
    --   "description": "Please review the submitted form",
    --   "assigned_to_role": "supervisor",
    --   "due_days": 3,
    --   "priority": "medium"
    -- }
    
    -- Approval Workflow
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approval_workflow JSONB DEFAULT NULL,  -- Multi-step approval
    -- Format: [
    --   {"step": 1, "role": "supervisor", "required": true},
    --   {"step": 2, "role": "safety_manager", "required": false}
    -- ]
    
    -- Sync Configuration
    sync_priority INTEGER CHECK (sync_priority >= 1 AND sync_priority <= 5) DEFAULT 3,
    
    -- Evidence Chain
    auto_create_evidence BOOLEAN NOT NULL DEFAULT true,
    evidence_audit_element TEXT,  -- Which COR element to link to
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE form_workflows IS 'Post-submission routing, notifications, and approvals.';
COMMENT ON COLUMN form_workflows.sync_priority IS '1=highest priority, 5=lowest for offline sync';


-- ============================================================================
-- 5. FORM SUBMISSIONS TABLE
-- ============================================================================
-- Stores all filled form data with offline-first support.
-- Uses JSONB for flexible field storage.

CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
    
    -- Identification
    form_number TEXT NOT NULL,  -- Auto-generated: FRM-CODE-YYYY-###
    
    -- Submitter Info
    submitted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    
    -- Context
    jobsite_id UUID,  -- Where form was filled (if applicable)
    
    -- Form Data (all field values stored as JSON)
    -- Format: { "field_code": value, "hazard_type": "slip", "description": "..." }
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Attachments (photos, signatures, files)
    -- Format: {
    --   "photos": [{"field_code": "photo1", "url": "...", "thumbnail": "..."}],
    --   "signatures": [{"field_code": "worker_sig", "data": "base64..."}],
    --   "files": [{"field_code": "attachment", "url": "...", "name": "doc.pdf"}]
    -- }
    attachments JSONB DEFAULT '{}'::jsonb,
    
    -- Location
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    gps_accuracy DECIMAL(10, 2),  -- Accuracy in meters
    
    -- Status & Workflow
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',      -- Started but not submitted
        'submitted',  -- Submitted, awaiting review
        'approved',   -- Approved by reviewer
        'rejected',   -- Rejected, needs revision
        'archived'    -- Completed and archived
    )),
    
    -- Approval Chain (tracks who approved/rejected and when)
    -- Format: [
    --   {"user_id": "uuid", "action": "approved", "timestamp": "...", "notes": "..."},
    --   {"user_id": "uuid", "action": "rejected", "timestamp": "...", "notes": "Needs more detail"}
    -- ]
    approval_chain JSONB DEFAULT '[]'::jsonb,
    
    -- Offline Sync
    synced BOOLEAN NOT NULL DEFAULT false,
    sync_attempts INTEGER DEFAULT 0,
    last_sync_error TEXT,
    local_id TEXT,  -- Client-side UUID for offline-first
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique form number per company
    UNIQUE(company_id, form_number)
);

COMMENT ON TABLE form_submissions IS 'Submitted form data with offline sync support.';
COMMENT ON COLUMN form_submissions.form_number IS 'Auto-generated: FRM-CODE-YYYY-###';
COMMENT ON COLUMN form_submissions.form_data IS 'JSON object with all field values';
COMMENT ON COLUMN form_submissions.synced IS 'True when uploaded to server from offline';


-- ============================================================================
-- 6. FORM EVIDENCE MAPPINGS TABLE
-- ============================================================================
-- Links form submissions to COR audit elements for evidence tracking.

CREATE TABLE IF NOT EXISTS form_evidence_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    
    -- COR Mapping
    audit_element TEXT NOT NULL,  -- "Element 2", "Element 3", etc.
    evidence_type TEXT NOT NULL DEFAULT 'form',  -- form, training, inspection, etc.
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE form_evidence_mappings IS 'Links submissions to COR audit elements.';


-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Form Templates
CREATE INDEX IF NOT EXISTS idx_form_templates_company ON form_templates(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_form_templates_cor_element ON form_templates(cor_element) WHERE cor_element IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_templates_code ON form_templates(form_code);

-- Form Sections
CREATE INDEX IF NOT EXISTS idx_form_sections_template ON form_sections(form_template_id, order_index);

-- Form Fields
CREATE INDEX IF NOT EXISTS idx_form_fields_section ON form_fields(form_section_id, order_index);
CREATE INDEX IF NOT EXISTS idx_form_fields_code ON form_fields(field_code);

-- Form Submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_company ON form_submissions(company_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON form_submissions(form_template_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_sync ON form_submissions(company_id, synced) WHERE synced = false;
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitter ON form_submissions(submitted_by, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_jobsite ON form_submissions(jobsite_id) WHERE jobsite_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_data ON form_submissions USING GIN (form_data);

-- Form Evidence Mappings
CREATE INDEX IF NOT EXISTS idx_form_evidence_submission ON form_evidence_mappings(form_submission_id);
CREATE INDEX IF NOT EXISTS idx_form_evidence_element ON form_evidence_mappings(audit_element);


-- ============================================================================
-- 8. UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_form_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_templates_updated_at
    BEFORE UPDATE ON form_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_form_updated_at();

CREATE TRIGGER form_submissions_updated_at
    BEFORE UPDATE ON form_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_form_updated_at();


-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_evidence_mappings ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 10. RLS POLICIES - FORM TEMPLATES
-- ============================================================================

-- SELECT: Users can see their company's templates OR global templates (company_id IS NULL)
DROP POLICY IF EXISTS "form_templates_select" ON form_templates;
CREATE POLICY "form_templates_select" ON form_templates
    FOR SELECT USING (
        company_id IS NULL 
        OR company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Admins can create templates for their company, super_admin can create global
DROP POLICY IF EXISTS "form_templates_insert" ON form_templates;
CREATE POLICY "form_templates_insert" ON form_templates
    FOR INSERT WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

-- UPDATE: Admins can update their company's templates, super_admin can update global
DROP POLICY IF EXISTS "form_templates_update" ON form_templates;
CREATE POLICY "form_templates_update" ON form_templates
    FOR UPDATE USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

-- DELETE: Only admins can delete, super_admin for global
DROP POLICY IF EXISTS "form_templates_delete" ON form_templates;
CREATE POLICY "form_templates_delete" ON form_templates
    FOR DELETE USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR (company_id IS NULL AND is_super_admin())
    );


-- ============================================================================
-- 11. RLS POLICIES - FORM SECTIONS & FIELDS
-- ============================================================================

-- Sections inherit access from their parent template
DROP POLICY IF EXISTS "form_sections_select" ON form_sections;
CREATE POLICY "form_sections_select" ON form_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND (ft.company_id IS NULL OR ft.company_id = get_user_company_id() OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "form_sections_insert" ON form_sections;
CREATE POLICY "form_sections_insert" ON form_sections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

DROP POLICY IF EXISTS "form_sections_update" ON form_sections;
CREATE POLICY "form_sections_update" ON form_sections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

DROP POLICY IF EXISTS "form_sections_delete" ON form_sections;
CREATE POLICY "form_sections_delete" ON form_sections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() = 'admin')
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

-- Fields inherit access from their parent section's template
DROP POLICY IF EXISTS "form_fields_select" ON form_fields;
CREATE POLICY "form_fields_select" ON form_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_sections fs
            JOIN form_templates ft ON ft.id = fs.form_template_id
            WHERE fs.id = form_section_id
            AND (ft.company_id IS NULL OR ft.company_id = get_user_company_id() OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "form_fields_insert" ON form_fields;
CREATE POLICY "form_fields_insert" ON form_fields
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_sections fs
            JOIN form_templates ft ON ft.id = fs.form_template_id
            WHERE fs.id = form_section_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

DROP POLICY IF EXISTS "form_fields_update" ON form_fields;
CREATE POLICY "form_fields_update" ON form_fields
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM form_sections fs
            JOIN form_templates ft ON ft.id = fs.form_template_id
            WHERE fs.id = form_section_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

DROP POLICY IF EXISTS "form_fields_delete" ON form_fields;
CREATE POLICY "form_fields_delete" ON form_fields
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM form_sections fs
            JOIN form_templates ft ON ft.id = fs.form_template_id
            WHERE fs.id = form_section_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() = 'admin')
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );


-- ============================================================================
-- 12. RLS POLICIES - FORM WORKFLOWS
-- ============================================================================

DROP POLICY IF EXISTS "form_workflows_select" ON form_workflows;
CREATE POLICY "form_workflows_select" ON form_workflows
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND (ft.company_id IS NULL OR ft.company_id = get_user_company_id() OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "form_workflows_insert" ON form_workflows;
CREATE POLICY "form_workflows_insert" ON form_workflows
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

DROP POLICY IF EXISTS "form_workflows_update" ON form_workflows;
CREATE POLICY "form_workflows_update" ON form_workflows
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );

DROP POLICY IF EXISTS "form_workflows_delete" ON form_workflows;
CREATE POLICY "form_workflows_delete" ON form_workflows
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = form_template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() = 'admin')
                 OR (ft.company_id IS NULL AND is_super_admin()))
        )
    );


-- ============================================================================
-- 13. RLS POLICIES - FORM SUBMISSIONS
-- ============================================================================

-- SELECT: Users can see their company's submissions
DROP POLICY IF EXISTS "form_submissions_select" ON form_submissions;
CREATE POLICY "form_submissions_select" ON form_submissions
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: All authenticated users can submit forms for their company
DROP POLICY IF EXISTS "form_submissions_insert" ON form_submissions;
CREATE POLICY "form_submissions_insert" ON form_submissions
    FOR INSERT WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Submitter can update drafts, admins can update any
DROP POLICY IF EXISTS "form_submissions_update" ON form_submissions;
CREATE POLICY "form_submissions_update" ON form_submissions
    FOR UPDATE USING (
        (company_id = get_user_company_id() AND (
            submitted_by = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
            OR get_user_role() IN ('admin', 'supervisor', 'internal_auditor')
        ))
        OR is_super_admin()
    );

-- DELETE: Only admins can delete submissions
DROP POLICY IF EXISTS "form_submissions_delete" ON form_submissions;
CREATE POLICY "form_submissions_delete" ON form_submissions
    FOR DELETE USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );


-- ============================================================================
-- 14. RLS POLICIES - FORM EVIDENCE MAPPINGS
-- ============================================================================

DROP POLICY IF EXISTS "form_evidence_select" ON form_evidence_mappings;
CREATE POLICY "form_evidence_select" ON form_evidence_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_submissions fs
            WHERE fs.id = form_submission_id
            AND (fs.company_id = get_user_company_id() OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "form_evidence_insert" ON form_evidence_mappings;
CREATE POLICY "form_evidence_insert" ON form_evidence_mappings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_submissions fs
            WHERE fs.id = form_submission_id
            AND (fs.company_id = get_user_company_id() OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "form_evidence_delete" ON form_evidence_mappings;
CREATE POLICY "form_evidence_delete" ON form_evidence_mappings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM form_submissions fs
            WHERE fs.id = form_submission_id
            AND ((fs.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR is_super_admin())
        )
    );


-- ============================================================================
-- 15. HELPER FUNCTIONS
-- ============================================================================

-- Generate unique form number: FRM-{CODE}-{YEAR}-{sequence}
CREATE OR REPLACE FUNCTION generate_form_number(
    p_form_code TEXT,
    p_company_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year TEXT;
    v_sequence INTEGER;
    v_form_number TEXT;
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next sequence number for this form code and year
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(form_number, '-', 4) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM form_submissions
    WHERE company_id = p_company_id
    AND form_number LIKE 'FRM-' || UPPER(p_form_code) || '-' || v_year || '-%';
    
    -- Format: FRM-HAZREP-2025-042
    v_form_number := 'FRM-' || UPPER(SUBSTRING(p_form_code, 1, 6)) || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_form_number;
END;
$$;

COMMENT ON FUNCTION generate_form_number IS 'Generates unique form number: FRM-CODE-YYYY-###';


-- Clone a form template to another company
CREATE OR REPLACE FUNCTION clone_form_template(
    p_template_id UUID,
    p_new_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_template_id UUID;
    v_old_section_id UUID;
    v_new_section_id UUID;
BEGIN
    -- Clone the template
    INSERT INTO form_templates (
        company_id, form_code, name, description, cor_element,
        frequency, estimated_time_minutes, icon, color,
        version, is_active, is_mandatory, created_by
    )
    SELECT 
        p_new_company_id, form_code, name, description, cor_element,
        frequency, estimated_time_minutes, icon, color,
        1, is_active, is_mandatory, auth.uid()
    FROM form_templates
    WHERE id = p_template_id
    RETURNING id INTO v_new_template_id;
    
    -- Clone sections and their fields
    FOR v_old_section_id IN
        SELECT id FROM form_sections WHERE form_template_id = p_template_id ORDER BY order_index
    LOOP
        INSERT INTO form_sections (
            form_template_id, title, description, order_index,
            is_repeatable, min_repeats, max_repeats, conditional_logic
        )
        SELECT 
            v_new_template_id, title, description, order_index,
            is_repeatable, min_repeats, max_repeats, conditional_logic
        FROM form_sections
        WHERE id = v_old_section_id
        RETURNING id INTO v_new_section_id;
        
        -- Clone fields for this section
        INSERT INTO form_fields (
            form_section_id, field_code, label, field_type,
            placeholder, help_text, default_value, width,
            options, validation_rules, conditional_logic, order_index
        )
        SELECT 
            v_new_section_id, field_code, label, field_type,
            placeholder, help_text, default_value, width,
            options, validation_rules, conditional_logic, order_index
        FROM form_fields
        WHERE form_section_id = v_old_section_id;
    END LOOP;
    
    -- Clone workflow
    INSERT INTO form_workflows (
        form_template_id, submit_to_role, notify_roles, notify_emails,
        creates_task, task_template, requires_approval, approval_workflow,
        sync_priority, auto_create_evidence, evidence_audit_element
    )
    SELECT 
        v_new_template_id, submit_to_role, notify_roles, notify_emails,
        creates_task, task_template, requires_approval, approval_workflow,
        sync_priority, auto_create_evidence, evidence_audit_element
    FROM form_workflows
    WHERE form_template_id = p_template_id;
    
    RETURN v_new_template_id;
END;
$$;

COMMENT ON FUNCTION clone_form_template IS 'Clones a form template (global or other) to a company';


-- Get form completion statistics
CREATE OR REPLACE FUNCTION get_form_completion_stats(
    p_company_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    form_code TEXT,
    form_name TEXT,
    total_submissions BIGINT,
    submitted_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT,
    draft_count BIGINT,
    completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ft.form_code,
        ft.name AS form_name,
        COUNT(fs.id) AS total_submissions,
        COUNT(fs.id) FILTER (WHERE fs.status = 'submitted') AS submitted_count,
        COUNT(fs.id) FILTER (WHERE fs.status = 'approved') AS approved_count,
        COUNT(fs.id) FILTER (WHERE fs.status = 'rejected') AS rejected_count,
        COUNT(fs.id) FILTER (WHERE fs.status = 'draft') AS draft_count,
        CASE 
            WHEN COUNT(fs.id) > 0 
            THEN ROUND((COUNT(fs.id) FILTER (WHERE fs.status IN ('submitted', 'approved', 'archived'))::NUMERIC / COUNT(fs.id) * 100), 1)
            ELSE 0
        END AS completion_rate
    FROM form_templates ft
    LEFT JOIN form_submissions fs ON fs.form_template_id = ft.id
        AND fs.company_id = p_company_id
        AND (p_start_date IS NULL OR fs.created_at >= p_start_date)
        AND (p_end_date IS NULL OR fs.created_at <= p_end_date + INTERVAL '1 day')
    WHERE ft.company_id = p_company_id OR ft.company_id IS NULL
    GROUP BY ft.id, ft.form_code, ft.name
    ORDER BY total_submissions DESC;
END;
$$;

COMMENT ON FUNCTION get_form_completion_stats IS 'Returns completion statistics for all forms';


-- ============================================================================
-- 16. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON form_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON form_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON form_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON form_workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON form_submissions TO authenticated;
GRANT SELECT, INSERT, DELETE ON form_evidence_mappings TO authenticated;

GRANT EXECUTE ON FUNCTION generate_form_number TO authenticated;
GRANT EXECUTE ON FUNCTION clone_form_template TO authenticated;
GRANT EXECUTE ON FUNCTION get_form_completion_stats TO authenticated;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
