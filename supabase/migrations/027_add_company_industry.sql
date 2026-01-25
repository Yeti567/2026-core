-- ============================================================================
-- Add Industry Field to Companies Table
-- ============================================================================
-- Adds industry/trade selection for companies

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS industry_code TEXT,
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS main_services TEXT[];

-- Add index for industry filtering
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- ============================================================================
-- Add Industry Fields to Registration Tokens
-- ============================================================================
-- Allows industry data to be captured during registration

ALTER TABLE registration_tokens
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS main_services TEXT[];

-- ============================================================================
-- Update use_registration_token function to include industry fields
-- ============================================================================

CREATE OR REPLACE FUNCTION use_registration_token(
    p_token_hash TEXT,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token registration_tokens%ROWTYPE;
    v_company_id UUID;
    v_profile_id UUID;
    v_worker_id UUID;
BEGIN
    -- Get and lock the token
    SELECT * INTO v_token
    FROM registration_tokens
    WHERE token_hash = p_token_hash
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;
    
    IF v_token.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired registration link');
    END IF;
    
    -- Check if company already exists (by WSIB)
    IF EXISTS (SELECT 1 FROM companies WHERE wsib_number = v_token.wsib_number) THEN
        -- Mark token as used
        UPDATE registration_tokens SET status = 'used', used_at = NOW() WHERE id = v_token.id;
        RETURN json_build_object('success', false, 'error', 'Company already registered with this WSIB number');
    END IF;
    
    -- Check if user already has a profile
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User already belongs to a company');
    END IF;
    
    -- Create the company with industry fields
    INSERT INTO companies (
        name,
        wsib_number,
        company_email,
        address,
        city,
        province,
        postal_code,
        phone,
        registration_status,
        industry,
        employee_count,
        years_in_business,
        main_services
    ) VALUES (
        v_token.company_name,
        v_token.wsib_number,
        v_token.company_email,
        v_token.address,
        v_token.city,
        v_token.province,
        v_token.postal_code,
        v_token.phone,
        'active',
        v_token.industry,
        v_token.employee_count,
        v_token.years_in_business,
        v_token.main_services
    )
    RETURNING id INTO v_company_id;
    
    -- Create user profile as first admin
    INSERT INTO user_profiles (
        user_id,
        company_id,
        role,
        first_admin,
        position,
        display_name
    ) VALUES (
        p_user_id,
        v_company_id,
        'admin',
        TRUE,
        v_token.registrant_position,
        v_token.registrant_name
    )
    RETURNING id INTO v_profile_id;
    
    -- Create worker record for the admin
    INSERT INTO workers (
        company_id,
        first_name,
        last_name,
        email,
        position,
        user_id,
        profile_completed,
        hire_date
    ) VALUES (
        v_company_id,
        split_part(v_token.registrant_name, ' ', 1),
        CASE 
            WHEN position(' ' in v_token.registrant_name) > 0 
            THEN substring(v_token.registrant_name from position(' ' in v_token.registrant_name) + 1)
            ELSE ''
        END,
        v_token.registrant_email,
        v_token.registrant_position,
        p_user_id,
        TRUE,
        CURRENT_DATE
    )
    RETURNING id INTO v_worker_id;
    
    -- Mark token as used
    UPDATE registration_tokens
    SET status = 'used',
        used_at = NOW()
    WHERE id = v_token.id;
    
    RETURN json_build_object(
        'success', true,
        'company_id', v_company_id,
        'profile_id', v_profile_id,
        'worker_id', v_worker_id,
        'company_name', v_token.company_name
    );
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
