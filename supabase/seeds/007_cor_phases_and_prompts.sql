-- ============================================================================
-- COR Phases and Prompts Seed Data
-- ============================================================================
-- This seed file populates the 12 phases and their associated prompts
-- ============================================================================

-- ============================================================================
-- PHASE 1: Company Onboarding (Prompts 1-3)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(1, 'Company Onboarding', 'Initial company setup and registration process', 1, 1)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order
RETURNING id INTO TEMP phase1_id;

-- Get phase 1 ID
DO $$
DECLARE
    v_phase1_id UUID;
BEGIN
    SELECT id INTO v_phase1_id FROM cor_phases WHERE phase_number = 1;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase1_id, 1, 'Company Registration', 'Complete company registration with WSIB number and company details', 'form', 1),
    (v_phase1_id, 2, 'Admin Account Setup', 'Set up administrator account and profile', 'task', 2),
    (v_phase1_id, 3, 'Company Profile Completion', 'Complete company profile with all required information', 'form', 3)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 2: Team Setup & Roles (Prompts 4-6)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(2, 'Team Setup & Roles', 'Configure team structure and assign roles', 2, 2)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase2_id UUID;
BEGIN
    SELECT id INTO v_phase2_id FROM cor_phases WHERE phase_number = 2;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase2_id, 4, 'Create User Roles', 'Define and configure user roles (Admin, Supervisor, Worker, etc.)', 'task', 1),
    (v_phase2_id, 5, 'Invite Team Members', 'Invite team members and assign appropriate roles', 'task', 2),
    (v_phase2_id, 6, 'Verify Team Access', 'Verify all team members have correct access permissions', 'review', 3)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 3: Safety Program Setup (Prompts 7-10)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(3, 'Safety Program Setup', 'Establish core safety program elements', 5, 3)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase3_id UUID;
BEGIN
    SELECT id INTO v_phase3_id FROM cor_phases WHERE phase_number = 3;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase3_id, 7, 'Safety Policy Creation', 'Create and document company safety policy', 'form', 1),
    (v_phase3_id, 8, 'Hazard Identification Setup', 'Set up hazard identification and assessment procedures', 'task', 2),
    (v_phase3_id, 9, 'Incident Reporting Procedures', 'Establish incident reporting and investigation procedures', 'form', 3),
    (v_phase3_id, 10, 'Emergency Response Plan', 'Create emergency response and evacuation procedures', 'form', 4)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 4: Daily Operations (Prompts 11-15)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(4, 'Daily Operations', 'Set up daily operational safety procedures', 3, 4)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase4_id UUID;
BEGIN
    SELECT id INTO v_phase4_id FROM cor_phases WHERE phase_number = 4;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase4_id, 11, 'Daily Safety Meetings', 'Set up daily safety meeting procedures and templates', 'form', 1),
    (v_phase4_id, 12, 'Pre-Shift Inspections', 'Configure pre-shift inspection forms and procedures', 'form', 2),
    (v_phase4_id, 13, 'Toolbox Talks', 'Set up toolbox talk templates and scheduling', 'form', 3),
    (v_phase4_id, 14, 'Work Permits System', 'Establish work permit procedures for high-risk activities', 'form', 4),
    (v_phase4_id, 15, 'Daily Reporting', 'Configure daily safety reporting and tracking', 'form', 5)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 5: Document Management (Prompts 16-18)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(5, 'Document Management', 'Set up document control and management system', 3, 5)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase5_id UUID;
BEGIN
    SELECT id INTO v_phase5_id FROM cor_phases WHERE phase_number = 5;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase5_id, 16, 'Document Control System', 'Set up document control procedures and versioning', 'task', 1),
    (v_phase5_id, 17, 'Upload Safety Documents', 'Upload and organize safety manuals, procedures, and policies', 'upload', 2),
    (v_phase5_id, 18, 'Document Distribution', 'Configure document distribution and acknowledgment system', 'task', 3)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 6: Worker Certifications (Prompts 19-21)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(6, 'Worker Certifications', 'Set up worker certification and training tracking', 4, 6)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase6_id UUID;
BEGIN
    SELECT id INTO v_phase6_id FROM cor_phases WHERE phase_number = 6;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase6_id, 19, 'Certification Types Setup', 'Define required certification types for workers', 'task', 1),
    (v_phase6_id, 20, 'Upload Worker Certifications', 'Upload and track worker certifications and training records', 'upload', 2),
    (v_phase6_id, 21, 'Certification Expiry Alerts', 'Configure certification expiry alerts and notifications', 'task', 3)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 7: Equipment & Maintenance (Prompts 22-24)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(7, 'Equipment & Maintenance', 'Set up equipment inventory and maintenance tracking', 3, 7)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase7_id UUID;
BEGIN
    SELECT id INTO v_phase7_id FROM cor_phases WHERE phase_number = 7;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase7_id, 22, 'Equipment Inventory', 'Create equipment inventory and register all equipment', 'form', 1),
    (v_phase7_id, 23, 'Maintenance Schedules', 'Set up preventive maintenance schedules and procedures', 'form', 2),
    (v_phase7_id, 24, 'Inspection Records', 'Configure equipment inspection forms and tracking', 'form', 3)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 8: Forms & Inspections (Prompts 25-30)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(8, 'Forms & Inspections', 'Configure safety forms and inspection procedures', 5, 8)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase8_id UUID;
BEGIN
    SELECT id INTO v_phase8_id FROM cor_phases WHERE phase_number = 8;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase8_id, 25, 'Safety Inspection Forms', 'Create and configure safety inspection form templates', 'form', 1),
    (v_phase8_id, 26, 'Hazard Assessment Forms', 'Set up hazard assessment and JHA forms', 'form', 2),
    (v_phase8_id, 27, 'Incident Report Forms', 'Configure incident report forms and workflows', 'form', 3),
    (v_phase8_id, 28, 'Near Miss Forms', 'Set up near miss reporting forms', 'form', 4),
    (v_phase8_id, 29, 'Corrective Action Forms', 'Create corrective action and follow-up forms', 'form', 5),
    (v_phase8_id, 30, 'Form Workflow Testing', 'Test all form workflows and ensure proper routing', 'review', 6)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 9: Incident Management (Prompts 31-33)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(9, 'Incident Management', 'Establish incident management and investigation procedures', 4, 9)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase9_id UUID;
BEGIN
    SELECT id INTO v_phase9_id FROM cor_phases WHERE phase_number = 9;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase9_id, 31, 'Incident Reporting Procedures', 'Document incident reporting procedures and requirements', 'form', 1),
    (v_phase9_id, 32, 'Investigation Process', 'Set up incident investigation process and templates', 'form', 2),
    (v_phase9_id, 33, 'Root Cause Analysis', 'Configure root cause analysis procedures and tools', 'form', 3)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 10: Audit Preparation (Prompts 34-38)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(10, 'Audit Preparation', 'Prepare for COR certification audit', 7, 10)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase10_id UUID;
BEGIN
    SELECT id INTO v_phase10_id FROM cor_phases WHERE phase_number = 10;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase10_id, 34, 'Audit Checklist Review', 'Review and prepare audit checklist requirements', 'review', 1),
    (v_phase10_id, 35, 'Evidence Collection', 'Collect and organize evidence for audit elements', 'task', 2),
    (v_phase10_id, 36, 'Documentation Review', 'Review all documentation for completeness and accuracy', 'review', 3),
    (v_phase10_id, 37, 'Gap Analysis', 'Conduct gap analysis and identify areas needing improvement', 'review', 4),
    (v_phase10_id, 38, 'Pre-Audit Action Plan', 'Create action plan to address identified gaps', 'form', 5)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 11: Mock Audit (Prompts 39-41)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(11, 'Mock Audit', 'Conduct internal mock audit to prepare for certification', 5, 11)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase11_id UUID;
BEGIN
    SELECT id INTO v_phase11_id FROM cor_phases WHERE phase_number = 11;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase11_id, 39, 'Mock Audit Planning', 'Plan and schedule internal mock audit', 'task', 1),
    (v_phase11_id, 40, 'Mock Audit Execution', 'Conduct mock audit using audit dashboard and tools', 'review', 2),
    (v_phase11_id, 41, 'Mock Audit Review', 'Review mock audit results and create improvement plan', 'review', 3)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;

-- ============================================================================
-- PHASE 12: Certification & Reporting (Prompts 42-45)
-- ============================================================================

INSERT INTO cor_phases (phase_number, title, description, estimated_duration_days, display_order) VALUES
(12, 'Certification & Reporting', 'Complete certification process and establish reporting', 3, 12)
ON CONFLICT (phase_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_phase12_id UUID;
BEGIN
    SELECT id INTO v_phase12_id FROM cor_phases WHERE phase_number = 12;
    
    INSERT INTO cor_prompts (phase_id, prompt_number, title, description, prompt_type, display_order) VALUES
    (v_phase12_id, 42, 'Final Audit Preparation', 'Complete final preparations for certification audit', 'review', 1),
    (v_phase12_id, 43, 'Certification Audit', 'Schedule and complete certification audit', 'review', 2),
    (v_phase12_id, 44, 'Reporting Setup', 'Set up ongoing reporting and compliance monitoring', 'task', 3),
    (v_phase12_id, 45, 'Continuous Improvement', 'Establish continuous improvement processes', 'form', 4)
    ON CONFLICT (phase_id, prompt_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_type = EXCLUDED.prompt_type,
        display_order = EXCLUDED.display_order;
END $$;
