-- =============================================================================
-- Supabase RLS (Row Level Security) Security Audit
-- =============================================================================
-- Run these queries in Supabase SQL Editor to verify RLS is properly configured
-- =============================================================================

-- =============================================================================
-- 1. CHECK FOR TABLES WITHOUT RLS
-- =============================================================================
-- Should return 0 rows - all tables should have RLS enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED - SECURITY RISK!'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;

-- =============================================================================
-- 2. CHECK ALL TABLES AND THEIR RLS STATUS
-- =============================================================================
-- Comprehensive view of all tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED - SECURITY RISK!'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- 3. CHECK FOR WEAK POLICIES
-- =============================================================================
-- Review each policy for security issues:
-- - Policies that allow all rows (no WHERE clause)
-- - Policies that use permissive (allows if ANY policy matches)
-- - Policies that grant access to 'public' role
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression,
  CASE 
    WHEN qual IS NULL OR qual = '' THEN '⚠️ WARNING: No WHERE clause'
    WHEN 'public' = ANY(roles) THEN '⚠️ WARNING: Public role access'
    ELSE '✅ OK'
  END as security_note
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- 4. COUNT POLICIES PER TABLE
-- =============================================================================
-- Ensure each table has appropriate policies for all operations
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
  COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO POLICIES - SECURITY RISK!'
    WHEN COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) = 0 THEN '⚠️ WARNING: No SELECT policy'
    ELSE '✅ OK'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =============================================================================
-- 5. CHECK FOR PUBLIC ACCESS (ANON ROLE)
-- =============================================================================
-- Should be minimal/none - anon role should not have direct table access
SELECT 
  tablename, 
  grantee, 
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'anon'
ORDER BY tablename, privilege_type;

-- =============================================================================
-- 6. CHECK FOR EXPOSED FUNCTIONS
-- =============================================================================
-- Review each function for security:
-- - SECURITY DEFINER functions (run with creator's privileges)
-- - Functions accessible to anon role
SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '⚠️ WARNING: Runs with creator privileges'
    ELSE '✅ OK'
  END as security_note
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- =============================================================================
-- 7. CHECK FUNCTION PERMISSIONS
-- =============================================================================
-- Check which roles can execute functions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
ORDER BY routine_name, grantee;

-- =============================================================================
-- 8. CHECK FOR POLICIES WITH NO CONDITIONS
-- =============================================================================
-- Policies without WHERE clauses are dangerous
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  '❌ SECURITY RISK: Policy allows all rows!' as warning
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual IS NULL OR qual = '')
ORDER BY tablename, policyname;

-- =============================================================================
-- 9. CHECK FOR PERMISSIVE POLICIES
-- =============================================================================
-- Permissive policies allow access if ANY policy matches (less secure)
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  '⚠️ WARNING: Permissive policy - consider RESTRICTIVE' as note
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
ORDER BY tablename, policyname;

-- =============================================================================
-- 10. SUMMARY REPORT
-- =============================================================================
SELECT 
  'Total Tables' as metric,
  COUNT(*)::text as value
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Tables with RLS Enabled' as metric,
  COUNT(*)::text as value
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
  'Tables without RLS' as metric,
  COUNT(*)::text as value
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false

UNION ALL

SELECT 
  'Total Policies' as metric,
  COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Policies without WHERE clause' as metric,
  COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public' AND (qual IS NULL OR qual = '')

UNION ALL

SELECT 
  'Public Functions' as metric,
  COUNT(*)::text as value
FROM information_schema.routines
WHERE routine_schema = 'public';
