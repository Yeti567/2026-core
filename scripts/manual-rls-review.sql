-- =============================================================================
-- Supabase RLS Manual Security Review
-- =============================================================================
-- Run these queries in Supabase SQL Editor to verify security configuration
-- Copy and paste each query section individually
-- =============================================================================

-- =============================================================================
-- QUERY 1: Check Tables Without RLS
-- =============================================================================
-- Expected: 0 rows (all tables should have RLS enabled)
-- Action: Enable RLS if any rows returned

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;

-- =============================================================================
-- QUERY 2: Check Weak RLS Policies (USING (true))
-- =============================================================================
-- Expected: 0-5 rows (review each - should only be public reference data)
-- Action: Review each policy - ensure intentional and secure

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND qual = 'true'
ORDER BY tablename, policyname;

-- =============================================================================
-- QUERY 3: Check Public Access (anon role)
-- =============================================================================
-- Expected: 0 rows or minimal (only public reference data)
-- Action: Revoke access if not needed

SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND grantee = 'anon'
ORDER BY table_name, privilege_type;

-- =============================================================================
-- QUERY 4: Check Exposed Functions (granted to anon)
-- =============================================================================
-- Expected: 0-2 rows (invitation flow functions)
-- Action: Review each function - ensure secure

SELECT 
  r.routine_schema,
  r.routine_name,
  r.routine_type,
  r.security_type,
  r.data_type as return_type,
  rp.privilege_type
FROM information_schema.routines r
JOIN information_schema.routine_privileges rp 
  ON r.routine_schema = rp.routine_schema 
  AND r.routine_name = rp.routine_name
WHERE r.routine_schema = 'public'
  AND rp.grantee = 'anon'
ORDER BY r.routine_name;

-- =============================================================================
-- QUERY 5: Check Policy Coverage
-- =============================================================================
-- Expected: 0 rows (all tables should have policies)
-- Action: Create policies if any tables returned

SELECT 
  t.tablename,
  COUNT(p.policyname) as policy_count,
  STRING_AGG(DISTINCT p.cmd::text, ', ') as operations_covered
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- =============================================================================
-- QUERY 6: Check Company Isolation
-- =============================================================================
-- Expected: Many rows (most tables should have company isolation)
-- Action: Verify all user/company data tables have company_id checks

SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_clause
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    qual LIKE '%get_user_company_id%' OR
    qual LIKE '%company_id%'
  )
ORDER BY tablename, policyname;

-- =============================================================================
-- QUERY 7: Check Role-Based Access
-- =============================================================================
-- Expected: Rows for admin/supervisor-specific policies
-- Action: Verify role restrictions are appropriate

SELECT 
  tablename,
  policyname,
  roles,
  cmd as command,
  qual as using_clause
FROM pg_policies 
WHERE schemaname = 'public'
  AND roles IS NOT NULL
  AND roles != '{authenticated}'
ORDER BY tablename, policyname;

-- =============================================================================
-- QUERY 8: Check SECURITY DEFINER Functions
-- =============================================================================
-- Expected: Some functions (helper functions)
-- Action: Review each - ensure proper security checks

SELECT 
  routine_schema,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER'
ORDER BY routine_name;

-- =============================================================================
-- QUERY 9: Check Sensitive Tables Policy Coverage
-- =============================================================================
-- Expected: All tables should have multiple policies
-- Action: Add missing policies if needed

WITH sensitive_tables AS (
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN (
      'user_profiles', 'workers', 'documents', 
      'form_submissions', 'worker_certifications',
      'auditsoft_connections', 'push_subscriptions',
      'maintenance_records', 'equipment_inventory',
      'documents', 'document_versions', 'form_templates'
    )
)
SELECT 
  st.tablename,
  COUNT(p.policyname) as policy_count,
  STRING_AGG(DISTINCT p.cmd::text, ', ') as operations
FROM sensitive_tables st
LEFT JOIN pg_policies p ON st.tablename = p.tablename AND p.schemaname = 'public'
GROUP BY st.tablename
ORDER BY st.tablename;

-- =============================================================================
-- QUERY 10: Comprehensive Security Summary
-- =============================================================================
-- Expected: All checks should show ✅ status
-- Action: Review any ⚠️ warnings

SELECT 
  'Tables with RLS' as check_type,
  COUNT(*)::text as count,
  CASE 
    WHEN COUNT(*) = (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')
    THEN '✅ All tables have RLS'
    ELSE '⚠️ Some tables missing RLS'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
  'Total RLS Policies' as check_type,
  COUNT(*)::text as count,
  'Policies configured' as status
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Tables with Public Access' as check_type,
  COUNT(DISTINCT table_name)::text as count,
  CASE 
    WHEN COUNT(DISTINCT table_name) = 0
    THEN '✅ No public access'
    ELSE '⚠️ Review public access'
  END as status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND grantee = 'anon'

UNION ALL

SELECT 
  'Public Functions' as check_type,
  COUNT(*)::text as count,
  CASE 
    WHEN COUNT(*) <= 2
    THEN '✅ Minimal public functions'
    ELSE '⚠️ Review public functions'
  END as status
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
  AND EXISTS (
    SELECT 1 
    FROM information_schema.routine_privileges rp
    WHERE rp.routine_schema = r.routine_schema
      AND rp.routine_name = r.routine_name
      AND rp.grantee = 'anon'
  );

-- =============================================================================
-- QUERY 11: List All Policies for Review
-- =============================================================================
-- Review all policies to ensure they're secure
-- Expected: Many rows (all policies)

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- =============================================================================
-- QUERY 12: Check for Missing User Isolation
-- =============================================================================
-- Verify user-specific tables have user_id checks
-- Expected: User tables should have user_id checks

SELECT 
  p.tablename,
  p.policyname,
  p.cmd,
  p.qual
FROM pg_policies p
JOIN pg_tables t ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE p.schemaname = 'public'
  AND t.tablename IN (
    'push_subscriptions', 'form_submissions', 
    'worker_certifications', 'user_profiles'
  )
  AND p.qual NOT LIKE '%user_id%'
  AND p.qual NOT LIKE '%auth.uid%'
ORDER BY p.tablename, p.policyname;

-- =============================================================================
-- END OF QUERIES
-- =============================================================================
-- After running all queries:
-- 1. Document any issues found
-- 2. Create migrations to fix issues
-- 3. Test with different user roles
-- 4. Update security audit report
-- =============================================================================
