DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
        RAISE NOTICE 'Enabled RLS on table: %', tbl.tablename;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: RECREATE HELPER FUNCTIONS (ensure they exist and are correct)
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
    WHERE id = auth.uid()
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
        WHERE id = auth.uid()
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
    WHERE id = auth.uid()
    LIMIT 1;
$$;

-- Function to check if user has admin or higher role
CREATE OR REPLACE FUNCTION is_admin_or_higher()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
    );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_higher() TO authenticated;

-- ============================================================================
-- STEP 5: DROP AND RECREATE STRICT RLS POLICIES FOR CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- COMPANIES TABLE
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
DROP POLICY IF EXISTS "companies_insert_policy" ON companies;
DROP POLICY IF EXISTS "companies_update_policy" ON companies;
DROP POLICY IF EXISTS "companies_delete_policy" ON companies;
DROP POLICY IF EXISTS "Allow users to view own company" ON companies;
DROP POLICY IF EXISTS "Allow registration to create company" ON companies;

CREATE POLICY "companies_select" ON companies FOR SELECT
    USING (id = get_user_company_id() OR is_super_admin());

CREATE POLICY "companies_insert" ON companies FOR INSERT
    WITH CHECK (is_super_admin() OR auth.uid() IS NOT NULL); -- Allow during registration

CREATE POLICY "companies_update" ON companies FOR UPDATE
    USING (id = get_user_company_id() OR is_super_admin())
    WITH CHECK (id = get_user_company_id() OR is_super_admin());

CREATE POLICY "companies_delete" ON companies FOR DELETE
    USING (is_super_admin());

-- ----------------------------------------------------------------------------
-- USER_PROFILES TABLE
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to view company profiles" ON user_profiles;

CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT
    USING (company_id = get_user_company_id() OR is_super_admin() OR id = auth.uid());

CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT
    WITH CHECK (
        id = auth.uid() -- Users can only create their own profile
        OR is_super_admin()
        OR is_admin_or_higher() -- Admins can create profiles for their company
    );

CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE
    USING (id = auth.uid() OR company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
    WITH CHECK (id = auth.uid() OR company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin());

CREATE POLICY "user_profiles_delete" ON user_profiles FOR DELETE
    USING (is_super_admin() OR (company_id = get_user_company_id() AND is_admin_or_higher()));

-- ----------------------------------------------------------------------------
-- WORKERS TABLE
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workers_select_policy" ON workers;
DROP POLICY IF EXISTS "workers_insert_policy" ON workers;
DROP POLICY IF EXISTS "workers_update_policy" ON workers;
DROP POLICY IF EXISTS "workers_delete_policy" ON workers;

CREATE POLICY "workers_select" ON workers FOR SELECT
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "workers_insert" ON workers FOR INSERT
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "workers_update" ON workers FOR UPDATE
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "workers_delete" ON workers FOR DELETE
    USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin());

-- ----------------------------------------------------------------------------
-- FORMS TABLE
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "forms_select_policy" ON forms;
DROP POLICY IF EXISTS "forms_insert_policy" ON forms;
DROP POLICY IF EXISTS "forms_update_policy" ON forms;
DROP POLICY IF EXISTS "forms_delete_policy" ON forms;

CREATE POLICY "forms_select" ON forms FOR SELECT
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "forms_insert" ON forms FOR INSERT
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "forms_update" ON forms FOR UPDATE
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "forms_delete" ON forms FOR DELETE
    USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin());

-- ----------------------------------------------------------------------------
-- EVIDENCE_CHAIN TABLE
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "evidence_chain_select_policy" ON evidence_chain;
DROP POLICY IF EXISTS "evidence_chain_insert_policy" ON evidence_chain;
DROP POLICY IF EXISTS "evidence_chain_update_policy" ON evidence_chain;
DROP POLICY IF EXISTS "evidence_chain_delete_policy" ON evidence_chain;

CREATE POLICY "evidence_chain_select" ON evidence_chain FOR SELECT
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "evidence_chain_insert" ON evidence_chain FOR INSERT
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "evidence_chain_update" ON evidence_chain FOR UPDATE
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "evidence_chain_delete" ON evidence_chain FOR DELETE
    USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin());

-- ----------------------------------------------------------------------------
-- FORM_TEMPLATES TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'form_templates') THEN
        DROP POLICY IF EXISTS "form_templates_select" ON form_templates;
        DROP POLICY IF EXISTS "form_templates_insert" ON form_templates;
        DROP POLICY IF EXISTS "form_templates_update" ON form_templates;
        DROP POLICY IF EXISTS "form_templates_delete" ON form_templates;
        
        EXECUTE 'CREATE POLICY "form_templates_select" ON form_templates FOR SELECT
            USING (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "form_templates_insert" ON form_templates FOR INSERT
            WITH CHECK (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "form_templates_update" ON form_templates FOR UPDATE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
            WITH CHECK (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "form_templates_delete" ON form_templates FOR DELETE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- FORM_SECTIONS TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'form_sections') THEN
        DROP POLICY IF EXISTS "form_sections_select" ON form_sections;
        DROP POLICY IF EXISTS "form_sections_insert" ON form_sections;
        DROP POLICY IF EXISTS "form_sections_update" ON form_sections;
        DROP POLICY IF EXISTS "form_sections_delete" ON form_sections;
        
        EXECUTE 'CREATE POLICY "form_sections_select" ON form_sections FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM form_templates ft 
                WHERE ft.id = form_template_id 
                AND (ft.company_id = get_user_company_id() OR is_super_admin())
            ))';
        EXECUTE 'CREATE POLICY "form_sections_insert" ON form_sections FOR INSERT
            WITH CHECK (EXISTS (
                SELECT 1 FROM form_templates ft 
                WHERE ft.id = form_template_id 
                AND (ft.company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
            ))';
        EXECUTE 'CREATE POLICY "form_sections_update" ON form_sections FOR UPDATE
            USING (EXISTS (
                SELECT 1 FROM form_templates ft 
                WHERE ft.id = form_template_id 
                AND (ft.company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
            ))';
        EXECUTE 'CREATE POLICY "form_sections_delete" ON form_sections FOR DELETE
            USING (EXISTS (
                SELECT 1 FROM form_templates ft 
                WHERE ft.id = form_template_id 
                AND (ft.company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
            ))';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- FORM_FIELDS TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'form_fields') THEN
        DROP POLICY IF EXISTS "form_fields_select" ON form_fields;
        DROP POLICY IF EXISTS "form_fields_insert" ON form_fields;
        DROP POLICY IF EXISTS "form_fields_update" ON form_fields;
        DROP POLICY IF EXISTS "form_fields_delete" ON form_fields;
        
        EXECUTE 'CREATE POLICY "form_fields_select" ON form_fields FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM form_sections fs
                JOIN form_templates ft ON ft.id = fs.form_template_id
                WHERE fs.id = form_section_id 
                AND (ft.company_id = get_user_company_id() OR is_super_admin())
            ))';
        EXECUTE 'CREATE POLICY "form_fields_insert" ON form_fields FOR INSERT
            WITH CHECK (EXISTS (
                SELECT 1 FROM form_sections fs
                JOIN form_templates ft ON ft.id = fs.form_template_id
                WHERE fs.id = form_section_id 
                AND (ft.company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
            ))';
        EXECUTE 'CREATE POLICY "form_fields_update" ON form_fields FOR UPDATE
            USING (EXISTS (
                SELECT 1 FROM form_sections fs
                JOIN form_templates ft ON ft.id = fs.form_template_id
                WHERE fs.id = form_section_id 
                AND (ft.company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
            ))';
        EXECUTE 'CREATE POLICY "form_fields_delete" ON form_fields FOR DELETE
            USING (EXISTS (
                SELECT 1 FROM form_sections fs
                JOIN form_templates ft ON ft.id = fs.form_template_id
                WHERE fs.id = form_section_id 
                AND (ft.company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())
            ))';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- CERTIFICATIONS TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certifications') THEN
        DROP POLICY IF EXISTS "certifications_select" ON certifications;
        DROP POLICY IF EXISTS "certifications_insert" ON certifications;
        DROP POLICY IF EXISTS "certifications_update" ON certifications;
        DROP POLICY IF EXISTS "certifications_delete" ON certifications;
        
        EXECUTE 'CREATE POLICY "certifications_select" ON certifications FOR SELECT
            USING (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "certifications_insert" ON certifications FOR INSERT
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "certifications_update" ON certifications FOR UPDATE
            USING (company_id = get_user_company_id() OR is_super_admin())
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "certifications_delete" ON certifications FOR DELETE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TRAINING_RECORDS TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'training_records') THEN
        DROP POLICY IF EXISTS "training_records_select" ON training_records;
        DROP POLICY IF EXISTS "training_records_insert" ON training_records;
        DROP POLICY IF EXISTS "training_records_update" ON training_records;
        DROP POLICY IF EXISTS "training_records_delete" ON training_records;
        
        EXECUTE 'CREATE POLICY "training_records_select" ON training_records FOR SELECT
            USING (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "training_records_insert" ON training_records FOR INSERT
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "training_records_update" ON training_records FOR UPDATE
            USING (company_id = get_user_company_id() OR is_super_admin())
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "training_records_delete" ON training_records FOR DELETE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- JOBSITES TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobsites') THEN
        DROP POLICY IF EXISTS "jobsites_select" ON jobsites;
        DROP POLICY IF EXISTS "jobsites_insert" ON jobsites;
        DROP POLICY IF EXISTS "jobsites_update" ON jobsites;
        DROP POLICY IF EXISTS "jobsites_delete" ON jobsites;
        
        EXECUTE 'CREATE POLICY "jobsites_select" ON jobsites FOR SELECT
            USING (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "jobsites_insert" ON jobsites FOR INSERT
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "jobsites_update" ON jobsites FOR UPDATE
            USING (company_id = get_user_company_id() OR is_super_admin())
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "jobsites_delete" ON jobsites FOR DELETE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- EQUIPMENT TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipment') THEN
        DROP POLICY IF EXISTS "equipment_select" ON equipment;
        DROP POLICY IF EXISTS "equipment_insert" ON equipment;
        DROP POLICY IF EXISTS "equipment_update" ON equipment;
        DROP POLICY IF EXISTS "equipment_delete" ON equipment;
        
        EXECUTE 'CREATE POLICY "equipment_select" ON equipment FOR SELECT
            USING (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "equipment_insert" ON equipment FOR INSERT
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "equipment_update" ON equipment FOR UPDATE
            USING (company_id = get_user_company_id() OR is_super_admin())
            WITH CHECK (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "equipment_delete" ON equipment FOR DELETE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- INVITATIONS TABLE (if exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invitations') THEN
        DROP POLICY IF EXISTS "invitations_select" ON invitations;
        DROP POLICY IF EXISTS "invitations_insert" ON invitations;
        DROP POLICY IF EXISTS "invitations_update" ON invitations;
        DROP POLICY IF EXISTS "invitations_delete" ON invitations;
        
        EXECUTE 'CREATE POLICY "invitations_select" ON invitations FOR SELECT
            USING (company_id = get_user_company_id() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "invitations_insert" ON invitations FOR INSERT
            WITH CHECK (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "invitations_update" ON invitations FOR UPDATE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
        EXECUTE 'CREATE POLICY "invitations_delete" ON invitations FOR DELETE
            USING (company_id = get_user_company_id() AND is_admin_or_higher() OR is_super_admin())';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: FINAL VERIFICATION
-- ============================================================================

-- Show all tables and their RLS status
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
