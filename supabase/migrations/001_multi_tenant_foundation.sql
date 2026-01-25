-- ============================================================================
-- Multi-Tenant Foundation Migration
-- ============================================================================
-- This migration establishes the core multi-tenant infrastructure including:
-- - Role enum type for user permissions
-- - 5 core tables with company_id columns for tenant isolation
-- - Helper functions for RLS policy evaluation
-- - Row Level Security policies for all tables
-- ============================================================================

-- ============================================================================
-- 1. CREATE ENUM TYPE FOR USER ROLES
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'super_admin',      -- Can see all data across all companies
    'admin',            -- Company administrator
    'internal_auditor', -- Audit access within company
    'supervisor',       -- Supervisory access within company
    'worker'            -- Basic worker access within company
);

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================

-- Companies table (root tenant table)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    wsib_number TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles table (links auth.users to companies)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'worker',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id) -- Each auth user can only have one profile
);

-- Workers table (company employees/workers)
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    position TEXT,
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forms table (various form submissions)
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    form_type TEXT NOT NULL,
    form_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence chain table (audit trail for evidence)
CREATE TABLE evidence_chain (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    audit_element TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    evidence_id UUID, -- Generic UUID for flexible evidence linking
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX idx_workers_company_id ON workers(company_id);
CREATE INDEX idx_forms_company_id ON forms(company_id);
CREATE INDEX idx_forms_worker_id ON forms(worker_id);
CREATE INDEX idx_evidence_chain_company_id ON evidence_chain(company_id);
CREATE INDEX idx_evidence_chain_worker_id ON evidence_chain(worker_id);
CREATE INDEX idx_evidence_chain_evidence_id ON evidence_chain(evidence_id);

-- ============================================================================
-- 4. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get the current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

-- Function to check if current user is a super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    );
$$;

-- Function to get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_chain ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- COMPANIES POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see their own company OR super_admin can see all
CREATE POLICY "companies_select_policy" ON companies
    FOR SELECT
    USING (
        id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Only super_admin can create companies
CREATE POLICY "companies_insert_policy" ON companies
    FOR INSERT
    WITH CHECK (
        is_super_admin()
    );

-- UPDATE: Users can update their own company OR super_admin can update any
CREATE POLICY "companies_update_policy" ON companies
    FOR UPDATE
    USING (
        id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Only super_admin can delete companies
CREATE POLICY "companies_delete_policy" ON companies
    FOR DELETE
    USING (
        is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- USER_PROFILES POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see profiles in their company OR super_admin can see all
CREATE POLICY "user_profiles_select_policy" ON user_profiles
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Users can create profiles in their company OR super_admin can create any
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Users can update profiles in their company OR super_admin can update any
CREATE POLICY "user_profiles_update_policy" ON user_profiles
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Users can delete profiles in their company OR super_admin can delete any
CREATE POLICY "user_profiles_delete_policy" ON user_profiles
    FOR DELETE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- WORKERS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see workers in their company OR super_admin can see all
CREATE POLICY "workers_select_policy" ON workers
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Users can create workers in their company OR super_admin can create any
CREATE POLICY "workers_insert_policy" ON workers
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Users can update workers in their company OR super_admin can update any
CREATE POLICY "workers_update_policy" ON workers
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Users can delete workers in their company OR super_admin can delete any
CREATE POLICY "workers_delete_policy" ON workers
    FOR DELETE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- FORMS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see forms in their company OR super_admin can see all
CREATE POLICY "forms_select_policy" ON forms
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Users can create forms in their company OR super_admin can create any
CREATE POLICY "forms_insert_policy" ON forms
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Users can update forms in their company OR super_admin can update any
CREATE POLICY "forms_update_policy" ON forms
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Users can delete forms in their company OR super_admin can delete any
CREATE POLICY "forms_delete_policy" ON forms
    FOR DELETE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- EVIDENCE_CHAIN POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can see evidence in their company OR super_admin can see all
CREATE POLICY "evidence_chain_select_policy" ON evidence_chain
    FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- INSERT: Users can create evidence in their company OR super_admin can create any
CREATE POLICY "evidence_chain_insert_policy" ON evidence_chain
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- UPDATE: Users can update evidence in their company OR super_admin can update any
CREATE POLICY "evidence_chain_update_policy" ON evidence_chain
    FOR UPDATE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- DELETE: Users can delete evidence in their company OR super_admin can delete any
CREATE POLICY "evidence_chain_delete_policy" ON evidence_chain
    FOR DELETE
    USING (
        company_id = get_user_company_id()
        OR is_super_admin()
    );

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on the enum type
GRANT USAGE ON TYPE user_role TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Grant table permissions to authenticated users (RLS will filter access)
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON evidence_chain TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
