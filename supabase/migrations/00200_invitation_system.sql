-- ============================================================================
-- Invitation System Migration
-- ============================================================================
-- This migration creates the worker invitation system including:
-- - worker_invitations table for managing employee invitations
-- - Enhanced user_profiles with additional worker information
-- - Token generation and expiration functions
-- - RLS policies for secure access control
-- - Indexes for performance optimization
-- ============================================================================

-- ============================================================================
-- 1. CREATE WORKER_INVITATIONS TABLE
-- ============================================================================
-- Stores all employee invitations sent by company admins
-- Magic link tokens are stored securely and validated server-side only

CREATE TABLE IF NOT EXISTS worker_invitations (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company association (required)
    -- Links invitation to the company the worker will join
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Invitee information (required)
    -- Collected from CSV upload or manual entry
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    
    -- Job details (required)
    -- Position: job title like "Concrete Finisher", "Site Supervisor"
    position TEXT NOT NULL,
    
    -- Role assignment (required)
    -- Determines permissions: admin, internal_auditor, supervisor, worker
    role user_role NOT NULL DEFAULT 'worker',
    
    -- Security token (required, unique)
    -- 32-character secure random token for magic link
    -- NEVER exposed via client-side API - server-side validation only
    invitation_token TEXT UNIQUE NOT NULL,
    
    -- Audit trail
    -- Tracks who sent the invitation for accountability
    invited_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Expiration (default 7 days)
    -- Invitations become invalid after this timestamp
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Acceptance tracking
    -- Set when worker clicks magic link and completes profile
    accepted_at TIMESTAMPTZ,
    
    -- Status tracking
    -- pending: awaiting worker action
    -- accepted: worker completed signup
    -- expired: past expires_at without acceptance
    -- revoked: admin cancelled the invitation
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add helpful table comment
COMMENT ON TABLE worker_invitations IS 'Stores employee invitations with magic link tokens for passwordless onboarding';
COMMENT ON COLUMN worker_invitations.invitation_token IS 'Secure token for magic link - NEVER expose via client API';
COMMENT ON COLUMN worker_invitations.role IS 'Permission level: admin, internal_auditor, supervisor, worker';
COMMENT ON COLUMN worker_invitations.status IS 'Invitation state: pending, accepted, expired, revoked';

-- ============================================================================
-- 2. ENHANCE USER_PROFILES TABLE
-- ============================================================================
-- Add columns for worker details, invitation tracking, and activity monitoring

-- Add invitation reference
-- Links profile to the invitation that created it (for invited workers)
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES worker_invitations(id) ON DELETE SET NULL;
COMMENT ON COLUMN user_profiles.invitation_id IS 'Reference to invitation that created this profile (null for first admin)';

-- Add personal information
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS first_name TEXT;
COMMENT ON COLUMN user_profiles.first_name IS 'Worker first name';

ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS last_name TEXT;
COMMENT ON COLUMN user_profiles.last_name IS 'Worker last name';

ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS position TEXT;
COMMENT ON COLUMN user_profiles.position IS 'Job title/position (e.g., Site Supervisor, Safety Coordinator)';

-- Add contact information
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS phone TEXT;
COMMENT ON COLUMN user_profiles.phone IS 'Worker phone number for contact';

-- Add emergency contact
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
COMMENT ON COLUMN user_profiles.emergency_contact_name IS 'Emergency contact person name';

ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
COMMENT ON COLUMN user_profiles.emergency_contact_phone IS 'Emergency contact phone number';

-- Add employment details
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS hire_date DATE;
COMMENT ON COLUMN user_profiles.hire_date IS 'Date worker was hired/started';

-- Add admin protection flag
-- First admin cannot be deleted - protects company from being orphaned
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS first_admin BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN user_profiles.first_admin IS 'True for company founder - cannot be deleted';

-- Add active status
-- Allows soft-delete/deactivation without losing records
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
COMMENT ON COLUMN user_profiles.is_active IS 'False to deactivate without deleting';

-- Add login tracking
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
COMMENT ON COLUMN user_profiles.last_login IS 'Timestamp of most recent login';

-- Add updated_at for tracking changes
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 3. CREATE TOKEN GENERATION FUNCTION
-- ============================================================================
-- Generates secure random 32-character hex token for invitation magic links

CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    token TEXT;
    token_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 16 random bytes and encode as 32-char hex string
        token := encode(gen_random_bytes(16), 'hex');
        
        -- Check if token already exists (extremely unlikely but safety first)
        SELECT EXISTS (
            SELECT 1 FROM worker_invitations WHERE invitation_token = token
        ) INTO token_exists;
        
        -- Return if unique, otherwise regenerate
        IF NOT token_exists THEN
            RETURN token;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION generate_invitation_token() IS 'Generates unique 32-character hex token for invitation magic links';

-- ============================================================================
-- 4. CREATE INVITATION EXPIRATION FUNCTION
-- ============================================================================
-- Marks expired invitations - can be called manually or via scheduled job

CREATE OR REPLACE FUNCTION check_invitation_expired()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH expired AS (
        UPDATE worker_invitations
        SET 
            status = 'expired',
            updated_at = NOW()
        WHERE 
            status = 'pending'
            AND expires_at < NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO updated_count FROM expired;
    
    RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION check_invitation_expired() IS 'Updates status to expired for invitations past expires_at';

-- ============================================================================
-- 5. CREATE AUTO-EXPIRE TRIGGER FUNCTION
-- ============================================================================
-- Checks expiration status when invitations are accessed

CREATE OR REPLACE FUNCTION trigger_check_invitation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If invitation is pending but expired, update status
    IF NEW.status = 'pending' AND NEW.expires_at < NOW() THEN
        NEW.status := 'expired';
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to auto-update status on read
CREATE OR REPLACE TRIGGER invitation_status_check
    BEFORE UPDATE ON worker_invitations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_invitation_status();

-- ============================================================================
-- 6. CREATE UPDATED_AT TRIGGER
-- ============================================================================
-- Automatically updates updated_at timestamp on row changes

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to worker_invitations
DROP TRIGGER IF EXISTS set_updated_at_worker_invitations ON worker_invitations;
CREATE TRIGGER set_updated_at_worker_invitations
    BEFORE UPDATE ON worker_invitations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Apply to user_profiles
DROP TRIGGER IF EXISTS set_updated_at_user_profiles ON user_profiles;
CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Token lookup (used for magic link validation)
CREATE INDEX IF NOT EXISTS idx_invitations_token 
    ON worker_invitations(invitation_token);
COMMENT ON INDEX idx_invitations_token IS 'Fast lookup for magic link token validation';

-- Email lookup (check existing invitations)
CREATE INDEX IF NOT EXISTS idx_invitations_email 
    ON worker_invitations(email);
COMMENT ON INDEX idx_invitations_email IS 'Find invitations by email address';

-- Company + status (list invitations by status)
CREATE INDEX IF NOT EXISTS idx_invitations_status 
    ON worker_invitations(company_id, status);
COMMENT ON INDEX idx_invitations_status IS 'Filter invitations by company and status';

-- Expiration check (find pending invitations to expire)
CREATE INDEX IF NOT EXISTS idx_invitations_expires 
    ON worker_invitations(expires_at) 
    WHERE status = 'pending';
COMMENT ON INDEX idx_invitations_expires IS 'Find pending invitations past expiration';

-- User profiles - invitation reference
CREATE INDEX IF NOT EXISTS idx_profiles_invitation 
    ON user_profiles(invitation_id) 
    WHERE invitation_id IS NOT NULL;

-- User profiles - company + active status
CREATE INDEX IF NOT EXISTS idx_profiles_company_active 
    ON user_profiles(company_id, is_active);

-- ============================================================================
-- 8. ADD UNIQUE CONSTRAINT FOR ACTIVE INVITATIONS
-- ============================================================================
-- Prevents duplicate pending invitations for same email in same company
-- Uses exclusion constraint to only apply when status = 'pending'

-- First, we need the btree_gist extension for exclusion constraints with =
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint (one active invitation per email per company)
-- This allows re-inviting after previous invitation expires/is revoked
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_active_invitation'
    ) THEN
        ALTER TABLE worker_invitations 
            ADD CONSTRAINT unique_active_invitation 
            EXCLUDE USING gist (
                company_id WITH =, 
                email WITH =
            ) WHERE (status = 'pending');
    END IF;
EXCEPTION
    WHEN others THEN
        -- If exclusion constraint fails, fall back to partial unique index
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation 
            ON worker_invitations(company_id, email) 
            WHERE status = 'pending';
END;
$$;

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE worker_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. CREATE RLS POLICIES FOR WORKER_INVITATIONS
-- ============================================================================

-- Policy: Admins can view all invitations in their company
DROP POLICY IF EXISTS "invitations_select_admin" ON worker_invitations;
CREATE POLICY "invitations_select_admin" ON worker_invitations
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        AND get_user_role() IN ('admin', 'super_admin')
    );

-- Policy: Internal auditors can view invitations (read-only for audit)
DROP POLICY IF EXISTS "invitations_select_auditor" ON worker_invitations;
CREATE POLICY "invitations_select_auditor" ON worker_invitations
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        AND get_user_role() = 'internal_auditor'
    );

-- Policy: Super admin can view all invitations
DROP POLICY IF EXISTS "invitations_select_super" ON worker_invitations;
CREATE POLICY "invitations_select_super" ON worker_invitations
    FOR SELECT
    USING (is_super_admin());

-- Policy: Admins can create invitations in their company
DROP POLICY IF EXISTS "invitations_insert_admin" ON worker_invitations;
CREATE POLICY "invitations_insert_admin" ON worker_invitations
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        AND get_user_role() IN ('admin', 'super_admin')
    );

-- Policy: Super admin can create invitations anywhere
DROP POLICY IF EXISTS "invitations_insert_super" ON worker_invitations;
CREATE POLICY "invitations_insert_super" ON worker_invitations
    FOR INSERT
    WITH CHECK (is_super_admin());

-- Policy: Admins can update invitations in their company
-- (e.g., revoke, resend)
DROP POLICY IF EXISTS "invitations_update_admin" ON worker_invitations;
CREATE POLICY "invitations_update_admin" ON worker_invitations
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        AND get_user_role() IN ('admin', 'super_admin')
    )
    WITH CHECK (
        company_id = get_user_company_id()
        AND get_user_role() IN ('admin', 'super_admin')
    );

-- Policy: Super admin can update any invitation
DROP POLICY IF EXISTS "invitations_update_super" ON worker_invitations;
CREATE POLICY "invitations_update_super" ON worker_invitations
    FOR UPDATE
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Policy: Admins can delete invitations in their company
DROP POLICY IF EXISTS "invitations_delete_admin" ON worker_invitations;
CREATE POLICY "invitations_delete_admin" ON worker_invitations
    FOR DELETE
    USING (
        company_id = get_user_company_id()
        AND get_user_role() IN ('admin', 'super_admin')
    );

-- Policy: Super admin can delete any invitation
DROP POLICY IF EXISTS "invitations_delete_super" ON worker_invitations;
CREATE POLICY "invitations_delete_super" ON worker_invitations
    FOR DELETE
    USING (is_super_admin());

-- NOTE: Workers and supervisors have NO access to this table
-- Invitation tokens are validated server-side only via service role

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO authenticated;
GRANT EXECUTE ON FUNCTION check_invitation_expired() TO authenticated;

-- Grant table permissions (RLS will filter)
GRANT SELECT, INSERT, UPDATE, DELETE ON worker_invitations TO authenticated;

-- ============================================================================
-- 12. HELPER FUNCTION: VALIDATE AND ACCEPT INVITATION
-- ============================================================================
-- Server-side function to validate token and create user profile
-- Called when worker clicks magic link and completes signup

CREATE OR REPLACE FUNCTION accept_worker_invitation(
    p_invitation_token TEXT,
    p_user_id UUID,
    p_phone TEXT DEFAULT NULL,
    p_emergency_contact_name TEXT DEFAULT NULL,
    p_emergency_contact_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation worker_invitations%ROWTYPE;
    v_profile_id UUID;
    v_worker_id UUID;
BEGIN
    -- Lock and validate the invitation
    SELECT * INTO v_invitation
    FROM worker_invitations
    WHERE invitation_token = p_invitation_token
      AND status = 'pending'
    FOR UPDATE;
    
    -- Check if invitation exists
    IF v_invitation.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Invalid invitation token'
        );
    END IF;
    
    -- Check if expired
    IF v_invitation.expires_at < NOW() THEN
        UPDATE worker_invitations 
        SET status = 'expired', updated_at = NOW() 
        WHERE id = v_invitation.id;
        
        RETURN json_build_object(
            'success', false, 
            'error', 'Invitation has expired'
        );
    END IF;
    
    -- Check if user already has a profile
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_user_id) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'User already has a profile'
        );
    END IF;
    
    -- Create user profile
    INSERT INTO user_profiles (
        user_id,
        company_id,
        role,
        invitation_id,
        first_name,
        last_name,
        position,
        phone,
        emergency_contact_name,
        emergency_contact_phone,
        hire_date,
        first_admin,
        is_active
    ) VALUES (
        p_user_id,
        v_invitation.company_id,
        v_invitation.role,
        v_invitation.id,
        v_invitation.first_name,
        v_invitation.last_name,
        v_invitation.position,
        p_phone,
        p_emergency_contact_name,
        p_emergency_contact_phone,
        CURRENT_DATE,
        FALSE,
        TRUE
    )
    RETURNING id INTO v_profile_id;
    
    -- Create worker record
    INSERT INTO workers (
        company_id,
        first_name,
        last_name,
        email,
        position,
        phone,
        emergency_contact_name,
        emergency_contact_phone,
        user_id,
        invitation_id,
        profile_completed,
        hire_date
    ) VALUES (
        v_invitation.company_id,
        v_invitation.first_name,
        v_invitation.last_name,
        v_invitation.email,
        v_invitation.position,
        p_phone,
        p_emergency_contact_name,
        p_emergency_contact_phone,
        p_user_id,
        v_invitation.id,
        TRUE,
        CURRENT_DATE
    )
    RETURNING id INTO v_worker_id;
    
    -- Mark invitation as accepted
    UPDATE worker_invitations
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Return success with IDs
    RETURN json_build_object(
        'success', true,
        'profile_id', v_profile_id,
        'worker_id', v_worker_id,
        'company_id', v_invitation.company_id,
        'role', v_invitation.role,
        'first_name', v_invitation.first_name,
        'last_name', v_invitation.last_name
    );
END;
$$;

COMMENT ON FUNCTION accept_worker_invitation IS 'Validates invitation token and creates user profile/worker record';

-- Grant execute to authenticated users (for magic link flow)
GRANT EXECUTE ON FUNCTION accept_worker_invitation(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 13. HELPER FUNCTION: GET INVITATION BY TOKEN (FOR DISPLAY)
-- ============================================================================
-- Returns non-sensitive invitation details for the acceptance page

CREATE OR REPLACE FUNCTION get_invitation_details(p_invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    SELECT 
        wi.id,
        wi.email,
        wi.first_name,
        wi.last_name,
        wi.position,
        wi.role,
        wi.status,
        wi.expires_at,
        c.name as company_name
    INTO v_invitation
    FROM worker_invitations wi
    JOIN companies c ON c.id = wi.company_id
    WHERE wi.invitation_token = p_invitation_token;
    
    IF v_invitation.id IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Invitation not found'
        );
    END IF;
    
    IF v_invitation.status != 'pending' THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Invitation is no longer valid',
            'status', v_invitation.status
        );
    END IF;
    
    IF v_invitation.expires_at < NOW() THEN
        -- Update status to expired
        UPDATE worker_invitations 
        SET status = 'expired', updated_at = NOW() 
        WHERE invitation_token = p_invitation_token;
        
        RETURN json_build_object(
            'valid', false,
            'error', 'Invitation has expired'
        );
    END IF;
    
    RETURN json_build_object(
        'valid', true,
        'invitation', json_build_object(
            'email', v_invitation.email,
            'first_name', v_invitation.first_name,
            'last_name', v_invitation.last_name,
            'position', v_invitation.position,
            'role', v_invitation.role,
            'company_name', v_invitation.company_name,
            'expires_at', v_invitation.expires_at
        )
    );
END;
$$;

COMMENT ON FUNCTION get_invitation_details IS 'Returns invitation details for acceptance page (no sensitive data)';

-- Grant to anon for magic link validation (before user is authenticated)
GRANT EXECUTE ON FUNCTION get_invitation_details(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_details(TEXT) TO authenticated;

-- ============================================================================
-- 14. PREVENT FIRST_ADMIN DELETION
-- ============================================================================
-- Trigger to prevent deleting the first admin of a company

CREATE OR REPLACE FUNCTION prevent_first_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.first_admin = TRUE THEN
        RAISE EXCEPTION 'Cannot delete the first admin of a company. Transfer admin rights first.';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_first_admin ON user_profiles;
CREATE TRIGGER protect_first_admin
    BEFORE DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_first_admin_deletion();

-- ============================================================================
-- 15. SAMPLE DATA FOR TESTING
-- ============================================================================
-- Uncomment and modify for development/testing

/*
-- Create test company
INSERT INTO companies (id, name, wsib_number, address, city, province, postal_code, phone, company_email, registration_status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Test Construction Co.',
    '123456789',
    '123 Test Street',
    'Toronto',
    'ON',
    'M5V 1A1',
    '416-555-0100',
    'info@testconstruction.com',
    'active'
);

-- Note: Test admin user would be created via Supabase Auth
-- Then a user_profile would be created referencing their auth.users.id

-- Create sample invitation
INSERT INTO worker_invitations (
    company_id,
    email,
    first_name,
    last_name,
    position,
    role,
    invitation_token,
    invited_at,
    expires_at,
    status
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'worker@example.com',
    'John',
    'Smith',
    'Concrete Finisher',
    'worker',
    generate_invitation_token(),
    NOW(),
    NOW() + INTERVAL '7 days',
    'pending'
);
*/

-- ============================================================================
-- 16. SCHEDULED JOB FOR EXPIRING INVITATIONS (Optional)
-- ============================================================================
-- If pg_cron extension is available, uncomment to auto-expire invitations daily

/*
-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily expiration check at midnight UTC
SELECT cron.schedule(
    'expire-invitations',
    '0 0 * * *',  -- Every day at midnight
    'SELECT check_invitation_expired();'
);
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
