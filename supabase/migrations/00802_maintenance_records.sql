-- ============================================================================
-- COMPREHENSIVE MAINTENANCE RECORDS & RECEIPT TRACKING SYSTEM
-- ============================================================================
-- Complete maintenance management including:
-- - Maintenance records with detailed tracking
-- - Attachments (receipts, invoices, photos, certifications)
-- - Recurring maintenance schedules (calendar & usage-based)
-- - Work orders with full lifecycle
-- - Equipment downtime logging
-- - Availability calculations
-- ============================================================================

-- ============================================================================
-- 1. EQUIPMENT INVENTORY TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    equipment_number TEXT NOT NULL,
    equipment_type TEXT NOT NULL,
    name TEXT,
    make TEXT,
    model TEXT,
    serial_number TEXT,
    year_manufactured INTEGER,
    purchase_date DATE,
    purchase_price DECIMAL(12, 2),
    status TEXT NOT NULL DEFAULT 'active',
    current_location TEXT,
    current_hours DECIMAL(10, 2) DEFAULT 0,
    current_km DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, equipment_number)
);

COMMENT ON TABLE equipment_inventory IS 'Master equipment registry';

-- ============================================================================
-- 2. MAINTENANCE RECORDS TABLE (core maintenance tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Record Identification
    record_number TEXT NOT NULL,  -- "MAINT-EQP001-00001"
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'inspection', 'certification', 'repair')),
    maintenance_category TEXT CHECK (maintenance_category IN ('oil_change', 'filter_replacement', 'brake_service', 'load_test', 'tire_service', 'electrical', 'hydraulic', 'engine', 'transmission', 'general', 'other')),
    
    -- Timing
    scheduled_date DATE,          -- When it was supposed to happen
    actual_date DATE NOT NULL,    -- When it actually happened
    completed_at TIMESTAMPTZ,
    due_date DATE,                -- For scheduled maintenance
    
    -- Personnel
    performed_by UUID REFERENCES user_profiles(id),  -- Internal worker
    vendor_name TEXT,                                 -- External service provider
    vendor_contact TEXT,
    technician_name TEXT,                            -- Person who did the work
    
    -- Work Details
    work_description TEXT NOT NULL,   -- What was done
    work_performed TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Checklist: ["Changed oil", "Replaced filter", "Greased fittings"]
    parts_replaced JSONB DEFAULT '[]'::JSONB,       -- [{"part": "Oil Filter", "part_number": "OF-123", "qty": 1, "cost": 25.00}]
    fluids_added JSONB DEFAULT '[]'::JSONB,         -- [{"fluid": "10W-30 Oil", "quantity": "5L", "cost": 45.00}]
    
    -- Odometer/Hour Readings
    odometer_hours DECIMAL(10, 2),    -- Equipment hours at time of service
    odometer_km DECIMAL(10, 2),       -- Equipment kilometers
    
    -- Costs
    cost_labour DECIMAL(10, 2) DEFAULT 0,
    cost_parts DECIMAL(10, 2) DEFAULT 0,
    cost_total DECIMAL(10, 2) GENERATED ALWAYS AS (cost_labour + cost_parts) STORED,
    currency TEXT DEFAULT 'CAD',
    
    -- Status & Results
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    condition_after_service TEXT CHECK (condition_after_service IN ('excellent', 'good', 'fair', 'poor', 'out_of_service')),
    passed_inspection BOOLEAN,
    
    -- Next Service
    next_service_date DATE,
    next_service_hours DECIMAL(10, 2),
    
    -- Notes & Follow-up
    notes TEXT,
    safety_concerns TEXT,            -- Any safety issues identified
    followup_required BOOLEAN DEFAULT false,
    followup_description TEXT,
    
    -- Audit Fields
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(company_id, record_number)
);

COMMENT ON TABLE maintenance_records IS 'Core maintenance record tracking - all service activities';
COMMENT ON COLUMN maintenance_records.record_number IS 'Unique identifier: MAINT-EQP001-00001';
COMMENT ON COLUMN maintenance_records.work_performed IS 'Array of completed checklist items';
COMMENT ON COLUMN maintenance_records.parts_replaced IS 'JSON array: [{"part": "Oil Filter", "part_number": "OF-123", "qty": 1, "cost": 25.00}]';
COMMENT ON COLUMN maintenance_records.fluids_added IS 'JSON array: [{"fluid": "10W-30 Oil", "quantity": "5L", "cost": 45.00}]';

-- ============================================================================
-- 3. MAINTENANCE ATTACHMENTS TABLE (receipts, invoices, photos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- File Information
    attachment_type TEXT NOT NULL CHECK (attachment_type IN (
        'receipt', 'invoice', 'service_report', 'photo_before', 'photo_after', 
        'certification', 'warranty', 'manual', 'checklist', 'quote', 'other'
    )),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,           -- Path in Supabase Storage
    file_size_bytes BIGINT,
    file_type TEXT,                    -- 'application/pdf', 'image/jpeg', etc.
    thumbnail_path TEXT,               -- For images
    
    -- Metadata
    description TEXT,
    attachment_date DATE,              -- Date on receipt/invoice
    
    -- Extracted/Parsed Data (from OCR or manual entry)
    vendor_name TEXT,
    amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'CAD',
    
    -- OCR Data
    extracted_text TEXT,               -- Full OCR text from image/PDF
    metadata JSONB DEFAULT '{}'::JSONB,  -- Extracted data: {"invoice_number": "INV-12345", "po_number": "PO-67890", "tax": 45.50}
    
    -- Upload Information
    uploaded_by UUID REFERENCES user_profiles(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_via TEXT DEFAULT 'web' CHECK (uploaded_via IN ('web', 'mobile', 'email', 'api')),
    
    -- Organization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ["oil_change", "annual_service"]
    is_archived BOOLEAN DEFAULT false
);

COMMENT ON TABLE maintenance_attachments IS 'Receipts, invoices, photos, and documents attached to equipment/maintenance';
COMMENT ON COLUMN maintenance_attachments.metadata IS 'Extracted data: {"invoice_number": "INV-12345", "po_number": "PO-67890"}';
COMMENT ON COLUMN maintenance_attachments.tags IS 'Searchable tags for categorization';

-- ============================================================================
-- 4. MAINTENANCE SCHEDULES TABLE (recurring maintenance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Schedule Information
    schedule_name TEXT NOT NULL,       -- "Oil Change", "Annual Inspection"
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'inspection', 'certification')),
    maintenance_category TEXT,
    
    -- Frequency Settings
    frequency_type TEXT NOT NULL CHECK (frequency_type IN ('calendar', 'usage_hours', 'usage_km', 'one_time')),
    frequency_value INTEGER NOT NULL,  -- Number of days, hours, or km
    frequency_unit TEXT CHECK (frequency_unit IN ('days', 'weeks', 'months', 'years', 'hours', 'kilometers')),
    
    -- Last Performed
    last_performed_date DATE,
    last_performed_hours DECIMAL(10, 2),
    last_performed_km DECIMAL(10, 2),
    last_maintenance_record_id UUID REFERENCES maintenance_records(id),
    
    -- Next Due
    next_due_date DATE,
    next_due_hours DECIMAL(10, 2),
    next_due_km DECIMAL(10, 2),
    
    -- Estimates
    estimated_duration_hours DECIMAL(5, 2),  -- How long maintenance takes
    estimated_cost DECIMAL(10, 2),
    
    -- Assignment
    assigned_to UUID REFERENCES user_profiles(id),
    vendor_name TEXT,
    
    -- Work Details
    work_description TEXT,
    checklist_items TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Standard items for this maintenance
    parts_required JSONB DEFAULT '[]'::JSONB,        -- [{"part": "Oil Filter", "part_number": "OF-123"}]
    
    -- Compliance
    is_mandatory BOOLEAN DEFAULT false,   -- Legally required?
    regulatory_reference TEXT,            -- "O.Reg.851 s.7"
    
    -- Reminders
    reminder_days_before INTEGER DEFAULT 7,
    reminder_hours_before INTEGER,        -- For usage-based
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

COMMENT ON TABLE maintenance_schedules IS 'Recurring maintenance schedules - calendar and usage-based';
COMMENT ON COLUMN maintenance_schedules.frequency_type IS 'calendar=date-based, usage_hours=hour meter, usage_km=odometer, one_time=single event';
COMMENT ON COLUMN maintenance_schedules.is_mandatory IS 'true if legally required for compliance';

-- ============================================================================
-- 5. WORK ORDERS TABLE (maintenance work orders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number TEXT NOT NULL,   -- "WO-2025-00001"
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Work Order Details
    title TEXT NOT NULL,               -- "Replace Hydraulic Hose"
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('emergency', 'urgent', 'routine')),
    
    -- Type & Source
    work_order_type TEXT NOT NULL CHECK (work_order_type IN (
        'scheduled_maintenance', 'breakdown', 'inspection', 'modification', 
        'installation', 'safety_issue', 'operator_report'
    )),
    maintenance_schedule_id UUID REFERENCES maintenance_schedules(id),
    
    -- Requester
    requested_by UUID REFERENCES user_profiles(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_source TEXT DEFAULT 'manual' CHECK (request_source IN ('manual', 'schedule', 'inspection', 'operator', 'sensor')),
    
    -- Assignment
    assigned_to UUID REFERENCES user_profiles(id),
    assigned_at TIMESTAMPTZ,
    vendor_name TEXT,
    
    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'approved', 'assigned', 'in_progress', 
        'on_hold', 'parts_ordered', 'completed', 'cancelled', 'rejected'
    )),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Equipment Status During Work
    equipment_status TEXT DEFAULT 'in_service' CHECK (equipment_status IN ('in_service', 'out_of_service', 'limited_use')),
    downtime_start TIMESTAMPTZ,
    downtime_end TIMESTAMPTZ,
    downtime_hours DECIMAL(10, 2),     -- Calculated from start/end
    
    -- Costs
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    
    -- Linked Records
    linked_maintenance_record_id UUID REFERENCES maintenance_records(id),
    
    -- Completion
    completion_notes TEXT,
    work_performed TEXT[] DEFAULT ARRAY[]::TEXT[],
    parts_used JSONB DEFAULT '[]'::JSONB,
    
    -- Approval
    supervisor_approval UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(company_id, work_order_number)
);

COMMENT ON TABLE work_orders IS 'Work orders for maintenance tasks with full lifecycle tracking';
COMMENT ON COLUMN work_orders.work_order_number IS 'Unique identifier: WO-2025-00001';
COMMENT ON COLUMN work_orders.priority IS 'critical=safety issue/production stop, high=needed soon, medium=routine, low=when convenient';

-- ============================================================================
-- 6. EQUIPMENT DOWNTIME LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_downtime_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Linked Records
    work_order_id UUID REFERENCES work_orders(id),
    maintenance_record_id UUID REFERENCES maintenance_records(id),
    
    -- Downtime Period
    downtime_start TIMESTAMPTZ NOT NULL,
    downtime_end TIMESTAMPTZ,
    downtime_duration_hours DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN downtime_end IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (downtime_end - downtime_start)) / 3600
            ELSE NULL
        END
    ) STORED,
    
    -- Reason & Description
    reason TEXT NOT NULL CHECK (reason IN (
        'scheduled_maintenance', 'breakdown', 'repair', 'inspection', 
        'accident', 'operator_unavailable', 'weather', 'parts_unavailable', 'other'
    )),
    description TEXT,
    failure_mode TEXT,                 -- What failed
    root_cause TEXT,                   -- Why it failed
    
    -- Impact Assessment
    impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('critical', 'high', 'medium', 'low')),
    affected_jobsites UUID[],          -- Array of jobsite IDs affected
    production_impact TEXT,            -- Description of production impact
    estimated_cost_impact DECIMAL(10, 2),
    
    -- Resolution
    resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES user_profiles(id),
    
    -- Audit Fields
    reported_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE equipment_downtime_log IS 'Track when equipment is unavailable for use';
COMMENT ON COLUMN equipment_downtime_log.downtime_duration_hours IS 'Automatically calculated from start/end times';

-- ============================================================================
-- 7. FUNCTION: Generate Maintenance Record Number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_maintenance_record_number(
    p_equipment_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_equipment_number TEXT;
    v_sequence INTEGER;
    v_record_number TEXT;
BEGIN
    -- Get equipment number
    SELECT equipment_number INTO v_equipment_number
    FROM equipment_inventory
    WHERE id = p_equipment_id;
    
    IF v_equipment_number IS NULL THEN
        RAISE EXCEPTION 'Equipment not found: %', p_equipment_id;
    END IF;
    
    -- Get next sequence for this equipment
    SELECT COALESCE(MAX(
        CASE 
            WHEN record_number ~ '-[0-9]+$' THEN
                CAST(SUBSTRING(record_number FROM '-([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM maintenance_records
    WHERE equipment_id = p_equipment_id;
    
    -- Format: MAINT-EQP001-00001
    v_record_number := 'MAINT-' || v_equipment_number || '-' || LPAD(v_sequence::TEXT, 5, '0');
    
    RETURN v_record_number;
END;
$$;

COMMENT ON FUNCTION generate_maintenance_record_number IS 'Generates unique maintenance record number: MAINT-EQP001-00001';

-- ============================================================================
-- 8. FUNCTION: Generate Work Order Number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_work_order_number(
    p_company_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_year TEXT;
    v_sequence INTEGER;
    v_wo_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get next sequence for this year
    SELECT COALESCE(MAX(
        CASE 
            WHEN work_order_number ~ '-[0-9]+$' THEN
                CAST(SUBSTRING(work_order_number FROM '-([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM work_orders
    WHERE company_id = p_company_id
      AND work_order_number LIKE 'WO-' || v_year || '-%';
    
    -- Format: WO-2025-00001
    v_wo_number := 'WO-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
    
    RETURN v_wo_number;
END;
$$;

COMMENT ON FUNCTION generate_work_order_number IS 'Generates unique work order number: WO-2025-00001';

-- ============================================================================
-- 9. FUNCTION: Calculate Next Maintenance Due Date
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_maintenance_due(
    p_schedule_id UUID
) RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule RECORD;
    v_next_due DATE;
    v_equipment RECORD;
    v_avg_daily_hours DECIMAL;
    v_hours_until_due DECIMAL;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule
    FROM maintenance_schedules
    WHERE id = p_schedule_id;
    
    IF v_schedule IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calendar-based scheduling
    IF v_schedule.frequency_type = 'calendar' THEN
        IF v_schedule.last_performed_date IS NULL THEN
            v_next_due := CURRENT_DATE;
        ELSE
            CASE v_schedule.frequency_unit
                WHEN 'days' THEN
                    v_next_due := v_schedule.last_performed_date + (v_schedule.frequency_value || ' days')::INTERVAL;
                WHEN 'weeks' THEN
                    v_next_due := v_schedule.last_performed_date + (v_schedule.frequency_value * 7 || ' days')::INTERVAL;
                WHEN 'months' THEN
                    v_next_due := v_schedule.last_performed_date + (v_schedule.frequency_value || ' months')::INTERVAL;
                WHEN 'years' THEN
                    v_next_due := v_schedule.last_performed_date + (v_schedule.frequency_value || ' years')::INTERVAL;
                ELSE
                    v_next_due := v_schedule.last_performed_date + (v_schedule.frequency_value || ' days')::INTERVAL;
            END CASE;
        END IF;
        
    -- Usage-based scheduling (hours)
    ELSIF v_schedule.frequency_type = 'usage_hours' THEN
        -- Get current equipment hours
        SELECT * INTO v_equipment
        FROM equipment_inventory
        WHERE id = v_schedule.equipment_id;
        
        IF v_equipment.current_hours IS NOT NULL THEN
            -- Calculate average daily usage from maintenance history
            SELECT COALESCE(
                AVG(
                    CASE 
                        WHEN prev_date IS NOT NULL AND prev_hours IS NOT NULL 
                             AND actual_date > prev_date 
                             AND odometer_hours > prev_hours THEN
                            (odometer_hours - prev_hours) / GREATEST(1, EXTRACT(DAY FROM (actual_date - prev_date)))
                        ELSE NULL
                    END
                ),
                4  -- Default 4 hours/day if no history
            )
            INTO v_avg_daily_hours
            FROM (
                SELECT 
                    odometer_hours,
                    actual_date,
                    LAG(odometer_hours) OVER (ORDER BY actual_date) as prev_hours,
                    LAG(actual_date) OVER (ORDER BY actual_date) as prev_date
                FROM maintenance_records
                WHERE equipment_id = v_schedule.equipment_id
                  AND odometer_hours IS NOT NULL
                ORDER BY actual_date DESC
                LIMIT 10
            ) subq;
            
            -- Calculate hours until next service
            v_hours_until_due := v_schedule.next_due_hours - v_equipment.current_hours;
            
            IF v_hours_until_due > 0 THEN
                -- Estimate date based on average usage
                v_next_due := CURRENT_DATE + CEIL(v_hours_until_due / GREATEST(v_avg_daily_hours, 0.1))::INTEGER;
            ELSE
                -- Already overdue
                v_next_due := CURRENT_DATE;
            END IF;
        ELSE
            -- No hour data, default to 30 days
            v_next_due := COALESCE(v_schedule.last_performed_date, CURRENT_DATE) + 30;
        END IF;
        
    -- Usage-based scheduling (km)
    ELSIF v_schedule.frequency_type = 'usage_km' THEN
        -- Similar logic for kilometers
        SELECT * INTO v_equipment
        FROM equipment_inventory
        WHERE id = v_schedule.equipment_id;
        
        IF v_equipment.current_km IS NOT NULL AND v_schedule.next_due_km IS NOT NULL THEN
            -- Estimate based on 50km/day average if no history
            v_next_due := CURRENT_DATE + CEIL((v_schedule.next_due_km - v_equipment.current_km) / 50.0)::INTEGER;
            IF v_next_due < CURRENT_DATE THEN
                v_next_due := CURRENT_DATE;
            END IF;
        ELSE
            v_next_due := COALESCE(v_schedule.last_performed_date, CURRENT_DATE) + 30;
        END IF;
        
    -- One-time
    ELSIF v_schedule.frequency_type = 'one_time' THEN
        v_next_due := v_schedule.next_due_date;
    END IF;
    
    RETURN v_next_due;
END;
$$;

COMMENT ON FUNCTION calculate_next_maintenance_due IS 'Calculates next due date based on schedule type (calendar, hours, km)';

-- ============================================================================
-- 10. FUNCTION: Calculate Equipment Availability
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_equipment_availability(
    p_equipment_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total_hours DECIMAL;
    v_downtime_hours DECIMAL;
    v_availability DECIMAL;
BEGIN
    -- Calculate total hours in period (24 hours/day)
    v_total_hours := EXTRACT(EPOCH FROM (p_end_date::TIMESTAMP - p_start_date::TIMESTAMP)) / 3600;
    
    IF v_total_hours <= 0 THEN
        RETURN 100.00;
    END IF;
    
    -- Calculate downtime hours within the period
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
            LEAST(COALESCE(downtime_end, NOW()), p_end_date::TIMESTAMP) - 
            GREATEST(downtime_start, p_start_date::TIMESTAMP)
        )) / 3600
    ), 0)
    INTO v_downtime_hours
    FROM equipment_downtime_log
    WHERE equipment_id = p_equipment_id
      AND downtime_start <= p_end_date::TIMESTAMP
      AND (downtime_end IS NULL OR downtime_end >= p_start_date::TIMESTAMP);
    
    -- Ensure downtime doesn't exceed total time
    v_downtime_hours := LEAST(v_downtime_hours, v_total_hours);
    
    -- Calculate availability percentage
    v_availability := ((v_total_hours - v_downtime_hours) / v_total_hours) * 100;
    
    RETURN ROUND(GREATEST(v_availability, 0), 2);
END;
$$;

COMMENT ON FUNCTION calculate_equipment_availability IS 'Calculates equipment availability percentage for a given period';

-- ============================================================================
-- 11. FUNCTION: Update Schedule After Maintenance Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_schedule_after_maintenance(
    p_schedule_id UUID,
    p_maintenance_record_id UUID,
    p_completed_date DATE,
    p_completed_hours DECIMAL DEFAULT NULL,
    p_completed_km DECIMAL DEFAULT NULL
) RETURNS maintenance_schedules
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule maintenance_schedules;
BEGIN
    UPDATE maintenance_schedules
    SET 
        last_performed_date = p_completed_date,
        last_performed_hours = COALESCE(p_completed_hours, last_performed_hours),
        last_performed_km = COALESCE(p_completed_km, last_performed_km),
        last_maintenance_record_id = p_maintenance_record_id,
        next_due_date = CASE 
            WHEN frequency_type = 'calendar' THEN
                CASE frequency_unit
                    WHEN 'days' THEN p_completed_date + (frequency_value || ' days')::INTERVAL
                    WHEN 'weeks' THEN p_completed_date + (frequency_value * 7 || ' days')::INTERVAL
                    WHEN 'months' THEN p_completed_date + (frequency_value || ' months')::INTERVAL
                    WHEN 'years' THEN p_completed_date + (frequency_value || ' years')::INTERVAL
                    ELSE p_completed_date + (frequency_value || ' days')::INTERVAL
                END
            ELSE next_due_date
        END,
        next_due_hours = CASE 
            WHEN frequency_type = 'usage_hours' AND p_completed_hours IS NOT NULL THEN
                p_completed_hours + frequency_value
            ELSE next_due_hours
        END,
        next_due_km = CASE 
            WHEN frequency_type = 'usage_km' AND p_completed_km IS NOT NULL THEN
                p_completed_km + frequency_value
            ELSE next_due_km
        END,
        reminder_sent = false,
        reminder_sent_at = NULL,
        updated_at = NOW()
    WHERE id = p_schedule_id
    RETURNING * INTO v_schedule;
    
    RETURN v_schedule;
END;
$$;

COMMENT ON FUNCTION update_schedule_after_maintenance IS 'Updates schedule with new due date/hours after maintenance completion';

-- ============================================================================
-- 12. VIEW: Equipment Maintenance Summary
-- ============================================================================

CREATE OR REPLACE VIEW equipment_maintenance_summary AS
SELECT 
    ei.id AS equipment_id,
    ei.equipment_number,
    ei.equipment_type,
    ei.name AS equipment_name,
    ei.company_id,
    ei.status AS equipment_status,
    ei.current_hours,
    ei.current_km,
    
    -- Maintenance counts
    COUNT(DISTINCT mr.id) AS total_maintenance_records,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.maintenance_type = 'preventive') AS preventive_count,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.maintenance_type = 'corrective') AS corrective_count,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.maintenance_type = 'inspection') AS inspection_count,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.maintenance_type = 'certification') AS certification_count,
    
    -- Last maintenance
    MAX(mr.actual_date) AS last_maintenance_date,
    MAX(mr.actual_date) FILTER (WHERE mr.maintenance_type = 'preventive') AS last_preventive_date,
    
    -- Next maintenance due
    MIN(ms.next_due_date) FILTER (WHERE ms.is_active = true AND ms.next_due_date >= CURRENT_DATE) AS next_maintenance_due,
    
    -- Overdue count
    COUNT(DISTINCT ms.id) FILTER (WHERE ms.is_active = true AND ms.next_due_date < CURRENT_DATE) AS overdue_schedules,
    
    -- Costs (last 12 months)
    COALESCE(SUM(mr.cost_total) FILTER (WHERE mr.actual_date >= CURRENT_DATE - INTERVAL '12 months'), 0) AS maintenance_cost_12m,
    COALESCE(SUM(mr.cost_total), 0) AS total_maintenance_cost,
    
    -- Attachments
    COUNT(DISTINCT ma.id) AS total_attachments,
    COUNT(DISTINCT ma.id) FILTER (WHERE ma.attachment_type = 'receipt') AS receipt_count,
    
    -- Work orders
    COUNT(DISTINCT wo.id) AS total_work_orders,
    COUNT(DISTINCT wo.id) FILTER (WHERE wo.status IN ('submitted', 'assigned', 'in_progress')) AS open_work_orders,
    COUNT(DISTINCT wo.id) FILTER (WHERE wo.priority = 'critical' AND wo.status NOT IN ('completed', 'cancelled')) AS critical_work_orders,
    
    -- Downtime (last 30 days)
    COALESCE(SUM(edl.downtime_duration_hours) FILTER (WHERE edl.downtime_start >= CURRENT_DATE - INTERVAL '30 days'), 0) AS downtime_hours_30d,
    
    -- Availability (last 30 days)
    calculate_equipment_availability(ei.id, CURRENT_DATE - 30, CURRENT_DATE) AS availability_30_days
    
FROM equipment_inventory ei
LEFT JOIN maintenance_records mr ON mr.equipment_id = ei.id
LEFT JOIN maintenance_schedules ms ON ms.equipment_id = ei.id
LEFT JOIN maintenance_attachments ma ON ma.equipment_id = ei.id AND ma.is_archived = false
LEFT JOIN work_orders wo ON wo.equipment_id = ei.id
LEFT JOIN equipment_downtime_log edl ON edl.equipment_id = ei.id
GROUP BY ei.id, ei.equipment_number, ei.equipment_type, ei.name, ei.company_id, 
         ei.status, ei.current_hours, ei.current_km;

COMMENT ON VIEW equipment_maintenance_summary IS 'Comprehensive maintenance statistics per equipment';

-- ============================================================================
-- 13. VIEW: Upcoming Maintenance Schedule
-- ============================================================================

CREATE OR REPLACE VIEW upcoming_maintenance_schedule AS
SELECT 
    ms.id AS schedule_id,
    ms.company_id,
    ms.equipment_id,
    ei.equipment_number,
    ei.name AS equipment_name,
    ei.equipment_type,
    ms.schedule_name,
    ms.maintenance_type,
    ms.maintenance_category,
    ms.frequency_type,
    ms.frequency_value,
    ms.frequency_unit,
    ms.next_due_date,
    ms.next_due_hours,
    ms.next_due_km,
    ei.current_hours,
    ei.current_km,
    ms.estimated_duration_hours,
    ms.estimated_cost,
    ms.assigned_to,
    ms.vendor_name,
    ms.is_mandatory,
    ms.regulatory_reference,
    
    -- Days until due
    CASE 
        WHEN ms.next_due_date IS NOT NULL THEN
            ms.next_due_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_due,
    
    -- Hours until due
    CASE 
        WHEN ms.next_due_hours IS NOT NULL AND ei.current_hours IS NOT NULL THEN
            ms.next_due_hours - ei.current_hours
        ELSE NULL
    END AS hours_until_due,
    
    -- Status
    CASE
        WHEN ms.next_due_date IS NOT NULL AND ms.next_due_date < CURRENT_DATE THEN 'overdue'
        WHEN ms.next_due_date IS NOT NULL AND ms.next_due_date <= CURRENT_DATE + ms.reminder_days_before THEN 'due_soon'
        WHEN ms.next_due_hours IS NOT NULL AND ei.current_hours IS NOT NULL 
             AND ms.next_due_hours <= ei.current_hours THEN 'overdue'
        WHEN ms.next_due_hours IS NOT NULL AND ei.current_hours IS NOT NULL 
             AND ms.reminder_hours_before IS NOT NULL
             AND ms.next_due_hours <= ei.current_hours + ms.reminder_hours_before THEN 'due_soon'
        ELSE 'scheduled'
    END AS schedule_status,
    
    ms.last_performed_date,
    ms.last_performed_hours

FROM maintenance_schedules ms
JOIN equipment_inventory ei ON ei.id = ms.equipment_id
WHERE ms.is_active = true
ORDER BY 
    CASE 
        WHEN ms.next_due_date < CURRENT_DATE THEN 0  -- Overdue first
        ELSE 1
    END,
    ms.next_due_date NULLS LAST;

COMMENT ON VIEW upcoming_maintenance_schedule IS 'Active maintenance schedules with due status';

-- ============================================================================
-- 14. VIEW: Work Order Status Summary
-- ============================================================================

CREATE OR REPLACE VIEW work_order_status_summary AS
SELECT 
    wo.company_id,
    wo.status,
    wo.priority,
    COUNT(*) AS count,
    SUM(wo.estimated_cost) AS total_estimated_cost,
    SUM(wo.actual_cost) FILTER (WHERE wo.status = 'completed') AS total_actual_cost,
    AVG(EXTRACT(EPOCH FROM (wo.actual_end - wo.actual_start)) / 3600) 
        FILTER (WHERE wo.actual_start IS NOT NULL AND wo.actual_end IS NOT NULL) AS avg_completion_hours,
    AVG(wo.downtime_hours) AS avg_downtime_hours
FROM work_orders wo
GROUP BY wo.company_id, wo.status, wo.priority;

COMMENT ON VIEW work_order_status_summary IS 'Work order statistics grouped by status and priority';

-- ============================================================================
-- 15. INDEXES
-- ============================================================================

-- Maintenance Records
CREATE INDEX IF NOT EXISTS idx_maintenance_records_equipment ON maintenance_records(equipment_id, actual_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_company ON maintenance_records(company_id, actual_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type ON maintenance_records(company_id, maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON maintenance_records(company_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_scheduled ON maintenance_records(company_id, scheduled_date) 
    WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_maintenance_records_followup ON maintenance_records(company_id, followup_required) 
    WHERE followup_required = true;

-- Maintenance Attachments
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_equipment ON maintenance_attachments(equipment_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_record ON maintenance_attachments(maintenance_record_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_company ON maintenance_attachments(company_id, attachment_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_type ON maintenance_attachments(attachment_type, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_tags ON maintenance_attachments USING gin(tags);

-- Maintenance Schedules
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_equipment ON maintenance_schedules(equipment_id, is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due ON maintenance_schedules(company_id, next_due_date) 
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due_hours ON maintenance_schedules(company_id, next_due_hours) 
    WHERE is_active = true AND next_due_hours IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_mandatory ON maintenance_schedules(company_id, is_mandatory) 
    WHERE is_mandatory = true AND is_active = true;

-- Work Orders
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(company_id, status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders(equipment_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(company_id, priority) 
    WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned ON work_orders(assigned_to, status) 
    WHERE assigned_to IS NOT NULL AND status IN ('assigned', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(work_order_number);

-- Equipment Downtime Log
CREATE INDEX IF NOT EXISTS idx_downtime_equipment ON equipment_downtime_log(equipment_id, downtime_start DESC);
CREATE INDEX IF NOT EXISTS idx_downtime_company ON equipment_downtime_log(company_id, downtime_start DESC);
CREATE INDEX IF NOT EXISTS idx_downtime_active ON equipment_downtime_log(equipment_id) 
    WHERE downtime_end IS NULL;
CREATE INDEX IF NOT EXISTS idx_downtime_reason ON equipment_downtime_log(company_id, reason);

-- Equipment Inventory
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_number ON equipment_inventory(company_id, equipment_number);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment_inventory(company_id, status);

-- ============================================================================
-- 16. TRIGGERS
-- ============================================================================

-- Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER tr_maintenance_records_updated_at
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_maintenance_schedules_updated_at
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_equipment_downtime_updated_at
    BEFORE UPDATE ON equipment_downtime_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_equipment_inventory_updated_at
    BEFORE UPDATE ON equipment_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate record number trigger
CREATE OR REPLACE FUNCTION auto_generate_maintenance_record_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.record_number IS NULL OR NEW.record_number = '' THEN
        NEW.record_number := generate_maintenance_record_number(NEW.equipment_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_maintenance_record_number
    BEFORE INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_maintenance_record_number();

-- Auto-generate work order number trigger
CREATE OR REPLACE FUNCTION auto_generate_work_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
        NEW.work_order_number := generate_work_order_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_work_order_number
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_work_order_number();

-- Auto-calculate work order downtime hours
CREATE OR REPLACE FUNCTION calculate_work_order_downtime()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.downtime_start IS NOT NULL AND NEW.downtime_end IS NOT NULL THEN
        NEW.downtime_hours := EXTRACT(EPOCH FROM (NEW.downtime_end - NEW.downtime_start)) / 3600;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_work_order_downtime
    BEFORE INSERT OR UPDATE OF downtime_start, downtime_end ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_work_order_downtime();

-- ============================================================================
-- 17. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_downtime_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 18. RLS POLICIES
-- ============================================================================

-- Equipment Inventory Policies
DROP POLICY IF EXISTS "equipment_select" ON equipment_inventory;
CREATE POLICY "equipment_select" ON equipment_inventory
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "equipment_insert" ON equipment_inventory;
CREATE POLICY "equipment_insert" ON equipment_inventory
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "equipment_update" ON equipment_inventory;
CREATE POLICY "equipment_update" ON equipment_inventory
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "equipment_delete" ON equipment_inventory;
CREATE POLICY "equipment_delete" ON equipment_inventory
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );

-- Maintenance Records Policies
DROP POLICY IF EXISTS "maintenance_records_select" ON maintenance_records;
CREATE POLICY "maintenance_records_select" ON maintenance_records
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "maintenance_records_insert" ON maintenance_records;
CREATE POLICY "maintenance_records_insert" ON maintenance_records
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "maintenance_records_update" ON maintenance_records;
CREATE POLICY "maintenance_records_update" ON maintenance_records
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Maintenance Attachments Policies
DROP POLICY IF EXISTS "maintenance_attachments_select" ON maintenance_attachments;
CREATE POLICY "maintenance_attachments_select" ON maintenance_attachments
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "maintenance_attachments_insert" ON maintenance_attachments;
CREATE POLICY "maintenance_attachments_insert" ON maintenance_attachments
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "maintenance_attachments_update" ON maintenance_attachments;
CREATE POLICY "maintenance_attachments_update" ON maintenance_attachments
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "maintenance_attachments_delete" ON maintenance_attachments;
CREATE POLICY "maintenance_attachments_delete" ON maintenance_attachments
    FOR DELETE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

-- Maintenance Schedules Policies
DROP POLICY IF EXISTS "maintenance_schedules_select" ON maintenance_schedules;
CREATE POLICY "maintenance_schedules_select" ON maintenance_schedules
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "maintenance_schedules_insert" ON maintenance_schedules;
CREATE POLICY "maintenance_schedules_insert" ON maintenance_schedules
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'supervisor'))
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "maintenance_schedules_update" ON maintenance_schedules;
CREATE POLICY "maintenance_schedules_update" ON maintenance_schedules
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "maintenance_schedules_delete" ON maintenance_schedules;
CREATE POLICY "maintenance_schedules_delete" ON maintenance_schedules
    FOR DELETE TO authenticated
    USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin')
        OR is_super_admin()
    );

-- Work Orders Policies
DROP POLICY IF EXISTS "work_orders_select" ON work_orders;
CREATE POLICY "work_orders_select" ON work_orders
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "work_orders_insert" ON work_orders;
CREATE POLICY "work_orders_insert" ON work_orders
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "work_orders_update" ON work_orders;
CREATE POLICY "work_orders_update" ON work_orders
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Equipment Downtime Policies
DROP POLICY IF EXISTS "downtime_select" ON equipment_downtime_log;
CREATE POLICY "downtime_select" ON equipment_downtime_log
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "downtime_insert" ON equipment_downtime_log;
CREATE POLICY "downtime_insert" ON equipment_downtime_log
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "downtime_update" ON equipment_downtime_log;
CREATE POLICY "downtime_update" ON equipment_downtime_log
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- 19. GRANT PERMISSIONS
-- ============================================================================

-- Grant function execution
GRANT EXECUTE ON FUNCTION generate_maintenance_record_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_work_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_maintenance_due(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_equipment_availability(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_schedule_after_maintenance(UUID, UUID, DATE, DECIMAL, DECIMAL) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE ON maintenance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON work_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON equipment_downtime_log TO authenticated;

-- Grant view access
GRANT SELECT ON equipment_maintenance_summary TO authenticated;
GRANT SELECT ON upcoming_maintenance_schedule TO authenticated;
GRANT SELECT ON work_order_status_summary TO authenticated;

-- ============================================================================
-- END OF MAINTENANCE RECORDS MIGRATION
-- ============================================================================
