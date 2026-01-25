-- ============================================================================
-- Company Settings Migration
-- ============================================================================
-- Adds comprehensive company settings including logo, business hours,
-- notifications, locations, fiscal year, and audit timeline

-- ============================================================================
-- Company Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Logo
    logo_url TEXT,
    logo_storage_path TEXT,
    
    -- Business Hours (stored as JSONB for flexibility)
    business_hours JSONB DEFAULT '{}'::jsonb,
    
    -- Notification Preferences (stored as JSONB)
    notification_preferences JSONB DEFAULT '{
        "email_certification_expiries": false,
        "email_incident_reports": false,
        "push_daily_inspections": false,
        "sms_critical_alerts": false
    }'::jsonb,
    
    -- Fiscal Year
    fiscal_year_start_month INTEGER DEFAULT 4, -- April (1-12)
    
    -- COR Audit Timeline
    target_certification_date DATE,
    audit_timeline_months INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(company_id)
);

-- ============================================================================
-- Company Locations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    location_type TEXT DEFAULT 'office', -- 'office', 'shop', 'site', 'mobile'
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_company_locations_company_id ON company_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_locations_active ON company_locations(company_id, is_active) WHERE is_active = true;

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_company_settings_updated_at();

CREATE TRIGGER update_company_locations_updated_at
    BEFORE UPDATE ON company_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_company_settings_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;

-- Company settings: Users can view/update their own company's settings
CREATE POLICY "Users can view their company settings"
    ON company_settings FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update their company settings"
    ON company_settings FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert their company settings"
    ON company_settings FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Company locations: Users can view their company's locations
CREATE POLICY "Users can view their company locations"
    ON company_locations FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage their company locations"
    ON company_locations FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get or create company settings
CREATE OR REPLACE FUNCTION get_or_create_company_settings(p_company_id UUID)
RETURNS company_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings company_settings;
BEGIN
    -- Try to get existing settings
    SELECT * INTO v_settings
    FROM company_settings
    WHERE company_id = p_company_id;
    
    -- If not found, create default settings
    IF v_settings.id IS NULL THEN
        INSERT INTO company_settings (company_id)
        VALUES (p_company_id)
        RETURNING * INTO v_settings;
    END IF;
    
    RETURN v_settings;
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
