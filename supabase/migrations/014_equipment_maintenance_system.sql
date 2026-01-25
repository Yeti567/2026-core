-- ============================================================================
-- EQUIPMENT MAINTENANCE RECORDS & DOCUMENTATION SYSTEM
-- ============================================================================
-- Comprehensive maintenance management including:
-- - Maintenance record types (preventive, corrective, inspections, load tests)
-- - Receipt & invoice management with OCR metadata
-- - Equipment-specific maintenance folders
-- - Maintenance scheduling (calendar & usage-based)
-- - Work orders with status tracking
-- - Downtime tracking and availability metrics
-- - Audit compliance integration (COR Element 7)
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- Maintenance record types
CREATE TYPE maintenance_record_type AS ENUM (
    'preventive',           -- Scheduled preventive maintenance
    'corrective',           -- Repairs and fixes
    'inspection_daily',     -- Daily pre-use inspection
    'inspection_weekly',    -- Weekly inspection
    'inspection_monthly',   -- Monthly inspection
    'inspection_annual',    -- Annual inspection
    'load_test',           -- Certification load tests
    'service_report',      -- Vendor service reports
    'parts_replacement',   -- Parts replacement records
    'calibration',         -- Calibration records
    'certification_renewal' -- Certification renewals
);

-- Work order status
CREATE TYPE work_order_status AS ENUM (
    'draft',
    'open',
    'assigned',
    'in_progress',
    'on_hold',
    'parts_ordered',
    'completed',
    'cancelled'
);

-- Work order priority
CREATE TYPE work_order_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Schedule frequency type
CREATE TYPE schedule_frequency_type AS ENUM (
    'hours',      -- Every X hours of usage
    'days',       -- Every X calendar days
    'weeks',      -- Every X weeks
    'months',     -- Every X months
    'years'       -- Every X years
);

-- Receipt/document source
CREATE TYPE receipt_source AS ENUM (
    'mobile_photo',
    'pdf_upload',
    'email_forward',
    'manual_entry',
    'vendor_portal'
);

-- Downtime reason
CREATE TYPE downtime_reason AS ENUM (
    'scheduled_maintenance',
    'breakdown',
    'parts_unavailable',
    'awaiting_inspection',
    'load_test_required',
    'safety_concern',
    'weather',
    'operator_unavailable',
    'other'
);

-- ============================================================================
-- 2. EQUIPMENT INVENTORY TABLE (IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identification
    equipment_code TEXT NOT NULL,
    name TEXT NOT NULL,
    equipment_type TEXT NOT NULL,
    category TEXT,
    
    -- Manufacturer Info
    make TEXT,
    model TEXT,
    serial_number TEXT,
    year_manufactured INTEGER,
    
    -- Acquisition
    purchase_date DATE,
    purchase_price NUMERIC(12, 2),
    vendor TEXT,
    warranty_expiry DATE,
    
    -- Status & Location
    status TEXT NOT NULL DEFAULT 'active',
    current_location TEXT,
    assigned_to TEXT,
    assigned_jobsite_id UUID,
    
    -- Inspection Tracking
    inspection_frequency_days INTEGER DEFAULT 30,
    last_inspection_date DATE,
    next_inspection_date DATE,
    inspection_status TEXT DEFAULT 'na',
    
    -- Hour Tracking
    current_hours NUMERIC(10, 2) DEFAULT 0,
    last_hour_reading_date DATE,
    
    -- Certifications
    certifications_required TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Documents
    photo_url TEXT,
    manual_url TEXT,
    
    -- Notes
    notes TEXT,
    specifications JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    
    UNIQUE(company_id, equipment_code)
);

-- ============================================================================
-- 3. MAINTENANCE RECORDS TABLE
-- ============================================================================

CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    
    -- Record Details
    record_type maintenance_record_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Timing
    maintenance_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER,
    
    -- Hour Meter Reading
    hour_meter_reading NUMERIC(10, 2),
    
    -- Personnel
    performed_by TEXT,
    performed_by_user_id UUID REFERENCES user_profiles(id),
    verified_by UUID REFERENCES user_profiles(id),
    verified_at TIMESTAMPTZ,
    
    -- Work Details
    work_performed TEXT,
    findings TEXT,
    recommendations TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    
    -- Parts Used
    parts_used JSONB DEFAULT '[]', -- [{part_name, part_number, quantity, cost}]
    labor_cost NUMERIC(10, 2),
    parts_cost NUMERIC(10, 2),
    total_cost NUMERIC(10, 2),
    
    -- Linked Work Order
    work_order_id UUID,
    
    -- Certification/Compliance
    is_certification_record BOOLEAN DEFAULT false,
    certification_type TEXT,
    certification_expiry DATE,
    certificate_number TEXT,
    certifying_body TEXT,
    
    -- Pass/Fail for Inspections
    passed BOOLEAN,
    deficiencies TEXT[],
    
    -- Documents attached
    attachments JSONB DEFAULT '[]', -- [{file_name, file_path, file_type, uploaded_at}]
    
    -- Audit Integration
    cor_element INTEGER DEFAULT 7, -- Element 7: Preventive Maintenance
    evidence_chain_id UUID REFERENCES evidence_chain(id),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

COMMENT ON TABLE maintenance_records IS 'All maintenance activities: inspections, repairs, service, certifications';
COMMENT ON COLUMN maintenance_records.parts_used IS 'JSON array of parts: [{part_name, part_number, quantity, cost}]';

-- ============================================================================
-- 4. MAINTENANCE RECEIPTS & INVOICES TABLE
-- ============================================================================

CREATE TABLE maintenance_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment_inventory(id) ON DELETE SET NULL,
    maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    work_order_id UUID,
    
    -- Source Information
    source receipt_source NOT NULL DEFAULT 'manual_entry',
    original_file_path TEXT,
    original_file_name TEXT,
    
    -- OCR/Extracted Data
    ocr_extracted BOOLEAN DEFAULT false,
    ocr_raw_text TEXT,
    ocr_confidence NUMERIC(5, 2),
    
    -- Receipt Details
    receipt_number TEXT,
    receipt_date DATE,
    vendor_name TEXT,
    vendor_address TEXT,
    vendor_phone TEXT,
    
    -- Financial
    subtotal NUMERIC(12, 2),
    tax_amount NUMERIC(12, 2),
    total_amount NUMERIC(12, 2),
    currency TEXT DEFAULT 'CAD',
    payment_method TEXT,
    
    -- Line Items
    line_items JSONB DEFAULT '[]', -- [{description, quantity, unit_price, total}]
    
    -- Categorization
    expense_category TEXT, -- parts, labor, service, rental, other
    is_warranty_claim BOOLEAN DEFAULT false,
    
    -- Email Forward Metadata (if from email)
    email_from TEXT,
    email_subject TEXT,
    email_received_at TIMESTAMPTZ,
    
    -- Approval
    approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

COMMENT ON TABLE maintenance_receipts IS 'Receipts, invoices, and expense documentation for maintenance activities';
COMMENT ON COLUMN maintenance_receipts.line_items IS 'JSON array: [{description, quantity, unit_price, total}]';

-- ============================================================================
-- 5. MAINTENANCE SCHEDULES TABLE
-- ============================================================================

CREATE TABLE maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    
    -- Schedule Details
    schedule_name TEXT NOT NULL,
    description TEXT,
    maintenance_type maintenance_record_type NOT NULL,
    
    -- Frequency
    frequency_type schedule_frequency_type NOT NULL,
    frequency_value INTEGER NOT NULL, -- Every X hours/days/weeks/months/years
    
    -- For Hour-Based Schedules
    hours_interval INTEGER, -- e.g., every 50 hours
    last_hour_reading NUMERIC(10, 2),
    next_due_hours NUMERIC(10, 2),
    
    -- For Calendar-Based Schedules
    last_performed_date DATE,
    next_due_date DATE,
    
    -- Advance Warning
    warning_days INTEGER DEFAULT 7, -- Days before due to send reminder
    warning_hours INTEGER, -- Hours before due to send reminder
    
    -- Task Details
    task_checklist JSONB DEFAULT '[]', -- [{task, required, notes}]
    estimated_duration_minutes INTEGER,
    required_parts JSONB DEFAULT '[]', -- [{part_name, part_number, quantity}]
    required_certifications TEXT[],
    
    -- Assignment
    assigned_to UUID REFERENCES user_profiles(id),
    default_mechanic TEXT,
    
    -- Cost Estimates
    estimated_labor_cost NUMERIC(10, 2),
    estimated_parts_cost NUMERIC(10, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    suspended_until DATE,
    suspension_reason TEXT,
    
    -- Compliance
    is_regulatory_requirement BOOLEAN DEFAULT false,
    regulation_reference TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

COMMENT ON TABLE maintenance_schedules IS 'Recurring maintenance schedules - calendar and usage-based';

-- ============================================================================
-- 6. WORK ORDERS TABLE
-- ============================================================================

CREATE TABLE maintenance_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    
    -- Work Order Number
    work_order_number TEXT NOT NULL,
    
    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    maintenance_type maintenance_record_type NOT NULL,
    
    -- Status & Priority
    status work_order_status NOT NULL DEFAULT 'open',
    priority work_order_priority NOT NULL DEFAULT 'medium',
    
    -- Scheduling
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_date DATE,
    due_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Linked Schedule
    schedule_id UUID REFERENCES maintenance_schedules(id),
    
    -- Assignment
    requested_by UUID REFERENCES user_profiles(id),
    assigned_to UUID REFERENCES user_profiles(id),
    assigned_mechanic TEXT,
    
    -- Equipment Info at Time of Request
    equipment_location TEXT,
    equipment_hours NUMERIC(10, 2),
    
    -- Problem Description
    problem_description TEXT,
    failure_mode TEXT,
    safety_concern BOOLEAN DEFAULT false,
    safety_notes TEXT,
    
    -- Work Details
    diagnosis TEXT,
    work_performed TEXT,
    root_cause TEXT,
    
    -- Parts & Labor
    parts_needed JSONB DEFAULT '[]', -- [{part_name, part_number, quantity, ordered, received}]
    parts_ordered_at TIMESTAMPTZ,
    parts_received_at TIMESTAMPTZ,
    estimated_labor_hours NUMERIC(5, 2),
    actual_labor_hours NUMERIC(5, 2),
    
    -- Costs
    estimated_cost NUMERIC(10, 2),
    actual_cost NUMERIC(10, 2),
    
    -- Media
    photos_before JSONB DEFAULT '[]', -- [{file_path, description, uploaded_at}]
    photos_after JSONB DEFAULT '[]',
    
    -- Completion
    completion_notes TEXT,
    requires_testing BOOLEAN DEFAULT false,
    testing_completed BOOLEAN DEFAULT false,
    testing_results TEXT,
    
    -- Approval
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_work_order_id UUID REFERENCES maintenance_work_orders(id),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

COMMENT ON TABLE maintenance_work_orders IS 'Work orders for maintenance tasks with full lifecycle tracking';

-- ============================================================================
-- 7. EQUIPMENT DOWNTIME TABLE
-- ============================================================================

CREATE TABLE equipment_downtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    
    -- Downtime Period
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- Reason
    downtime_reason downtime_reason NOT NULL,
    reason_details TEXT,
    
    -- Links
    work_order_id UUID REFERENCES maintenance_work_orders(id),
    maintenance_record_id UUID REFERENCES maintenance_records(id),
    
    -- Impact
    production_impact TEXT,
    estimated_lost_hours NUMERIC(10, 2),
    replacement_equipment_used TEXT,
    
    -- Resolution
    resolution_notes TEXT,
    resolved_by UUID REFERENCES user_profiles(id),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reported_by UUID REFERENCES user_profiles(id)
);

COMMENT ON TABLE equipment_downtime IS 'Track equipment out-of-service periods for availability metrics';

-- ============================================================================
-- 8. EQUIPMENT COST TRACKING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW equipment_maintenance_costs AS
SELECT 
    e.id AS equipment_id,
    e.company_id,
    e.equipment_code,
    e.name AS equipment_name,
    e.equipment_type,
    e.purchase_date,
    e.purchase_price,
    
    -- Maintenance Record Costs
    COALESCE(SUM(mr.total_cost), 0) AS total_maintenance_cost,
    COALESCE(SUM(mr.labor_cost), 0) AS total_labor_cost,
    COALESCE(SUM(mr.parts_cost), 0) AS total_parts_cost,
    COUNT(mr.id) AS maintenance_record_count,
    
    -- Receipt/Invoice Totals
    COALESCE((
        SELECT SUM(total_amount) 
        FROM maintenance_receipts 
        WHERE equipment_id = e.id AND approved = true
    ), 0) AS total_receipt_amount,
    
    -- Work Order Stats
    (SELECT COUNT(*) FROM maintenance_work_orders WHERE equipment_id = e.id) AS total_work_orders,
    (SELECT COUNT(*) FROM maintenance_work_orders WHERE equipment_id = e.id AND status = 'completed') AS completed_work_orders,
    
    -- Downtime Stats
    COALESCE((
        SELECT SUM(duration_minutes) / 60.0 
        FROM equipment_downtime 
        WHERE equipment_id = e.id
    ), 0) AS total_downtime_hours,
    
    -- Cost per Hour (if hours tracked)
    CASE 
        WHEN e.current_hours > 0 THEN 
            ROUND(COALESCE(SUM(mr.total_cost), 0) / e.current_hours, 2)
        ELSE NULL 
    END AS cost_per_hour,
    
    -- Annualized Cost
    CASE 
        WHEN e.purchase_date IS NOT NULL THEN
            ROUND(
                COALESCE(SUM(mr.total_cost), 0) / 
                GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.purchase_date))),
                2
            )
        ELSE COALESCE(SUM(mr.total_cost), 0)
    END AS annual_maintenance_cost

FROM equipment_inventory e
LEFT JOIN maintenance_records mr ON mr.equipment_id = e.id
GROUP BY e.id, e.company_id, e.equipment_code, e.name, e.equipment_type, 
         e.purchase_date, e.purchase_price, e.current_hours;

COMMENT ON VIEW equipment_maintenance_costs IS 'Aggregated maintenance costs and statistics per equipment';

-- ============================================================================
-- 9. EQUIPMENT AVAILABILITY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW equipment_availability AS
SELECT 
    e.id AS equipment_id,
    e.company_id,
    e.equipment_code,
    e.name AS equipment_name,
    e.status AS current_status,
    
    -- Last 30 Days Availability
    COALESCE(100 - (
        (SELECT SUM(COALESCE(duration_minutes, 0)) 
         FROM equipment_downtime 
         WHERE equipment_id = e.id 
           AND started_at >= NOW() - INTERVAL '30 days') / 
        (30 * 24 * 60.0) * 100
    ), 100) AS availability_30_days,
    
    -- Last 90 Days Availability
    COALESCE(100 - (
        (SELECT SUM(COALESCE(duration_minutes, 0)) 
         FROM equipment_downtime 
         WHERE equipment_id = e.id 
           AND started_at >= NOW() - INTERVAL '90 days') / 
        (90 * 24 * 60.0) * 100
    ), 100) AS availability_90_days,
    
    -- Year to Date Availability
    COALESCE(100 - (
        (SELECT SUM(COALESCE(duration_minutes, 0)) 
         FROM equipment_downtime 
         WHERE equipment_id = e.id 
           AND started_at >= DATE_TRUNC('year', CURRENT_DATE)) / 
        (EXTRACT(DOY FROM CURRENT_DATE) * 24 * 60.0) * 100
    ), 100) AS availability_ytd,
    
    -- Current Downtime
    (SELECT id FROM equipment_downtime 
     WHERE equipment_id = e.id AND ended_at IS NULL 
     LIMIT 1) AS current_downtime_id,
    
    -- Downtime Count (Last 30 Days)
    (SELECT COUNT(*) FROM equipment_downtime 
     WHERE equipment_id = e.id 
       AND started_at >= NOW() - INTERVAL '30 days') AS downtime_incidents_30_days,
    
    -- Mean Time Between Failures (MTBF) - Last 12 Months
    CASE 
        WHEN (SELECT COUNT(*) FROM equipment_downtime 
              WHERE equipment_id = e.id 
                AND downtime_reason = 'breakdown'
                AND started_at >= NOW() - INTERVAL '12 months') > 1 THEN
            ROUND(
                365.0 / (SELECT COUNT(*) FROM equipment_downtime 
                         WHERE equipment_id = e.id 
                           AND downtime_reason = 'breakdown'
                           AND started_at >= NOW() - INTERVAL '12 months'),
                1
            )
        ELSE NULL
    END AS mtbf_days

FROM equipment_inventory e;

COMMENT ON VIEW equipment_availability IS 'Equipment availability metrics and downtime analysis';

-- ============================================================================
-- 10. UPCOMING MAINTENANCE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW upcoming_maintenance AS
SELECT 
    ms.id AS schedule_id,
    ms.company_id,
    ms.equipment_id,
    e.equipment_code,
    e.name AS equipment_name,
    ms.schedule_name,
    ms.maintenance_type,
    ms.frequency_type,
    ms.frequency_value,
    
    -- Due Date/Hours
    ms.next_due_date,
    ms.next_due_hours,
    e.current_hours,
    
    -- Days/Hours Until Due
    CASE 
        WHEN ms.next_due_date IS NOT NULL THEN 
            ms.next_due_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_due,
    
    CASE 
        WHEN ms.next_due_hours IS NOT NULL AND e.current_hours IS NOT NULL THEN
            ms.next_due_hours - e.current_hours
        ELSE NULL
    END AS hours_until_due,
    
    -- Status
    CASE
        WHEN ms.next_due_date IS NOT NULL AND ms.next_due_date < CURRENT_DATE THEN 'overdue'
        WHEN ms.next_due_date IS NOT NULL AND ms.next_due_date <= CURRENT_DATE + ms.warning_days THEN 'due_soon'
        WHEN ms.next_due_hours IS NOT NULL AND e.current_hours IS NOT NULL 
             AND ms.next_due_hours <= e.current_hours THEN 'overdue'
        WHEN ms.next_due_hours IS NOT NULL AND e.current_hours IS NOT NULL 
             AND ms.warning_hours IS NOT NULL
             AND ms.next_due_hours <= e.current_hours + ms.warning_hours THEN 'due_soon'
        ELSE 'scheduled'
    END AS maintenance_status,
    
    -- Assignment
    ms.assigned_to,
    ms.default_mechanic,
    ms.estimated_duration_minutes,
    
    -- Compliance Flag
    ms.is_regulatory_requirement
    
FROM maintenance_schedules ms
JOIN equipment_inventory e ON e.id = ms.equipment_id
WHERE ms.is_active = true
  AND (ms.suspended_until IS NULL OR ms.suspended_until < CURRENT_DATE)
ORDER BY 
    CASE 
        WHEN ms.next_due_date IS NOT NULL THEN ms.next_due_date
        ELSE '9999-12-31'::DATE
    END ASC;

COMMENT ON VIEW upcoming_maintenance IS 'Scheduled maintenance with due dates and status';

-- ============================================================================
-- 11. INDEXES
-- ============================================================================

-- Equipment Inventory
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment_inventory(equipment_code);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment_inventory(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment_inventory(status);
CREATE INDEX IF NOT EXISTS idx_equipment_location ON equipment_inventory(current_location);
CREATE INDEX IF NOT EXISTS idx_equipment_inspection ON equipment_inventory(next_inspection_date);

-- Maintenance Records
CREATE INDEX idx_maint_record_company ON maintenance_records(company_id);
CREATE INDEX idx_maint_record_equipment ON maintenance_records(equipment_id);
CREATE INDEX idx_maint_record_type ON maintenance_records(record_type);
CREATE INDEX idx_maint_record_date ON maintenance_records(maintenance_date DESC);
CREATE INDEX idx_maint_record_work_order ON maintenance_records(work_order_id);
CREATE INDEX idx_maint_record_cert ON maintenance_records(certification_expiry) WHERE is_certification_record = true;

-- Maintenance Receipts
CREATE INDEX idx_maint_receipt_company ON maintenance_receipts(company_id);
CREATE INDEX idx_maint_receipt_equipment ON maintenance_receipts(equipment_id);
CREATE INDEX idx_maint_receipt_date ON maintenance_receipts(receipt_date DESC);
CREATE INDEX idx_maint_receipt_vendor ON maintenance_receipts(vendor_name);
CREATE INDEX idx_maint_receipt_approved ON maintenance_receipts(approved);

-- Maintenance Schedules
CREATE INDEX idx_maint_schedule_company ON maintenance_schedules(company_id);
CREATE INDEX idx_maint_schedule_equipment ON maintenance_schedules(equipment_id);
CREATE INDEX idx_maint_schedule_next_date ON maintenance_schedules(next_due_date) WHERE is_active = true;
CREATE INDEX idx_maint_schedule_active ON maintenance_schedules(is_active);

-- Work Orders
CREATE INDEX idx_work_order_company ON maintenance_work_orders(company_id);
CREATE INDEX idx_work_order_equipment ON maintenance_work_orders(equipment_id);
CREATE INDEX idx_work_order_number ON maintenance_work_orders(work_order_number);
CREATE INDEX idx_work_order_status ON maintenance_work_orders(status);
CREATE INDEX idx_work_order_priority ON maintenance_work_orders(priority);
CREATE INDEX idx_work_order_due ON maintenance_work_orders(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_work_order_assigned ON maintenance_work_orders(assigned_to);

-- Equipment Downtime
CREATE INDEX idx_downtime_company ON equipment_downtime(company_id);
CREATE INDEX idx_downtime_equipment ON equipment_downtime(equipment_id);
CREATE INDEX idx_downtime_started ON equipment_downtime(started_at DESC);
CREATE INDEX idx_downtime_active ON equipment_downtime(ended_at) WHERE ended_at IS NULL;

-- ============================================================================
-- 12. HELPER FUNCTIONS
-- ============================================================================

-- Generate work order number
CREATE OR REPLACE FUNCTION generate_work_order_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_year TEXT;
    v_sequence INTEGER;
    v_wo_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN work_order_number ~ '^WO-[0-9]{2}-[0-9]+$' THEN
                NULLIF(REGEXP_REPLACE(work_order_number, '^WO-[0-9]{2}-', ''), '')::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM maintenance_work_orders
    WHERE company_id = p_company_id
      AND work_order_number LIKE 'WO-' || v_year || '-%';
    
    v_wo_number := 'WO-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_wo_number;
END;
$$;

-- Calculate next maintenance due date
CREATE OR REPLACE FUNCTION calculate_next_maintenance_date(
    p_last_date DATE,
    p_frequency_type schedule_frequency_type,
    p_frequency_value INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_last_date IS NULL THEN
        p_last_date := CURRENT_DATE;
    END IF;
    
    RETURN CASE p_frequency_type
        WHEN 'days' THEN p_last_date + (p_frequency_value || ' days')::INTERVAL
        WHEN 'weeks' THEN p_last_date + (p_frequency_value * 7 || ' days')::INTERVAL
        WHEN 'months' THEN p_last_date + (p_frequency_value || ' months')::INTERVAL
        WHEN 'years' THEN p_last_date + (p_frequency_value || ' years')::INTERVAL
        ELSE p_last_date + (p_frequency_value || ' days')::INTERVAL
    END;
END;
$$;

-- Update schedule after maintenance completion
CREATE OR REPLACE FUNCTION complete_scheduled_maintenance(
    p_schedule_id UUID,
    p_completion_date DATE,
    p_hour_reading NUMERIC DEFAULT NULL
)
RETURNS maintenance_schedules
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule maintenance_schedules;
BEGIN
    UPDATE maintenance_schedules
    SET 
        last_performed_date = p_completion_date,
        next_due_date = calculate_next_maintenance_date(
            p_completion_date, 
            frequency_type, 
            frequency_value
        ),
        last_hour_reading = COALESCE(p_hour_reading, last_hour_reading),
        next_due_hours = CASE 
            WHEN hours_interval IS NOT NULL AND p_hour_reading IS NOT NULL THEN
                p_hour_reading + hours_interval
            ELSE next_due_hours
        END,
        updated_at = NOW()
    WHERE id = p_schedule_id
    RETURNING * INTO v_schedule;
    
    RETURN v_schedule;
END;
$$;

-- Calculate downtime duration on end
CREATE OR REPLACE FUNCTION calculate_downtime_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_downtime_duration
    BEFORE UPDATE OF ended_at ON equipment_downtime
    FOR EACH ROW
    EXECUTE FUNCTION calculate_downtime_duration();

-- Update equipment status on downtime
CREATE OR REPLACE FUNCTION update_equipment_on_downtime()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.ended_at IS NULL THEN
        -- Equipment is down
        UPDATE equipment_inventory
        SET status = 'maintenance', updated_at = NOW()
        WHERE id = NEW.equipment_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        -- Downtime ended, check if any other active downtime
        IF NOT EXISTS (
            SELECT 1 FROM equipment_downtime 
            WHERE equipment_id = NEW.equipment_id 
              AND id != NEW.id 
              AND ended_at IS NULL
        ) THEN
            UPDATE equipment_inventory
            SET status = 'active', updated_at = NOW()
            WHERE id = NEW.equipment_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_equipment_downtime_status
    AFTER INSERT OR UPDATE OF ended_at ON equipment_downtime
    FOR EACH ROW
    EXECUTE FUNCTION update_equipment_on_downtime();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_maintenance_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_maintenance_records_timestamp
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_timestamp();

CREATE TRIGGER tr_maintenance_receipts_timestamp
    BEFORE UPDATE ON maintenance_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_timestamp();

CREATE TRIGGER tr_maintenance_schedules_timestamp
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_timestamp();

CREATE TRIGGER tr_work_orders_timestamp
    BEFORE UPDATE ON maintenance_work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_timestamp();

CREATE TRIGGER tr_downtime_timestamp
    BEFORE UPDATE ON equipment_downtime
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_timestamp();

-- ============================================================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_downtime ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 14. RLS POLICIES
-- ============================================================================

-- Equipment Inventory Policies
CREATE POLICY "equipment_select" ON equipment_inventory
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "equipment_insert" ON equipment_inventory
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor', 'internal_auditor'))
        OR is_super_admin()
    );

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

-- Maintenance Records Policies
CREATE POLICY "maint_records_select" ON maintenance_records
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "maint_records_insert" ON maintenance_records
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "maint_records_update" ON maintenance_records
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Maintenance Receipts Policies
CREATE POLICY "maint_receipts_select" ON maintenance_receipts
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "maint_receipts_insert" ON maintenance_receipts
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "maint_receipts_update" ON maintenance_receipts
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Maintenance Schedules Policies
CREATE POLICY "maint_schedules_select" ON maintenance_schedules
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "maint_schedules_insert" ON maintenance_schedules
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor'))
        OR is_super_admin()
    );

CREATE POLICY "maint_schedules_update" ON maintenance_schedules
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Work Orders Policies
CREATE POLICY "work_orders_select" ON maintenance_work_orders
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "work_orders_insert" ON maintenance_work_orders
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "work_orders_update" ON maintenance_work_orders
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Equipment Downtime Policies
CREATE POLICY "downtime_select" ON equipment_downtime
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "downtime_insert" ON equipment_downtime
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "downtime_update" ON equipment_downtime
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- 15. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on types
GRANT USAGE ON TYPE maintenance_record_type TO authenticated;
GRANT USAGE ON TYPE work_order_status TO authenticated;
GRANT USAGE ON TYPE work_order_priority TO authenticated;
GRANT USAGE ON TYPE schedule_frequency_type TO authenticated;
GRANT USAGE ON TYPE receipt_source TO authenticated;
GRANT USAGE ON TYPE downtime_reason TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION generate_work_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_maintenance_date(DATE, schedule_frequency_type, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_scheduled_maintenance(UUID, DATE, NUMERIC) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE ON maintenance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON maintenance_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON maintenance_work_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON equipment_downtime TO authenticated;

-- Grant view access
GRANT SELECT ON equipment_maintenance_costs TO authenticated;
GRANT SELECT ON equipment_availability TO authenticated;
GRANT SELECT ON upcoming_maintenance TO authenticated;

-- ============================================================================
-- END OF EQUIPMENT MAINTENANCE SYSTEM MIGRATION
-- ============================================================================
