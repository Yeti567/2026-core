-- ============================================================================
-- Company Registration Enhancement Migration
-- ============================================================================
-- This migration adds:
-- - Extended company fields (city, province, postal_code, phone)
-- - Registration tokens table for magic link flow
-- - Registration attempts table for rate limiting/fraud detection
-- - First admin tracking in user_profiles
-- ============================================================================

-- ============================================================================
-- 1. EXTEND COMPANIES TABLE
-- ============================================================================

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'ON',
    ADD COLUMN IF NOT EXISTS postal_code TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS company_email TEXT,
    ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'active', 'suspended'));

-- Add unique constraint on WSIB number (must be unique across all companies)
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_wsib_number ON companies(wsib_number) WHERE wsib_number IS NOT NULL;

-- ============================================================================
-- 2. EXTEND USER_PROFILES TABLE
-- ============================================================================

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS first_admin BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS position TEXT,
    ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ============================================================================
-- 3. CREATE REGISTRATION TOKENS TABLE
-- ============================================================================
-- Stores temporary tokens for company registration magic links

CREATE TABLE IF NOT EXISTS registration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Token info
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Company registration data (stored until verification)
    company_name TEXT NOT NULL,
    wsib_number TEXT NOT NULL,
    company_email TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    phone TEXT NOT NULL,
    
    -- Registrant info
    registrant_name TEXT NOT NULL,
    registrant_position TEXT NOT NULL,
    registrant_email TEXT NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMPTZ,
    
    -- IP tracking for security
    ip_address TEXT,
    user_agent TEXT
);

-- Indexes
CREATE INDEX idx_registration_tokens_hash ON registration_tokens(token_hash);
CREATE INDEX idx_registration_tokens_email ON registration_tokens(registrant_email);
CREATE INDEX idx_registration_tokens_wsib ON registration_tokens(wsib_number);
CREATE INDEX idx_registration_tokens_status ON registration_tokens(status) WHERE status = 'pending';

-- ============================================================================
-- 4. CREATE REGISTRATION ATTEMPTS TABLE
-- ============================================================================
-- Logs all registration attempts for rate limiting and fraud detection

CREATE TABLE IF NOT EXISTS registration_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request info
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    
    -- Submitted data (for audit)
    company_name TEXT,
    wsib_number TEXT,
    registrant_email TEXT,
    
    -- Result
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_code TEXT,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rate limiting queries
CREATE INDEX idx_registration_attempts_ip_time ON registration_attempts(ip_address, created_at);
CREATE INDEX idx_registration_attempts_email_time ON registration_attempts(registrant_email, created_at);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

-- Registration tokens - service role only (no direct client access)
ALTER TABLE registration_tokens ENABLE ROW LEVEL SECURITY;

-- No policies for registration_tokens - only service role can access
-- This ensures tokens can only be accessed through server-side API routes

-- Registration attempts - service role only
ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;

-- No policies for registration_attempts - only service role can access

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to check rate limit (3 attempts per hour per IP)
CREATE OR REPLACE FUNCTION check_registration_rate_limit(p_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attempt_count
    FROM registration_attempts
    WHERE ip_address = p_ip_address
      AND created_at > NOW() - INTERVAL '1 hour';
    
    RETURN attempt_count < 3;
END;
$$;

-- Function to validate and use registration token
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
    
    -- Create the company
    INSERT INTO companies (
        name,
        wsib_number,
        company_email,
        address,
        city,
        province,
        postal_code,
        phone,
        registration_status
    ) VALUES (
        v_token.company_name,
        v_token.wsib_number,
        v_token.company_email,
        v_token.address,
        v_token.city,
        v_token.province,
        v_token.postal_code,
        v_token.phone,
        'active'
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION use_registration_token(TEXT, UUID) TO authenticated;

-- ============================================================================
-- 7. CLEANUP JOB FUNCTION
-- ============================================================================
-- Call this periodically to clean up expired tokens

CREATE OR REPLACE FUNCTION cleanup_expired_registration_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM registration_tokens
        WHERE status = 'pending' AND expires_at < NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
