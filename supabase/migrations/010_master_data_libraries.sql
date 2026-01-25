-- ============================================================================
-- MASTER DATA LIBRARIES - COMPREHENSIVE SCHEMA
-- ============================================================================
-- This migration creates the 7 core master data libraries for COR compliance:
--
-- 1. HAZARD LIBRARY - 500+ pre-loaded construction hazards by trade
-- 2. EQUIPMENT INVENTORY - Company equipment tracking with inspections
-- 3. JOB/TASK LIBRARY - Standard tasks by trade with hazard assessments
-- 4. EMPLOYEE DIRECTORY - Enhanced worker profiles with competencies
-- 5. JOBSITE REGISTRY - Active projects with site-specific info
-- 6. LEGISLATIVE LIBRARY - Ontario OHSA, O. Reg. 213/91, O. Reg. 851
-- 7. SDS LIBRARY - Safety Data Sheets with WHMIS 2015 classifications
--
-- ============================================================================

-- ============================================================================
-- 1. HAZARD LIBRARY
-- ============================================================================
-- Master list of hazards categorized by trade/activity with pre-mapped
-- controls, PPE requirements, and risk ratings

-- Hazard categories enum
CREATE TYPE hazard_category AS ENUM (
    'physical',           -- Noise, vibration, temperature extremes
    'chemical',           -- Dust, fumes, solvents, gases
    'biological',         -- Mold, bacteria, viruses
    'ergonomic',          -- Repetitive motion, awkward postures
    'psychosocial',       -- Stress, harassment, fatigue
    'electrical',         -- Live circuits, static, lightning
    'mechanical',         -- Moving parts, pinch points, entanglement
    'fall',               -- Working at heights, slips/trips
    'struck_by',          -- Falling objects, flying debris
    'caught_in',          -- Machinery, cave-ins, collapsing structures
    'environmental',      -- Weather, wildlife, terrain
    'fire_explosion',     -- Flammable materials, hot work
    'confined_space',     -- Low oxygen, toxic atmosphere
    'radiation',          -- UV, welding arc, x-ray
    'other'               -- Miscellaneous hazards
);

-- Risk level enum
CREATE TYPE risk_level AS ENUM (
    'negligible',         -- Risk Score 1-4: Green
    'low',                -- Risk Score 5-9: Yellow
    'medium',             -- Risk Score 10-14: Orange
    'high',               -- Risk Score 15-19: Red
    'critical'            -- Risk Score 20-25: Black
);

-- Hierarchy of controls type
CREATE TYPE control_type AS ENUM (
    'elimination',        -- Remove the hazard entirely
    'substitution',       -- Replace with less hazardous alternative
    'engineering',        -- Isolate people from the hazard
    'administrative',     -- Change the way people work
    'ppe'                 -- Personal Protective Equipment
);

-- Master hazard library table
CREATE TABLE hazard_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Global (NULL) or company-specific hazards
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Hazard identification
    hazard_code TEXT NOT NULL,              -- e.g., "HAZ-FALL-001"
    name TEXT NOT NULL,                     -- e.g., "Falls from ladders"
    description TEXT,                       -- Detailed hazard description
    
    -- Classification
    category hazard_category NOT NULL,
    subcategory TEXT,                       -- More specific classification
    
    -- Trade/Activity associations
    -- Format: ["Concrete", "Formwork", "General Construction"]
    applicable_trades TEXT[] DEFAULT ARRAY[]::TEXT[],
    applicable_activities TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Pre-calculated risk rating (can be overridden in assessments)
    default_severity INTEGER CHECK (default_severity >= 1 AND default_severity <= 5),
    default_likelihood INTEGER CHECK (default_likelihood >= 1 AND default_likelihood <= 5),
    default_risk_score INTEGER GENERATED ALWAYS AS (default_severity * default_likelihood) STORED,
    default_risk_level risk_level,
    
    -- Pre-mapped controls (JSON array of controls)
    -- Format: [{"type": "engineering", "control": "Install guardrails", "required": true}, ...]
    recommended_controls JSONB DEFAULT '[]'::jsonb,
    
    -- Pre-mapped PPE requirements
    -- Format: ["Hard Hat", "Safety Glasses", "Fall Arrest Harness"]
    required_ppe TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Regulatory references
    -- Format: [{"regulation": "O. Reg. 213/91", "section": "26.3", "title": "Guardrails"}]
    regulatory_references JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_global BOOLEAN GENERATED ALWAYS AS (company_id IS NULL) STORED,
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Unique hazard code per company (global hazards have NULL company_id)
    UNIQUE(company_id, hazard_code)
);

COMMENT ON TABLE hazard_library IS 'Master hazard library with pre-mapped controls and PPE';
COMMENT ON COLUMN hazard_library.default_risk_score IS 'Auto-calculated: severity × likelihood (1-25)';
COMMENT ON COLUMN hazard_library.recommended_controls IS 'JSON array of control measures using hierarchy of controls';

-- Control measures lookup table (for consistent dropdown options)
CREATE TABLE control_measures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    control_type control_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Where this control applies
    applicable_categories hazard_category[] DEFAULT ARRAY[]::hazard_category[],
    applicable_trades TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Effectiveness rating (1-5)
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(company_id, control_type, name)
);

COMMENT ON TABLE control_measures IS 'Standard control measures for consistent selection in hazard assessments';

-- PPE types lookup table
CREATE TABLE ppe_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,                     -- e.g., "Hard Hat"
    category TEXT NOT NULL,                 -- e.g., "Head Protection"
    description TEXT,
    
    -- Standards/certifications
    standards TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g., ["CSA Z94.1-15"]
    
    -- Typical situations requiring this PPE
    typical_hazards hazard_category[] DEFAULT ARRAY[]::hazard_category[],
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(company_id, name)
);

COMMENT ON TABLE ppe_types IS 'Standard PPE types for consistent selection';


-- ============================================================================
-- 2. EQUIPMENT INVENTORY
-- ============================================================================
-- Complete equipment tracking with inspection schedules and maintenance history

-- Equipment status enum
CREATE TYPE equipment_status AS ENUM (
    'available',          -- Ready for use
    'in_use',             -- Currently deployed
    'under_inspection',   -- Being inspected
    'under_maintenance',  -- Being repaired
    'out_of_service',     -- Not usable
    'retired',            -- Permanently removed from service
    'lost'                -- Cannot be located
);

-- Equipment categories enum
CREATE TYPE equipment_category AS ENUM (
    'fall_protection',    -- Harnesses, lanyards, anchors
    'lifting',            -- Cranes, hoists, forklifts
    'scaffolding',        -- Frames, planks, accessories
    'ladders',            -- Step, extension, platform
    'power_tools',        -- Drills, saws, grinders
    'hand_tools',         -- Hammers, wrenches, screwdrivers
    'ppe',                -- Hard hats, glasses, gloves
    'respiratory',        -- Masks, respirators, SCBA
    'electrical',         -- Extension cords, GFCIs, panels
    'vehicles',           -- Trucks, trailers, equipment
    'heavy_equipment',    -- Excavators, loaders, dozers
    'confined_space',     -- Monitors, ventilation, rescue
    'fire_safety',        -- Extinguishers, blankets, alarms
    'first_aid',          -- Kits, AEDs, stretchers
    'communication',      -- Radios, phones, signage
    'measurement',        -- Meters, gauges, detectors
    'other'               -- Miscellaneous equipment
);

-- Main equipment inventory table
CREATE TABLE equipment_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Equipment identification
    equipment_number TEXT NOT NULL,         -- Company asset tag
    name TEXT NOT NULL,                     -- e.g., "3M DBI-SALA ExoFit NEX Harness"
    description TEXT,
    
    -- Classification
    category equipment_category NOT NULL,
    subcategory TEXT,                       -- More specific type
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    
    -- Purchase/Warranty info
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    warranty_expiry DATE,
    supplier TEXT,
    
    -- Lifecycle dates
    manufacture_date DATE,
    first_in_service_date DATE,
    expected_life_years INTEGER,
    retirement_date DATE,                   -- When to retire (calculated or manual)
    
    -- Current status and location
    status equipment_status NOT NULL DEFAULT 'available',
    current_location TEXT,                  -- Building, room, or jobsite
    current_jobsite_id UUID,                -- If deployed to a jobsite
    assigned_to UUID REFERENCES workers(id), -- If assigned to a worker
    
    -- Inspection requirements
    inspection_frequency_days INTEGER,       -- How often to inspect
    last_inspection_date DATE,
    next_inspection_due DATE,
    inspection_form_template_id UUID REFERENCES form_templates(id),
    
    -- Certifications (for equipment requiring certification)
    requires_certification BOOLEAN DEFAULT false,
    certification_expiry DATE,
    certification_number TEXT,
    certifying_body TEXT,
    
    -- Documentation
    -- Format: [{"name": "Manual", "path": "...", "uploaded_at": "..."}, ...]
    documentation JSONB DEFAULT '[]'::jsonb,
    
    -- Photos
    photo_path TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(company_id, equipment_number)
);

COMMENT ON TABLE equipment_inventory IS 'Complete equipment inventory with inspection tracking';
COMMENT ON COLUMN equipment_inventory.next_inspection_due IS 'Auto-calculated or manually set inspection due date';

-- Equipment inspection records
CREATE TABLE equipment_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    
    -- Inspection details
    inspection_date DATE NOT NULL,
    inspection_type TEXT NOT NULL DEFAULT 'routine', -- routine, pre-use, post-incident, certification
    
    -- Inspector
    inspected_by UUID NOT NULL REFERENCES workers(id),
    
    -- Results
    result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'conditional')),
    
    -- Findings
    -- Format: [{"item": "Webbing condition", "status": "pass", "notes": ""}, ...]
    checklist_results JSONB DEFAULT '[]'::jsonb,
    deficiencies_found TEXT,
    corrective_actions TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT false,
    
    -- Documentation
    form_submission_id UUID REFERENCES form_submissions(id),
    photo_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Signatures
    inspector_signature TEXT,               -- Base64 encoded
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE equipment_inspections IS 'Equipment inspection history and records';

-- Equipment maintenance records
CREATE TABLE equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    
    -- Maintenance details
    maintenance_date DATE NOT NULL,
    maintenance_type TEXT NOT NULL,         -- preventive, corrective, calibration, repair
    description TEXT NOT NULL,
    
    -- Performed by
    performed_by TEXT,                      -- Name or company
    internal_technician UUID REFERENCES workers(id),
    
    -- Costs
    labor_cost DECIMAL(10, 2),
    parts_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0)) STORED,
    
    -- Parts replaced
    -- Format: [{"part": "Battery", "part_number": "ABC123", "cost": 45.00}, ...]
    parts_replaced JSONB DEFAULT '[]'::jsonb,
    
    -- Next maintenance
    next_maintenance_date DATE,
    
    -- Documentation
    work_order_number TEXT,
    vendor_invoice TEXT,
    documentation_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE equipment_maintenance IS 'Equipment maintenance and repair history';


-- ============================================================================
-- 3. JOB/TASK LIBRARY
-- ============================================================================
-- Standard tasks by trade with pre-built hazard assessments and competency requirements

-- Trade categories enum
CREATE TYPE trade_category AS ENUM (
    'concrete',           -- Concrete placement, finishing
    'formwork',           -- Form building, shoring
    'structural_steel',   -- Steel erection, welding
    'carpentry',          -- Rough and finish carpentry
    'masonry',            -- Brick, block, stone
    'roofing',            -- All roofing types
    'electrical',         -- Electrical systems
    'plumbing',           -- Plumbing systems
    'hvac',               -- Heating, ventilation, AC
    'insulation',         -- Thermal, acoustic insulation
    'drywall',            -- Drywall, taping, finishing
    'painting',           -- Painting, coating, finishing
    'flooring',           -- All flooring types
    'glazing',            -- Windows, glass, curtain wall
    'excavation',         -- Trenching, grading, earthwork
    'paving',             -- Asphalt, concrete paving
    'demolition',         -- Building demolition
    'scaffolding',        -- Scaffold erection/dismantling
    'crane_rigging',      -- Crane operation, rigging
    'landscaping',        -- Landscaping, hardscaping
    'general_labour',     -- General site work
    'supervision',        -- Site supervision
    'other'               -- Miscellaneous trades
);

-- Job/Task library table
CREATE TABLE job_task_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Global (NULL) or company-specific tasks
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Task identification
    task_code TEXT NOT NULL,                -- e.g., "CONC-POUR-001"
    name TEXT NOT NULL,                     -- e.g., "Concrete Slab Pour"
    description TEXT,                       -- Detailed task description
    
    -- Trade association
    trade trade_category NOT NULL,
    subtrade TEXT,                          -- More specific classification
    
    -- Task complexity
    complexity_level INTEGER CHECK (complexity_level >= 1 AND complexity_level <= 5),
    estimated_duration_hours DECIMAL(5, 2),
    
    -- Pre-built hazard assessment
    -- Format: [{"hazard_id": "uuid", "hazard_name": "...", "risk_level": "medium", "controls": [...]}]
    hazard_assessment JSONB DEFAULT '[]'::jsonb,
    
    -- Required competencies
    -- Format: ["Concrete Placement", "Working at Heights", "WHMIS"]
    required_competencies TEXT[] DEFAULT ARRAY[]::TEXT[],
    required_certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Required PPE
    required_ppe TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Required permits
    -- Format: ["Hot Work Permit", "Confined Space Entry"]
    required_permits TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Required equipment
    -- Format: [{"category": "fall_protection", "items": ["Harness", "Lanyard"]}]
    required_equipment JSONB DEFAULT '[]'::jsonb,
    
    -- Safe work procedures
    swp_document_id UUID REFERENCES documents(id),
    step_by_step_instructions TEXT,
    
    -- Regulatory requirements
    regulatory_references JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_global BOOLEAN GENERATED ALWAYS AS (company_id IS NULL) STORED,
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(company_id, task_code)
);

COMMENT ON TABLE job_task_library IS 'Standard tasks by trade with pre-built hazard assessments';
COMMENT ON COLUMN job_task_library.hazard_assessment IS 'Pre-populated hazard assessment template';

-- Task hazard mapping table (many-to-many relationship)
CREATE TABLE task_hazard_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES job_task_library(id) ON DELETE CASCADE,
    hazard_id UUID NOT NULL REFERENCES hazard_library(id) ON DELETE CASCADE,
    
    -- Context-specific overrides
    risk_level_override risk_level,
    additional_controls JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(task_id, hazard_id)
);

COMMENT ON TABLE task_hazard_mappings IS 'Links tasks to their associated hazards';


-- ============================================================================
-- 4. EMPLOYEE DIRECTORY ENHANCEMENTS
-- ============================================================================
-- Extend the existing workers table with competency tracking

-- Competency types enum
CREATE TYPE competency_type AS ENUM (
    'certification',      -- External certification (WHMIS, Working at Heights)
    'license',            -- Professional license
    'training',           -- Company training completed
    'skill',              -- Demonstrated skill/ability
    'authorization'       -- Company authorization (equipment operation)
);

-- Competency status enum
CREATE TYPE competency_status AS ENUM (
    'active',             -- Current and valid
    'expired',            -- Past expiry date
    'pending_renewal',    -- Coming up for renewal
    'revoked',            -- Manually revoked
    'in_progress'         -- Currently being obtained
);

-- Worker competencies table (extends existing certifications concept)
CREATE TABLE worker_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    
    -- Competency identification
    competency_type competency_type NOT NULL,
    name TEXT NOT NULL,                     -- e.g., "Working at Heights"
    
    -- Issuing information
    issuing_organization TEXT,              -- e.g., "Approved Training Provider"
    credential_number TEXT,
    
    -- Validity
    issue_date DATE,
    expiry_date DATE,
    renewal_reminder_days INTEGER DEFAULT 30,
    
    -- Status (can be auto-calculated or manually set)
    status competency_status NOT NULL DEFAULT 'active',
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    verification_method TEXT,               -- document, call, online_check
    
    -- Documentation
    document_path TEXT,                     -- Path to certificate/license scan
    
    -- COR Element mapping
    cor_element INTEGER CHECK (cor_element >= 1 AND cor_element <= 14),
    
    -- Notes
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(worker_id, competency_type, name)
);

COMMENT ON TABLE worker_competencies IS 'Worker certifications, licenses, training records, and competencies';
COMMENT ON COLUMN worker_competencies.renewal_reminder_days IS 'Days before expiry to send reminder';

-- Training records table
CREATE TABLE training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    
    -- Training identification
    training_name TEXT NOT NULL,
    training_code TEXT,                     -- Internal training code
    training_type TEXT,                     -- orientation, refresher, job_specific, regulatory
    
    -- Provider
    provider TEXT,                          -- Internal, external provider name
    trainer_name TEXT,
    
    -- Completion details
    training_date DATE NOT NULL,
    duration_hours DECIMAL(5, 2),
    location TEXT,
    format TEXT,                            -- classroom, online, hands_on, blended
    
    -- Assessment
    assessment_required BOOLEAN DEFAULT false,
    assessment_passed BOOLEAN,
    assessment_score DECIMAL(5, 2),
    
    -- Results
    competency_gained TEXT,                 -- Links to competency name
    
    -- Documentation
    certificate_path TEXT,
    attendance_verified BOOLEAN DEFAULT false,
    
    -- COR Element mapping
    cor_element INTEGER CHECK (cor_element >= 1 AND cor_element <= 14),
    
    -- Feedback form
    feedback_form_id UUID REFERENCES form_submissions(id),
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE training_records IS 'Detailed training records for each worker';


-- ============================================================================
-- 5. JOBSITE REGISTRY
-- ============================================================================
-- Active projects with site-specific hazards and emergency contacts

-- Project status enum
CREATE TYPE project_status AS ENUM (
    'planning',           -- Pre-construction
    'active',             -- Work in progress
    'on_hold',            -- Temporarily stopped
    'substantial_completion', -- Major work complete
    'completed',          -- Project finished
    'warranty',           -- In warranty period
    'closed'              -- Fully closed out
);

-- Project type enum
CREATE TYPE project_type AS ENUM (
    'commercial_new',     -- New commercial construction
    'commercial_reno',    -- Commercial renovation
    'residential_new',    -- New residential
    'residential_reno',   -- Residential renovation
    'institutional',      -- Schools, hospitals, govt
    'industrial',         -- Manufacturing, processing
    'infrastructure',     -- Roads, bridges, utilities
    'civil',              -- Earthwork, site development
    'maintenance',        -- Ongoing maintenance
    'other'               -- Other project types
);

-- Jobsite registry table
CREATE TABLE jobsites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Project identification
    project_number TEXT NOT NULL,           -- e.g., "2024-0042"
    name TEXT NOT NULL,                     -- e.g., "Maple Heights Condo Tower"
    description TEXT,
    
    -- Classification
    project_type project_type NOT NULL,
    status project_status NOT NULL DEFAULT 'active',
    
    -- Client/Owner
    client_name TEXT,
    client_contact TEXT,
    client_phone TEXT,
    client_email TEXT,
    
    -- Location
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'ON',
    postal_code TEXT,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    
    -- Project timeline
    start_date DATE,
    estimated_end_date DATE,
    actual_end_date DATE,
    
    -- Contract info
    contract_value DECIMAL(14, 2),
    contract_type TEXT,                     -- lump_sum, cost_plus, t_and_m
    
    -- Safety contact at this site
    site_safety_contact UUID REFERENCES workers(id),
    site_supervisor UUID REFERENCES workers(id),
    
    -- Emergency info
    -- Format: {"hospital": {"name": "...", "address": "...", "phone": "..."}, ...}
    emergency_info JSONB DEFAULT '{}'::jsonb,
    muster_point TEXT,
    
    -- Site-specific hazards
    -- Format: [{"hazard_id": "uuid", "description": "...", "controls": [...]}]
    site_specific_hazards JSONB DEFAULT '[]'::jsonb,
    
    -- Site access requirements
    -- Format: {"requires_orientation": true, "security_clearance": false, ...}
    access_requirements JSONB DEFAULT '{}'::jsonb,
    
    -- Key documents
    site_safety_plan_id UUID REFERENCES documents(id),
    emergency_response_plan_id UUID REFERENCES documents(id),
    
    -- Working hours
    default_start_time TIME DEFAULT '07:00',
    default_end_time TIME DEFAULT '15:30',
    
    -- Notes
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(company_id, project_number)
);

COMMENT ON TABLE jobsites IS 'Active project registry with site-specific safety information';
COMMENT ON COLUMN jobsites.emergency_info IS 'JSON with hospital, fire, police contacts';
COMMENT ON COLUMN jobsites.site_specific_hazards IS 'Unique hazards at this specific site';

-- Jobsite emergency contacts table
CREATE TABLE jobsite_emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jobsite_id UUID NOT NULL REFERENCES jobsites(id) ON DELETE CASCADE,
    
    -- Contact type
    contact_type TEXT NOT NULL,             -- hospital, fire, police, utility, client, internal
    
    -- Contact details
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_alternate TEXT,
    address TEXT,
    
    -- Priority (for display order)
    priority INTEGER DEFAULT 0,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE jobsite_emergency_contacts IS 'Emergency contacts specific to each jobsite';

-- Workers assigned to jobsites (many-to-many)
CREATE TABLE jobsite_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jobsite_id UUID NOT NULL REFERENCES jobsites(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    
    -- Assignment details
    role TEXT,                              -- Role on this project
    start_date DATE,
    end_date DATE,
    
    -- Orientation status
    orientation_completed BOOLEAN DEFAULT false,
    orientation_date DATE,
    orientation_form_id UUID REFERENCES form_submissions(id),
    
    -- Access
    has_site_access BOOLEAN DEFAULT true,
    access_card_number TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(jobsite_id, worker_id)
);

COMMENT ON TABLE jobsite_workers IS 'Workers assigned to specific jobsites';


-- ============================================================================
-- 6. LEGISLATIVE LIBRARY
-- ============================================================================
-- Ontario OHSA with full text search, O. Reg. 213/91, O. Reg. 851

-- Legislation type enum
CREATE TYPE legislation_type AS ENUM (
    'act',                -- Primary legislation (OHSA)
    'regulation',         -- Regulations under an act
    'code',               -- Building codes, electrical codes
    'standard',           -- CSA, ANSI standards
    'guideline'           -- MOL guidelines, best practices
);

-- Main legislation table
CREATE TABLE legislation_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    legislation_type legislation_type NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'Ontario',
    
    -- Details
    name TEXT NOT NULL,                     -- e.g., "Occupational Health and Safety Act"
    short_name TEXT NOT NULL,               -- e.g., "OHSA"
    citation TEXT,                          -- e.g., "R.S.O. 1990, c. O.1"
    
    -- Content
    description TEXT,
    effective_date DATE,
    last_amended_date DATE,
    
    -- External references
    source_url TEXT,                        -- Link to official source
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Full-text search vector
    search_vector tsvector,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(legislation_type, jurisdiction, short_name)
);

COMMENT ON TABLE legislation_library IS 'Master list of applicable legislation';

-- Legislation sections/clauses table
CREATE TABLE legislation_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legislation_id UUID NOT NULL REFERENCES legislation_library(id) ON DELETE CASCADE,
    
    -- Section identification
    section_number TEXT NOT NULL,           -- e.g., "26.1", "26(1)(a)"
    title TEXT,                             -- Section title if any
    
    -- Content
    full_text TEXT NOT NULL,                -- Complete section text
    plain_language_summary TEXT,            -- Simplified explanation
    
    -- Hierarchy
    parent_section_id UUID REFERENCES legislation_sections(id),
    
    -- Classification
    -- Format: ["Fall Protection", "Guardrails", "Working at Heights"]
    topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Applicability
    -- Format: ["Construction", "Industrial", "Mining"]
    applies_to TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Key requirements (parsed out for quick reference)
    -- Format: [{"requirement": "Guardrails must be...", "measurement": "1.07m height"}]
    key_requirements JSONB DEFAULT '[]'::jsonb,
    
    -- COR element mapping
    cor_elements INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    
    -- Full-text search vector
    search_vector tsvector,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE legislation_sections IS 'Individual sections/clauses with full text and summaries';
COMMENT ON COLUMN legislation_sections.plain_language_summary IS 'Worker-friendly explanation of requirement';

-- Quick reference guides table
CREATE TABLE legislative_quick_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference identification
    topic TEXT NOT NULL,                    -- e.g., "Fall Protection Requirements"
    
    -- Content
    summary TEXT NOT NULL,                  -- Plain language summary
    key_points TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Linked sections
    -- Format: [{"legislation": "O. Reg. 213/91", "section": "26.1", "title": "..."}, ...]
    related_sections JSONB DEFAULT '[]'::jsonb,
    
    -- Classification
    trades TEXT[] DEFAULT ARRAY[]::TEXT[],
    hazard_categories hazard_category[] DEFAULT ARRAY[]::hazard_category[],
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE legislative_quick_references IS 'Topic-based quick reference guides linking multiple regulations';


-- ============================================================================
-- 7. SDS LIBRARY (Safety Data Sheets)
-- ============================================================================
-- Chemical products with WHMIS 2015 classifications and emergency info

-- WHMIS 2015 hazard classes
CREATE TYPE whmis_hazard_class AS ENUM (
    'flammable_gas',
    'flammable_aerosol',
    'oxidizing_gas',
    'gas_under_pressure',
    'flammable_liquid',
    'flammable_solid',
    'self_reactive',
    'pyrophoric_liquid',
    'pyrophoric_solid',
    'self_heating',
    'water_reactive',
    'oxidizing_liquid',
    'oxidizing_solid',
    'organic_peroxide',
    'corrosive_metal',
    'acute_toxicity',
    'skin_corrosion',
    'eye_damage',
    'respiratory_sensitizer',
    'skin_sensitizer',
    'germ_cell_mutagenicity',
    'carcinogenicity',
    'reproductive_toxicity',
    'target_organ_single',
    'target_organ_repeated',
    'aspiration_hazard',
    'aquatic_acute',
    'aquatic_chronic',
    'biohazard'
);

-- SDS status enum
CREATE TYPE sds_status AS ENUM (
    'current',            -- Up to date SDS
    'expired',            -- Older than 3 years
    'pending_update',     -- New SDS being obtained
    'archived'            -- No longer used
);

-- Main SDS library table
CREATE TABLE sds_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Product identification
    product_name TEXT NOT NULL,
    product_code TEXT,                      -- Internal/supplier code
    manufacturer TEXT,
    supplier TEXT,
    
    -- SDS identification
    sds_number TEXT,                        -- SDS document number
    revision_date DATE NOT NULL,
    
    -- WHMIS 2015 Classifications
    hazard_classes whmis_hazard_class[] DEFAULT ARRAY[]::whmis_hazard_class[],
    
    -- Signal word
    signal_word TEXT CHECK (signal_word IN ('Danger', 'Warning', NULL)),
    
    -- Hazard statements (H-codes)
    -- Format: ["H225 - Highly flammable liquid and vapour", "H319 - Causes serious eye irritation"]
    hazard_statements TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Precautionary statements (P-codes)
    -- Format: ["P210 - Keep away from heat, sparks...", "P233 - Keep container tightly closed"]
    precautionary_statements TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Pictograms
    -- Format: ["flame", "exclamation_mark", "health_hazard"]
    pictograms TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Emergency information
    emergency_phone TEXT,                   -- Manufacturer emergency line
    first_aid_measures JSONB DEFAULT '{}'::jsonb,
    fire_fighting_measures JSONB DEFAULT '{}'::jsonb,
    spill_response JSONB DEFAULT '{}'::jsonb,
    
    -- Exposure limits
    -- Format: {"TWA": "50 ppm", "STEL": "100 ppm", "ceiling": "N/A"}
    exposure_limits JSONB DEFAULT '{}'::jsonb,
    
    -- Required PPE
    required_ppe TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Storage requirements
    storage_requirements TEXT,
    incompatible_materials TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Status and inventory
    status sds_status NOT NULL DEFAULT 'current',
    
    -- Where product is used/stored
    locations_used TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- File storage
    file_path TEXT,                         -- Path to PDF in storage
    file_name TEXT,
    file_size_bytes BIGINT,
    
    -- Extracted text for search
    extracted_text TEXT,
    search_vector tsvector,
    
    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(company_id, product_name, manufacturer)
);

COMMENT ON TABLE sds_library IS 'Safety Data Sheet library with WHMIS 2015 classifications';
COMMENT ON COLUMN sds_library.hazard_classes IS 'WHMIS 2015 hazard classifications';
COMMENT ON COLUMN sds_library.pictograms IS 'WHMIS pictogram identifiers: flame, skull, exclamation_mark, etc.';

-- SDS inventory tracking (which products are at which locations)
CREATE TABLE sds_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sds_id UUID NOT NULL REFERENCES sds_library(id) ON DELETE CASCADE,
    jobsite_id UUID REFERENCES jobsites(id) ON DELETE CASCADE,
    
    -- Location within jobsite
    storage_location TEXT NOT NULL,
    
    -- Quantity
    quantity_on_hand DECIMAL(10, 2),
    unit_of_measure TEXT,
    
    -- Access
    accessible_to_workers BOOLEAN DEFAULT true,
    
    -- Status
    last_verified DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sds_inventory IS 'Tracks SDS products at specific jobsite locations';


-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Hazard Library indexes
CREATE INDEX idx_hazard_library_company ON hazard_library(company_id, is_active);
CREATE INDEX idx_hazard_library_category ON hazard_library(category);
CREATE INDEX idx_hazard_library_trades ON hazard_library USING GIN(applicable_trades);
CREATE INDEX idx_hazard_library_risk ON hazard_library(default_risk_level);

-- Equipment indexes
CREATE INDEX idx_equipment_company ON equipment_inventory(company_id, status);
CREATE INDEX idx_equipment_category ON equipment_inventory(category, status);
CREATE INDEX idx_equipment_inspection ON equipment_inventory(next_inspection_due) WHERE status = 'available' OR status = 'in_use';
CREATE INDEX idx_equipment_jobsite ON equipment_inventory(current_jobsite_id) WHERE current_jobsite_id IS NOT NULL;
CREATE INDEX idx_equipment_inspections ON equipment_inspections(equipment_id, inspection_date DESC);
CREATE INDEX idx_equipment_maintenance ON equipment_maintenance(equipment_id, maintenance_date DESC);

-- Job/Task Library indexes
CREATE INDEX idx_task_library_company ON job_task_library(company_id, is_active);
CREATE INDEX idx_task_library_trade ON job_task_library(trade);
CREATE INDEX idx_task_hazard_mappings ON task_hazard_mappings(task_id);

-- Worker competencies indexes
CREATE INDEX idx_worker_competencies ON worker_competencies(worker_id, status);
CREATE INDEX idx_worker_competencies_expiry ON worker_competencies(expiry_date) WHERE status = 'active';
CREATE INDEX idx_training_records ON training_records(worker_id, training_date DESC);

-- Jobsite indexes
CREATE INDEX idx_jobsites_company ON jobsites(company_id, status);
CREATE INDEX idx_jobsites_location ON jobsites(city, province);
CREATE INDEX idx_jobsite_workers ON jobsite_workers(jobsite_id);
CREATE INDEX idx_jobsite_workers_worker ON jobsite_workers(worker_id);

-- Legislative library indexes
CREATE INDEX idx_legislation_type ON legislation_library(legislation_type, jurisdiction);
CREATE INDEX idx_legislation_sections ON legislation_sections(legislation_id);
CREATE INDEX idx_legislation_sections_search ON legislation_sections USING GIN(search_vector);
CREATE INDEX idx_legislation_sections_topics ON legislation_sections USING GIN(topics);

-- SDS Library indexes
CREATE INDEX idx_sds_company ON sds_library(company_id, status);
CREATE INDEX idx_sds_manufacturer ON sds_library(manufacturer);
CREATE INDEX idx_sds_search ON sds_library USING GIN(search_vector);
CREATE INDEX idx_sds_hazards ON sds_library USING GIN(hazard_classes);
CREATE INDEX idx_sds_inventory ON sds_inventory(sds_id, jobsite_id);


-- ============================================================================
-- 9. FULL-TEXT SEARCH TRIGGERS
-- ============================================================================

-- Legislation sections search vector
CREATE OR REPLACE FUNCTION update_legislation_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.section_number, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.plain_language_summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.full_text, '')), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_legislation_sections_search
    BEFORE INSERT OR UPDATE OF section_number, title, plain_language_summary, full_text
    ON legislation_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_legislation_search_vector();

-- SDS search vector
CREATE OR REPLACE FUNCTION update_sds_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.product_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.manufacturer, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.supplier, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.hazard_statements, ' '), '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.extracted_text, '')), 'D');
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_sds_search
    BEFORE INSERT OR UPDATE OF product_name, manufacturer, supplier, hazard_statements, extracted_text
    ON sds_library
    FOR EACH ROW
    EXECUTE FUNCTION update_sds_search_vector();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_master_data_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_hazard_library_updated_at BEFORE UPDATE ON hazard_library FOR EACH ROW EXECUTE FUNCTION update_master_data_timestamp();
CREATE TRIGGER tr_equipment_inventory_updated_at BEFORE UPDATE ON equipment_inventory FOR EACH ROW EXECUTE FUNCTION update_master_data_timestamp();
CREATE TRIGGER tr_job_task_library_updated_at BEFORE UPDATE ON job_task_library FOR EACH ROW EXECUTE FUNCTION update_master_data_timestamp();
CREATE TRIGGER tr_worker_competencies_updated_at BEFORE UPDATE ON worker_competencies FOR EACH ROW EXECUTE FUNCTION update_master_data_timestamp();
CREATE TRIGGER tr_jobsites_updated_at BEFORE UPDATE ON jobsites FOR EACH ROW EXECUTE FUNCTION update_master_data_timestamp();
CREATE TRIGGER tr_legislation_library_updated_at BEFORE UPDATE ON legislation_library FOR EACH ROW EXECUTE FUNCTION update_master_data_timestamp();
CREATE TRIGGER tr_sds_library_updated_at BEFORE UPDATE ON sds_library FOR EACH ROW EXECUTE FUNCTION update_master_data_timestamp();


-- ============================================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE hazard_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_task_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_hazard_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobsites ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobsite_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobsite_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislation_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislation_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislative_quick_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE sds_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE sds_inventory ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 11. RLS POLICIES - GLOBAL + COMPANY DATA PATTERN
-- ============================================================================
-- Pattern: Users see global (company_id IS NULL) + their company's data

-- Hazard Library
CREATE POLICY "hazard_library_select" ON hazard_library
    FOR SELECT TO authenticated
    USING (company_id IS NULL OR company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "hazard_library_insert" ON hazard_library
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

CREATE POLICY "hazard_library_update" ON hazard_library
    FOR UPDATE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

CREATE POLICY "hazard_library_delete" ON hazard_library
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR (company_id IS NULL AND is_super_admin())
    );

-- Control Measures
CREATE POLICY "control_measures_select" ON control_measures
    FOR SELECT TO authenticated
    USING (company_id IS NULL OR company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "control_measures_manage" ON control_measures
    FOR ALL TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

-- PPE Types
CREATE POLICY "ppe_types_select" ON ppe_types
    FOR SELECT TO authenticated
    USING (company_id IS NULL OR company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "ppe_types_manage" ON ppe_types
    FOR ALL TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

-- Equipment Inventory (company-only)
CREATE POLICY "equipment_select" ON equipment_inventory
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "equipment_insert" ON equipment_inventory
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "equipment_update" ON equipment_inventory
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "equipment_delete" ON equipment_inventory
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );

-- Equipment Inspections
CREATE POLICY "equipment_inspections_select" ON equipment_inspections
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "equipment_inspections_insert" ON equipment_inspections
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Equipment Maintenance
CREATE POLICY "equipment_maintenance_select" ON equipment_maintenance
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "equipment_maintenance_insert" ON equipment_maintenance
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Job/Task Library
CREATE POLICY "task_library_select" ON job_task_library
    FOR SELECT TO authenticated
    USING (company_id IS NULL OR company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "task_library_insert" ON job_task_library
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

CREATE POLICY "task_library_update" ON job_task_library
    FOR UPDATE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
        OR (company_id IS NULL AND is_super_admin())
    );

CREATE POLICY "task_library_delete" ON job_task_library
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR (company_id IS NULL AND is_super_admin())
    );

-- Task Hazard Mappings
CREATE POLICY "task_hazard_mappings_select" ON task_hazard_mappings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM job_task_library t 
            WHERE t.id = task_id 
            AND (t.company_id IS NULL OR t.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "task_hazard_mappings_manage" ON task_hazard_mappings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM job_task_library t 
            WHERE t.id = task_id 
            AND ((t.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (t.company_id IS NULL AND is_super_admin()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_task_library t 
            WHERE t.id = task_id 
            AND ((t.company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor'))
                 OR (t.company_id IS NULL AND is_super_admin()))
        )
    );

-- Worker Competencies
CREATE POLICY "worker_competencies_select" ON worker_competencies
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "worker_competencies_insert" ON worker_competencies
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "worker_competencies_update" ON worker_competencies
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "worker_competencies_delete" ON worker_competencies
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor'))
        OR is_super_admin()
    );

-- Training Records
CREATE POLICY "training_records_select" ON training_records
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "training_records_insert" ON training_records
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Jobsites
CREATE POLICY "jobsites_select" ON jobsites
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "jobsites_insert" ON jobsites
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "jobsites_update" ON jobsites
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "jobsites_delete" ON jobsites
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );

-- Jobsite Emergency Contacts
CREATE POLICY "jobsite_contacts_select" ON jobsite_emergency_contacts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jobsites j 
            WHERE j.id = jobsite_id 
            AND (j.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "jobsite_contacts_manage" ON jobsite_emergency_contacts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jobsites j 
            WHERE j.id = jobsite_id 
            AND (j.company_id = get_user_company_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobsites j 
            WHERE j.id = jobsite_id 
            AND (j.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- Jobsite Workers
CREATE POLICY "jobsite_workers_select" ON jobsite_workers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jobsites j 
            WHERE j.id = jobsite_id 
            AND (j.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "jobsite_workers_manage" ON jobsite_workers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jobsites j 
            WHERE j.id = jobsite_id 
            AND (j.company_id = get_user_company_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobsites j 
            WHERE j.id = jobsite_id 
            AND (j.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- Legislation Library (global, readable by all)
CREATE POLICY "legislation_select" ON legislation_library
    FOR SELECT TO authenticated
    USING (is_active = true OR is_super_admin());

CREATE POLICY "legislation_manage" ON legislation_library
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Legislation Sections
CREATE POLICY "legislation_sections_select" ON legislation_sections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM legislation_library l 
            WHERE l.id = legislation_id 
            AND (l.is_active = true OR is_super_admin())
        )
    );

CREATE POLICY "legislation_sections_manage" ON legislation_sections
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Legislative Quick References
CREATE POLICY "quick_references_select" ON legislative_quick_references
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "quick_references_manage" ON legislative_quick_references
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- SDS Library
CREATE POLICY "sds_select" ON sds_library
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "sds_insert" ON sds_library
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "sds_update" ON sds_library
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "sds_delete" ON sds_library
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor'))
        OR is_super_admin()
    );

-- SDS Inventory
CREATE POLICY "sds_inventory_select" ON sds_inventory
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sds_library s 
            WHERE s.id = sds_id 
            AND (s.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "sds_inventory_manage" ON sds_inventory
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sds_library s 
            WHERE s.id = sds_id 
            AND (s.company_id = get_user_company_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sds_library s 
            WHERE s.id = sds_id 
            AND (s.company_id = get_user_company_id() OR is_super_admin())
        )
    );


-- ============================================================================
-- 12. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on enum types
GRANT USAGE ON TYPE hazard_category TO authenticated;
GRANT USAGE ON TYPE risk_level TO authenticated;
GRANT USAGE ON TYPE control_type TO authenticated;
GRANT USAGE ON TYPE equipment_status TO authenticated;
GRANT USAGE ON TYPE equipment_category TO authenticated;
GRANT USAGE ON TYPE trade_category TO authenticated;
GRANT USAGE ON TYPE competency_type TO authenticated;
GRANT USAGE ON TYPE competency_status TO authenticated;
GRANT USAGE ON TYPE project_status TO authenticated;
GRANT USAGE ON TYPE project_type TO authenticated;
GRANT USAGE ON TYPE legislation_type TO authenticated;
GRANT USAGE ON TYPE whmis_hazard_class TO authenticated;
GRANT USAGE ON TYPE sds_status TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hazard_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON control_measures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ppe_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_inventory TO authenticated;
GRANT SELECT, INSERT ON equipment_inspections TO authenticated;
GRANT SELECT, INSERT ON equipment_maintenance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_task_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_hazard_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON worker_competencies TO authenticated;
GRANT SELECT, INSERT ON training_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobsites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobsite_emergency_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobsite_workers TO authenticated;
GRANT SELECT ON legislation_library TO authenticated;
GRANT SELECT ON legislation_sections TO authenticated;
GRANT SELECT ON legislative_quick_references TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sds_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sds_inventory TO authenticated;


-- ============================================================================
-- 13. HELPER FUNCTIONS
-- ============================================================================

-- Calculate risk level from score
CREATE OR REPLACE FUNCTION calculate_risk_level(p_severity INTEGER, p_likelihood INTEGER)
RETURNS risk_level
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_score INTEGER;
BEGIN
    v_score := p_severity * p_likelihood;
    
    RETURN CASE
        WHEN v_score <= 4 THEN 'negligible'::risk_level
        WHEN v_score <= 9 THEN 'low'::risk_level
        WHEN v_score <= 14 THEN 'medium'::risk_level
        WHEN v_score <= 19 THEN 'high'::risk_level
        ELSE 'critical'::risk_level
    END;
END;
$$;

COMMENT ON FUNCTION calculate_risk_level IS 'Calculates risk level from severity × likelihood score';

-- Get expiring certifications for a company
CREATE OR REPLACE FUNCTION get_expiring_certifications(
    p_company_id UUID,
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    worker_id UUID,
    worker_name TEXT,
    competency_name TEXT,
    competency_type competency_type,
    expiry_date DATE,
    days_until_expiry INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.first_name || ' ' || w.last_name,
        wc.name,
        wc.competency_type,
        wc.expiry_date,
        (wc.expiry_date - CURRENT_DATE)::INTEGER
    FROM worker_competencies wc
    JOIN workers w ON w.id = wc.worker_id
    WHERE wc.company_id = p_company_id
      AND wc.status = 'active'
      AND wc.expiry_date IS NOT NULL
      AND wc.expiry_date <= CURRENT_DATE + p_days_ahead
    ORDER BY wc.expiry_date ASC;
END;
$$;

COMMENT ON FUNCTION get_expiring_certifications IS 'Returns certifications expiring within specified days';

-- Get equipment due for inspection
CREATE OR REPLACE FUNCTION get_equipment_due_inspection(
    p_company_id UUID,
    p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
    equipment_id UUID,
    equipment_number TEXT,
    equipment_name TEXT,
    category equipment_category,
    next_inspection_due DATE,
    days_until_due INTEGER,
    current_location TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.equipment_number,
        e.name,
        e.category,
        e.next_inspection_due,
        (e.next_inspection_due - CURRENT_DATE)::INTEGER,
        e.current_location
    FROM equipment_inventory e
    WHERE e.company_id = p_company_id
      AND e.status IN ('available', 'in_use')
      AND e.next_inspection_due IS NOT NULL
      AND e.next_inspection_due <= CURRENT_DATE + p_days_ahead
    ORDER BY e.next_inspection_due ASC;
END;
$$;

COMMENT ON FUNCTION get_equipment_due_inspection IS 'Returns equipment due for inspection within specified days';

-- Search legislation
CREATE OR REPLACE FUNCTION search_legislation(
    p_search_query TEXT,
    p_legislation_type legislation_type DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    section_id UUID,
    legislation_name TEXT,
    section_number TEXT,
    section_title TEXT,
    plain_language_summary TEXT,
    relevance_rank REAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_query tsquery;
BEGIN
    v_query := websearch_to_tsquery('english', p_search_query);
    
    RETURN QUERY
    SELECT 
        ls.id,
        ll.short_name,
        ls.section_number,
        ls.title,
        ls.plain_language_summary,
        ts_rank(ls.search_vector, v_query)
    FROM legislation_sections ls
    JOIN legislation_library ll ON ll.id = ls.legislation_id
    WHERE ll.is_active = true
      AND (p_legislation_type IS NULL OR ll.legislation_type = p_legislation_type)
      AND ls.search_vector @@ v_query
    ORDER BY ts_rank(ls.search_vector, v_query) DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_legislation IS 'Full-text search across legislation sections';

-- Search SDS library
CREATE OR REPLACE FUNCTION search_sds(
    p_company_id UUID,
    p_search_query TEXT,
    p_hazard_class whmis_hazard_class DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    sds_id UUID,
    product_name TEXT,
    manufacturer TEXT,
    signal_word TEXT,
    hazard_classes whmis_hazard_class[],
    pictograms TEXT[],
    relevance_rank REAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_query tsquery;
BEGIN
    v_query := websearch_to_tsquery('english', p_search_query);
    
    RETURN QUERY
    SELECT 
        s.id,
        s.product_name,
        s.manufacturer,
        s.signal_word,
        s.hazard_classes,
        s.pictograms,
        ts_rank(s.search_vector, v_query)
    FROM sds_library s
    WHERE s.company_id = p_company_id
      AND s.status = 'current'
      AND (p_hazard_class IS NULL OR p_hazard_class = ANY(s.hazard_classes))
      AND (
          s.search_vector @@ v_query
          OR s.product_name ILIKE '%' || p_search_query || '%'
          OR s.manufacturer ILIKE '%' || p_search_query || '%'
      )
    ORDER BY ts_rank(s.search_vector, v_query) DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_sds IS 'Search SDS library by product name, manufacturer, or hazard class';

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_risk_level(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_certifications(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_equipment_due_inspection(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_legislation(TEXT, legislation_type, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_sds(UUID, TEXT, whmis_hazard_class, INTEGER) TO authenticated;


-- ============================================================================
-- END OF MASTER DATA LIBRARIES MIGRATION
-- ============================================================================
