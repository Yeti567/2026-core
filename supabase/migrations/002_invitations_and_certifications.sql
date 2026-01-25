-- ============================================================================
-- Invitations & Certifications Migration
-- ============================================================================
-- This migration adds:
-- - Invitations table for magic link employee onboarding
-- - Certifications table for worker credential tracking
-- - Extended worker_profiles for additional worker details
-- ============================================================================

-- ============================================================================
-- 1. CREATE INVITATIONS TABLE
-- ============================================================================

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'worker',
    position TEXT,
    
    -- Magic link token (hashed for security)
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    
    -- Track who created the invitation
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Prevent duplicate pending invitations to same email per company
    UNIQUE(company_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- 2. CREATE CERTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    
    -- Certification details
    name TEXT NOT NULL,
    issuing_organization TEXT,
    certificate_number TEXT,
    
    -- Dates
    issue_date DATE,
    expiry_date DATE,
    
    -- File storage
    file_path TEXT, -- Supabase Storage path
    
    -- Status
    verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ADD EXTENDED FIELDS TO WORKERS TABLE
-- ============================================================================

-- Add phone and emergency contact fields
ALTER TABLE workers 
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_invitations_company_id ON invitations(company_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token_hash ON invitations(token_hash);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE status = 'pending';

CREATE INDEX idx_certifications_company_id ON certifications(company_id);
CREATE INDEX idx_certifications_worker_id ON certifications(worker_id);
CREATE INDEX idx_certifications_expiry_date ON certifications(expiry_date);

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES FOR INVITATIONS
-- ============================================================================

-- SELECT: Admins can see invitations in their company
CREATE POLICY "invitations_select_policy" ON invitations
    FOR SELECT
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'internal_auditor', 'super_admin'))
        OR is_super_admin()
    );

-- INSERT: Admins can create invitations in their company
CREATE POLICY "invitations_insert_policy" ON invitations
    FOR INSERT
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

-- UPDATE: Admins can update invitations in their company
CREATE POLICY "invitations_update_policy" ON invitations
    FOR UPDATE
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    )
    WITH CHECK (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

-- DELETE: Admins can delete invitations in their company
CREATE POLICY "invitations_delete_policy" ON invitations
    FOR DELETE
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

-- ============================================================================
-- 7. CREATE RLS POLICIES FOR CERTIFICATIONS
-- ============================================================================

-- SELECT: Users can see certifications in their company
CREATE POLICY "certifications_select_policy" ON certifications
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Users can create certifications in their company
CREATE POLICY "certifications_insert_policy" ON certifications
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Users can update certifications in their company
CREATE POLICY "certifications_update_policy" ON certifications
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Admins can delete certifications in their company
CREATE POLICY "certifications_delete_policy" ON certifications
    FOR DELETE
    USING (
        (company_id = get_user_company_id() AND get_user_role() IN ('admin', 'super_admin'))
        OR is_super_admin()
    );

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON certifications TO authenticated;

-- ============================================================================
-- 9. CREATE HELPER FUNCTION FOR INVITATION VALIDATION
-- ============================================================================

-- Function to validate and retrieve invitation by token (for unauthenticated access)
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token_hash TEXT)
RETURNS TABLE (
    invitation_id UUID,
    company_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role user_role,
    position TEXT,
    company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id AS invitation_id,
        i.company_id,
        i.email,
        i.first_name,
        i.last_name,
        i.role,
        i.position,
        c.name AS company_name
    FROM invitations i
    JOIN companies c ON c.id = i.company_id
    WHERE i.token_hash = p_token_hash
      AND i.status = 'pending'
      AND i.expires_at > NOW();
END;
$$;

-- Grant execute to anon for magic link validation
GRANT EXECUTE ON FUNCTION validate_invitation_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_invitation_token(TEXT) TO authenticated;

-- ============================================================================
-- 10. CREATE FUNCTION TO ACCEPT INVITATION
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_invitation(
    p_token_hash TEXT,
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
    v_invitation invitations%ROWTYPE;
    v_worker_id UUID;
    v_profile_id UUID;
BEGIN
    -- Get and lock the invitation
    SELECT * INTO v_invitation
    FROM invitations
    WHERE token_hash = p_token_hash
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;
    
    IF v_invitation.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if user already has a profile
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User already has a profile');
    END IF;
    
    -- Create the worker record
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
    
    -- Create the user profile
    INSERT INTO user_profiles (
        user_id,
        company_id,
        role
    ) VALUES (
        p_user_id,
        v_invitation.company_id,
        v_invitation.role
    )
    RETURNING id INTO v_profile_id;
    
    -- Mark invitation as accepted
    UPDATE invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object(
        'success', true,
        'worker_id', v_worker_id,
        'profile_id', v_profile_id,
        'company_id', v_invitation.company_id,
        'role', v_invitation.role
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 11. UPDATE COMPANY INSERT POLICY FOR REGISTRATION
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "companies_insert_policy" ON companies;

-- Create new policy that allows authenticated users to create companies during registration
CREATE POLICY "companies_insert_policy" ON companies
    FOR INSERT
    WITH CHECK (
        -- Super admin can always create
        is_super_admin()
        -- Or authenticated user creating their first company (no profile yet)
        OR (auth.uid() IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM user_profiles WHERE user_id = auth.uid()
        ))
    );

-- ============================================================================
-- 12. UPDATE USER_PROFILES INSERT POLICY FOR SELF-REGISTRATION
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;

-- Create new policy that allows:
-- 1. Creating own profile during registration (no existing profile)
-- 2. Admins creating profiles for invited users in their company
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
    FOR INSERT
    WITH CHECK (
        -- Super admin can create any profile
        is_super_admin()
        -- User creating their own profile (must be the user_id being inserted)
        OR (user_id = auth.uid() AND NOT EXISTS (
            SELECT 1 FROM user_profiles WHERE user_id = auth.uid()
        ))
        -- Admin creating profile for someone else in their company
        OR (
            company_id = get_user_company_id() 
            AND get_user_role() IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
