-- ============================================================================
-- Form Templates System Migration
-- ============================================================================
-- Creates infrastructure for dynamic form building including:
-- - form_templates table for storing form schemas
-- - form_template_versions for version control
-- - form_field_types enum for supported field types
-- - Helper functions for template management
-- ============================================================================

-- ============================================================================
-- 1. CREATE ENUM TYPE FOR FIELD TYPES
-- ============================================================================

CREATE TYPE form_field_type AS ENUM (
    'text',           -- Single line text input
    'textarea',       -- Multi-line text input
    'number',         -- Numeric input
    'email',          -- Email input with validation
    'phone',          -- Phone number input
    'date',           -- Date picker
    'time',           -- Time picker
    'datetime',       -- Date and time picker
    'select',         -- Single select dropdown
    'multiselect',    -- Multiple select
    'radio',          -- Radio button group
    'checkbox',       -- Single checkbox
    'checkbox_group', -- Multiple checkboxes
    'signature',      -- Signature capture pad
    'photo',          -- Photo capture/upload
    'gps',            -- GPS coordinates capture
    'file',           -- File upload
    'section',        -- Section header/divider
    'instructions',   -- Read-only instructions text
    'rating',         -- Star/numeric rating
    'slider',         -- Range slider
    'yes_no',         -- Yes/No toggle
    'yes_no_na',      -- Yes/No/N/A selection
    'worker_select',  -- Worker picker from company roster
    'jobsite_select', -- Jobsite picker
    'equipment_select', -- Equipment picker
    'checklist',      -- Checklist items with pass/fail/na
    'risk_matrix',    -- Risk assessment matrix (likelihood x severity)
    'weather',        -- Weather conditions selector
    'temperature',    -- Temperature input
    'ppe_checklist',  -- PPE verification checklist
    'body_diagram',   -- Body part selector for injuries
    'repeater'        -- Repeatable field group
);

-- ============================================================================
-- 2. CREATE FORM TEMPLATE STATUS ENUM
-- ============================================================================

CREATE TYPE form_template_status AS ENUM (
    'draft',      -- Being edited, not available for use
    'published',  -- Active and available for workers
    'archived'    -- No longer in use, but retained for history
);

-- ============================================================================
-- 3. CREATE FORM TEMPLATES TABLE
-- ============================================================================

CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    -- NULL company_id = system template available to all
    
    -- Basic metadata
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL-friendly identifier
    description TEXT,
    icon TEXT, -- Emoji or icon class
    color TEXT, -- Theme color for the form
    
    -- COR Audit Integration
    cor_element TEXT, -- e.g., 'element_3', 'element_7', 'element_10'
    audit_category TEXT, -- Category within the COR element
    
    -- Form schema (JSON structure defining fields)
    schema JSONB NOT NULL DEFAULT '{"fields": [], "sections": []}',
    
    -- Validation rules (separate from schema for flexibility)
    validation_rules JSONB DEFAULT '{}',
    
    -- Conditional logic (show/hide fields based on values)
    conditional_logic JSONB DEFAULT '[]',
    
    -- Default values for new form instances
    default_values JSONB DEFAULT '{}',
    
    -- Form behavior settings
    settings JSONB DEFAULT '{
        "require_signature": true,
        "require_gps": true,
        "allow_photos": true,
        "max_photos": 10,
        "auto_save_interval": 30000,
        "allow_draft": true,
        "require_supervisor_signature": false,
        "offline_enabled": true,
        "sync_priority": 2
    }',
    
    -- Publishing info
    status form_template_status NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique slug per company (or globally for system templates)
    UNIQUE(company_id, slug)
);

-- ============================================================================
-- 4. CREATE FORM TEMPLATE VERSIONS TABLE (for version history)
-- ============================================================================

CREATE TABLE form_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    
    -- Snapshot of the template at this version
    schema JSONB NOT NULL,
    validation_rules JSONB,
    conditional_logic JSONB,
    settings JSONB,
    
    -- Change tracking
    change_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(template_id, version)
);

-- ============================================================================
-- 5. CREATE FORM TEMPLATE ASSIGNMENTS TABLE
-- ============================================================================

-- Controls which workers/roles can access which form templates
CREATE TABLE form_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Assignment target (one of these should be set)
    assigned_to_role user_role, -- Assign to all users with this role
    assigned_to_worker UUID REFERENCES workers(id) ON DELETE CASCADE, -- Specific worker
    assigned_to_jobsite UUID, -- Specific jobsite (if jobsites table exists)
    
    -- Assignment settings
    is_required BOOLEAN DEFAULT false, -- Must be completed
    frequency TEXT, -- 'daily', 'weekly', 'monthly', 'per_shift', 'once'
    due_date DATE, -- Specific due date if applicable
    
    -- Status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_form_templates_company_id ON form_templates(company_id);
CREATE INDEX idx_form_templates_status ON form_templates(status);
CREATE INDEX idx_form_templates_slug ON form_templates(slug);
CREATE INDEX idx_form_templates_cor_element ON form_templates(cor_element);
CREATE INDEX idx_form_template_versions_template_id ON form_template_versions(template_id);
CREATE INDEX idx_form_template_assignments_template_id ON form_template_assignments(template_id);
CREATE INDEX idx_form_template_assignments_company_id ON form_template_assignments(company_id);

-- ============================================================================
-- 7. CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_form_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_templates_updated_at
    BEFORE UPDATE ON form_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_form_template_timestamp();

-- ============================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_template_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. CREATE RLS POLICIES FOR FORM_TEMPLATES
-- ============================================================================

-- SELECT: Users can see templates for their company OR system templates (company_id IS NULL)
CREATE POLICY "form_templates_select_policy" ON form_templates
    FOR SELECT
    USING (
        company_id IS NULL 
        OR company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Admin+ can create templates for their company
CREATE POLICY "form_templates_insert_policy" ON form_templates
    FOR INSERT
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

-- UPDATE: Admin+ can update templates for their company
CREATE POLICY "form_templates_update_policy" ON form_templates
    FOR UPDATE
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

-- DELETE: Only admin can delete templates
CREATE POLICY "form_templates_delete_policy" ON form_templates
    FOR DELETE
    USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );

-- ============================================================================
-- 10. CREATE RLS POLICIES FOR FORM_TEMPLATE_VERSIONS
-- ============================================================================

CREATE POLICY "form_template_versions_select_policy" ON form_template_versions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = template_id
            AND (ft.company_id IS NULL OR ft.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "form_template_versions_insert_policy" ON form_template_versions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_templates ft
            WHERE ft.id = template_id
            AND ((ft.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor')) OR is_super_admin())
        )
    );

-- ============================================================================
-- 11. CREATE RLS POLICIES FOR FORM_TEMPLATE_ASSIGNMENTS
-- ============================================================================

CREATE POLICY "form_template_assignments_select_policy" ON form_template_assignments
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

CREATE POLICY "form_template_assignments_insert_policy" ON form_template_assignments
    FOR INSERT
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor', 'supervisor'))
        OR is_super_admin()
    );

CREATE POLICY "form_template_assignments_update_policy" ON form_template_assignments
    FOR UPDATE
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor', 'supervisor'))
        OR is_super_admin()
    );

CREATE POLICY "form_template_assignments_delete_policy" ON form_template_assignments
    FOR DELETE
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR is_super_admin()
    );

-- ============================================================================
-- 12. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON TYPE form_field_type TO authenticated;
GRANT USAGE ON TYPE form_template_status TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON form_templates TO authenticated;
GRANT SELECT, INSERT ON form_template_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON form_template_assignments TO authenticated;

-- ============================================================================
-- 13. INSERT SYSTEM TEMPLATES (available to all companies)
-- ============================================================================

-- Pre-Task Hazard Assessment Template (COR Element 3)
INSERT INTO form_templates (id, company_id, name, slug, description, icon, cor_element, audit_category, status, schema, settings)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    NULL, -- System template
    'Pre-Task Hazard Assessment',
    'pre-task-hazard-assessment',
    'Daily pre-task hazard identification and control planning',
    '⚠️',
    'element_3',
    'Hazard Identification',
    'published',
    '{
        "fields": [
            {
                "id": "jobsite_id",
                "type": "jobsite_select",
                "label": "Jobsite",
                "required": true,
                "order": 1
            },
            {
                "id": "date",
                "type": "date",
                "label": "Date",
                "required": true,
                "default": "today",
                "order": 2
            },
            {
                "id": "time",
                "type": "time",
                "label": "Time",
                "required": true,
                "default": "now",
                "order": 3
            },
            {
                "id": "weather",
                "type": "weather",
                "label": "Weather Conditions",
                "required": true,
                "order": 4
            },
            {
                "id": "temperature",
                "type": "temperature",
                "label": "Temperature (°C)",
                "required": false,
                "order": 5
            },
            {
                "id": "hazards",
                "type": "checkbox_group",
                "label": "Hazards Identified",
                "required": true,
                "options": [
                    {"value": "slips_trips_falls", "label": "Slips/Trips/Falls"},
                    {"value": "working_at_heights", "label": "Working at Heights"},
                    {"value": "confined_spaces", "label": "Confined Spaces"},
                    {"value": "electrical_hazards", "label": "Electrical Hazards"},
                    {"value": "heavy_equipment", "label": "Heavy Equipment"},
                    {"value": "overhead_work", "label": "Overhead Work"},
                    {"value": "excavation", "label": "Excavation"},
                    {"value": "other", "label": "Other"}
                ],
                "order": 6
            },
            {
                "id": "other_hazard",
                "type": "text",
                "label": "Describe Other Hazard",
                "required": false,
                "showWhen": {"field": "hazards", "contains": "other"},
                "order": 7
            },
            {
                "id": "controls",
                "type": "repeater",
                "label": "Control Measures",
                "required": true,
                "minItems": 1,
                "fields": [
                    {"id": "hazard", "type": "text", "label": "Hazard"},
                    {"id": "control", "type": "textarea", "label": "Control Measure"}
                ],
                "order": 8
            },
            {
                "id": "notes",
                "type": "textarea",
                "label": "Additional Notes",
                "required": false,
                "order": 9
            },
            {
                "id": "worker_signature",
                "type": "signature",
                "label": "Worker Signature",
                "required": true,
                "order": 10
            },
            {
                "id": "supervisor_signature",
                "type": "signature",
                "label": "Supervisor Signature",
                "required": false,
                "order": 11
            },
            {
                "id": "photos",
                "type": "photo",
                "label": "Photos",
                "required": false,
                "multiple": true,
                "maxCount": 5,
                "order": 12
            },
            {
                "id": "gps",
                "type": "gps",
                "label": "Location",
                "required": false,
                "auto_capture": true,
                "order": 13
            }
        ],
        "sections": [
            {"id": "location", "title": "Location & Conditions", "fields": ["jobsite_id", "date", "time", "weather", "temperature"]},
            {"id": "hazards", "title": "Hazard Identification", "fields": ["hazards", "other_hazard"]},
            {"id": "controls", "title": "Control Measures", "fields": ["controls", "notes"]},
            {"id": "signatures", "title": "Sign-Off", "fields": ["worker_signature", "supervisor_signature"]},
            {"id": "evidence", "title": "Evidence", "fields": ["photos", "gps"]}
        ]
    }',
    '{
        "require_signature": true,
        "require_gps": true,
        "allow_photos": true,
        "max_photos": 5,
        "auto_save_interval": 30000,
        "allow_draft": true,
        "require_supervisor_signature": false,
        "offline_enabled": true,
        "sync_priority": 2
    }'
);

-- Site Inspection Template (COR Element 7)
INSERT INTO form_templates (id, company_id, name, slug, description, icon, cor_element, audit_category, status, schema, settings)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    NULL,
    'Site Safety Inspection',
    'site-inspection',
    'Weekly site safety inspection checklist',
    '🔍',
    'element_7',
    'Inspections',
    'published',
    '{
        "fields": [
            {
                "id": "inspection_type",
                "type": "select",
                "label": "Inspection Type",
                "required": true,
                "options": [
                    {"value": "daily", "label": "Daily"},
                    {"value": "weekly", "label": "Weekly"},
                    {"value": "monthly", "label": "Monthly"},
                    {"value": "pre_start", "label": "Pre-Start"}
                ],
                "order": 1
            },
            {
                "id": "jobsite_id",
                "type": "jobsite_select",
                "label": "Jobsite",
                "required": true,
                "order": 2
            },
            {
                "id": "date",
                "type": "date",
                "label": "Date",
                "required": true,
                "default": "today",
                "order": 3
            },
            {
                "id": "inspector_id",
                "type": "worker_select",
                "label": "Inspector",
                "required": true,
                "order": 4
            },
            {
                "id": "housekeeping",
                "type": "checklist",
                "label": "Housekeeping",
                "required": true,
                "items": [
                    {"id": "walkways_clear", "label": "Walkways clear of obstructions"},
                    {"id": "materials_stored", "label": "Materials properly stored"},
                    {"id": "waste_disposed", "label": "Waste disposed of properly"},
                    {"id": "spills_cleaned", "label": "Spills cleaned up"}
                ],
                "order": 5
            },
            {
                "id": "fire_safety",
                "type": "checklist",
                "label": "Fire Safety",
                "required": true,
                "items": [
                    {"id": "extinguishers", "label": "Fire extinguishers accessible and charged"},
                    {"id": "exits_clear", "label": "Emergency exits clear"},
                    {"id": "no_smoking", "label": "No smoking in restricted areas"},
                    {"id": "flammables_stored", "label": "Flammable materials properly stored"}
                ],
                "order": 6
            },
            {
                "id": "ppe",
                "type": "checklist",
                "label": "PPE Compliance",
                "required": true,
                "items": [
                    {"id": "hard_hats", "label": "Hard hats worn where required"},
                    {"id": "safety_glasses", "label": "Safety glasses worn where required"},
                    {"id": "hi_vis", "label": "High-visibility vests worn"},
                    {"id": "safety_footwear", "label": "Safety footwear worn"}
                ],
                "order": 7
            },
            {
                "id": "hazards_found",
                "type": "repeater",
                "label": "Hazards Identified",
                "required": false,
                "fields": [
                    {"id": "description", "type": "text", "label": "Description"},
                    {"id": "severity", "type": "select", "label": "Severity", "options": [
                        {"value": "low", "label": "Low"},
                        {"value": "medium", "label": "Medium"},
                        {"value": "high", "label": "High"},
                        {"value": "critical", "label": "Critical"}
                    ]},
                    {"id": "action", "type": "textarea", "label": "Corrective Action"},
                    {"id": "photo", "type": "photo", "label": "Photo"}
                ],
                "order": 8
            },
            {
                "id": "overall_rating",
                "type": "rating",
                "label": "Overall Site Rating",
                "required": true,
                "max": 5,
                "order": 9
            },
            {
                "id": "notes",
                "type": "textarea",
                "label": "Additional Notes",
                "required": false,
                "order": 10
            },
            {
                "id": "inspector_signature",
                "type": "signature",
                "label": "Inspector Signature",
                "required": true,
                "order": 11
            }
        ],
        "sections": [
            {"id": "info", "title": "Inspection Info", "fields": ["inspection_type", "jobsite_id", "date", "inspector_id"]},
            {"id": "checklist", "title": "Inspection Checklist", "fields": ["housekeeping", "fire_safety", "ppe"]},
            {"id": "hazards", "title": "Hazards Found", "fields": ["hazards_found"]},
            {"id": "summary", "title": "Summary", "fields": ["overall_rating", "notes", "inspector_signature"]}
        ]
    }',
    '{
        "require_signature": true,
        "require_gps": true,
        "allow_photos": true,
        "max_photos": 20,
        "auto_save_interval": 30000,
        "allow_draft": true,
        "offline_enabled": true,
        "sync_priority": 2
    }'
);

-- Incident Report Template (COR Element 10)
INSERT INTO form_templates (id, company_id, name, slug, description, icon, cor_element, audit_category, status, schema, settings)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    NULL,
    'Incident Report',
    'incident-report',
    'Report workplace incidents, injuries, and near misses',
    '🚨',
    'element_10',
    'Incident Investigation',
    'published',
    '{
        "fields": [
            {
                "id": "incident_type",
                "type": "select",
                "label": "Incident Type",
                "required": true,
                "options": [
                    {"value": "injury", "label": "Injury"},
                    {"value": "near_miss", "label": "Near Miss"},
                    {"value": "property_damage", "label": "Property Damage"},
                    {"value": "environmental", "label": "Environmental"}
                ],
                "order": 1
            },
            {
                "id": "incident_date",
                "type": "date",
                "label": "Date of Incident",
                "required": true,
                "order": 2
            },
            {
                "id": "incident_time",
                "type": "time",
                "label": "Time of Incident",
                "required": true,
                "order": 3
            },
            {
                "id": "jobsite_id",
                "type": "jobsite_select",
                "label": "Jobsite",
                "required": true,
                "order": 4
            },
            {
                "id": "specific_location",
                "type": "text",
                "label": "Specific Location",
                "required": true,
                "placeholder": "e.g., North building, 2nd floor",
                "order": 5
            },
            {
                "id": "injured_worker_id",
                "type": "worker_select",
                "label": "Injured Worker",
                "required": false,
                "showWhen": {"field": "incident_type", "equals": "injury"},
                "order": 6
            },
            {
                "id": "body_parts",
                "type": "body_diagram",
                "label": "Injured Body Parts",
                "required": false,
                "showWhen": {"field": "incident_type", "equals": "injury"},
                "order": 7
            },
            {
                "id": "description",
                "type": "textarea",
                "label": "Description of Incident",
                "required": true,
                "minLength": 50,
                "placeholder": "Describe what happened in detail...",
                "order": 8
            },
            {
                "id": "first_aid_given",
                "type": "yes_no",
                "label": "Was First Aid Given?",
                "required": true,
                "showWhen": {"field": "incident_type", "equals": "injury"},
                "order": 9
            },
            {
                "id": "medical_treatment",
                "type": "yes_no",
                "label": "Medical Treatment Required?",
                "required": true,
                "showWhen": {"field": "incident_type", "equals": "injury"},
                "order": 10
            },
            {
                "id": "witnesses",
                "type": "repeater",
                "label": "Witnesses",
                "required": false,
                "fields": [
                    {"id": "name", "type": "text", "label": "Name"},
                    {"id": "statement", "type": "textarea", "label": "Statement"}
                ],
                "order": 11
            },
            {
                "id": "immediate_cause",
                "type": "radio",
                "label": "Immediate Cause",
                "required": true,
                "options": [
                    {"value": "unsafe_act", "label": "Unsafe Act"},
                    {"value": "unsafe_condition", "label": "Unsafe Condition"},
                    {"value": "both", "label": "Both"}
                ],
                "order": 12
            },
            {
                "id": "immediate_actions",
                "type": "textarea",
                "label": "Immediate Actions Taken",
                "required": true,
                "order": 13
            },
            {
                "id": "corrective_actions",
                "type": "textarea",
                "label": "Recommended Corrective Actions",
                "required": true,
                "order": 14
            },
            {
                "id": "photos",
                "type": "photo",
                "label": "Incident Photos",
                "required": false,
                "multiple": true,
                "maxCount": 10,
                "order": 15
            },
            {
                "id": "reporter_signature",
                "type": "signature",
                "label": "Reporter Signature",
                "required": true,
                "order": 16
            },
            {
                "id": "supervisor_signature",
                "type": "signature",
                "label": "Supervisor Signature",
                "required": true,
                "order": 17
            }
        ],
        "sections": [
            {"id": "basic", "title": "Incident Details", "fields": ["incident_type", "incident_date", "incident_time", "jobsite_id", "specific_location"]},
            {"id": "injury", "title": "Injury Details", "fields": ["injured_worker_id", "body_parts", "first_aid_given", "medical_treatment"]},
            {"id": "description", "title": "Description", "fields": ["description", "witnesses"]},
            {"id": "analysis", "title": "Analysis & Actions", "fields": ["immediate_cause", "immediate_actions", "corrective_actions"]},
            {"id": "evidence", "title": "Evidence", "fields": ["photos"]},
            {"id": "signatures", "title": "Sign-Off", "fields": ["reporter_signature", "supervisor_signature"]}
        ]
    }',
    '{
        "require_signature": true,
        "require_gps": true,
        "allow_photos": true,
        "max_photos": 10,
        "auto_save_interval": 30000,
        "allow_draft": true,
        "require_supervisor_signature": true,
        "offline_enabled": true,
        "sync_priority": 1
    }'
);

-- Toolbox Talk Template (COR Element 8)
INSERT INTO form_templates (id, company_id, name, slug, description, icon, cor_element, audit_category, status, schema, settings)
VALUES (
    'a0000000-0000-0000-0000-000000000004',
    NULL,
    'Toolbox Talk',
    'toolbox-talk',
    'Document safety toolbox talks and worker attendance',
    '🗣️',
    'element_8',
    'Training & Communication',
    'published',
    '{
        "fields": [
            {
                "id": "topic",
                "type": "select",
                "label": "Topic",
                "required": true,
                "allowCustom": true,
                "options": [
                    {"value": "ppe", "label": "Personal Protective Equipment"},
                    {"value": "fall_protection", "label": "Fall Protection"},
                    {"value": "ladder_safety", "label": "Ladder Safety"},
                    {"value": "electrical_safety", "label": "Electrical Safety"},
                    {"value": "heat_stress", "label": "Heat Stress Prevention"},
                    {"value": "cold_weather", "label": "Cold Weather Safety"},
                    {"value": "housekeeping", "label": "Workplace Housekeeping"},
                    {"value": "fire_safety", "label": "Fire Safety"},
                    {"value": "manual_handling", "label": "Manual Material Handling"},
                    {"value": "other", "label": "Other"}
                ],
                "order": 1
            },
            {
                "id": "custom_topic",
                "type": "text",
                "label": "Custom Topic",
                "required": false,
                "showWhen": {"field": "topic", "equals": "other"},
                "order": 2
            },
            {
                "id": "date",
                "type": "date",
                "label": "Date",
                "required": true,
                "default": "today",
                "order": 3
            },
            {
                "id": "time_started",
                "type": "time",
                "label": "Start Time",
                "required": true,
                "order": 4
            },
            {
                "id": "duration_minutes",
                "type": "number",
                "label": "Duration (minutes)",
                "required": true,
                "min": 5,
                "max": 120,
                "order": 5
            },
            {
                "id": "jobsite_id",
                "type": "jobsite_select",
                "label": "Jobsite",
                "required": true,
                "order": 6
            },
            {
                "id": "presenter_id",
                "type": "worker_select",
                "label": "Presenter",
                "required": true,
                "order": 7
            },
            {
                "id": "key_messages",
                "type": "textarea",
                "label": "Key Messages Covered",
                "required": true,
                "minLength": 50,
                "order": 8
            },
            {
                "id": "questions_asked",
                "type": "textarea",
                "label": "Questions Asked",
                "required": false,
                "order": 9
            },
            {
                "id": "concerns_raised",
                "type": "textarea",
                "label": "Concerns Raised",
                "required": false,
                "order": 10
            },
            {
                "id": "attendees",
                "type": "repeater",
                "label": "Attendees",
                "required": true,
                "minItems": 1,
                "fields": [
                    {"id": "worker_id", "type": "worker_select", "label": "Worker"},
                    {"id": "signature", "type": "signature", "label": "Signature"}
                ],
                "order": 11
            },
            {
                "id": "presenter_signature",
                "type": "signature",
                "label": "Presenter Signature",
                "required": true,
                "order": 12
            },
            {
                "id": "photos",
                "type": "photo",
                "label": "Photos",
                "required": false,
                "multiple": true,
                "maxCount": 5,
                "order": 13
            }
        ],
        "sections": [
            {"id": "info", "title": "Meeting Info", "fields": ["topic", "custom_topic", "date", "time_started", "duration_minutes", "jobsite_id", "presenter_id"]},
            {"id": "content", "title": "Content Covered", "fields": ["key_messages", "questions_asked", "concerns_raised"]},
            {"id": "attendance", "title": "Attendance", "fields": ["attendees"]},
            {"id": "signoff", "title": "Sign-Off", "fields": ["presenter_signature", "photos"]}
        ]
    }',
    '{
        "require_signature": true,
        "require_gps": false,
        "allow_photos": true,
        "max_photos": 5,
        "auto_save_interval": 30000,
        "allow_draft": true,
        "offline_enabled": true,
        "sync_priority": 2
    }'
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
