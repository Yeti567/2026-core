-- ============================================================================
-- ROW LEVEL SECURITY (RLS) STATUS CHECK
-- ============================================================================
-- This script verifies that RLS is enabled on all tables in the public schema
-- Run this against your Supabase database to ensure security compliance
-- ============================================================================

-- Check current RLS status for all tables
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status,
    rowsecurity as is_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY 
    CASE WHEN rowsecurity THEN 0 ELSE 1 END, -- Show disabled first
    tablename;

-- Count summary
SELECT 
    COUNT(*) as total_tables,
    COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled,
    COUNT(*) FILTER (WHERE rowsecurity = false) as rls_disabled,
    CASE 
        WHEN COUNT(*) FILTER (WHERE rowsecurity = false) > 0 THEN '⚠️ WARNING: Some tables missing RLS'
        ELSE '✅ All tables have RLS enabled'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public';

-- List tables WITHOUT RLS (CRITICAL SECURITY ISSUE)
SELECT 
    tablename,
    'CRITICAL: RLS is DISABLED on this table!' as security_issue
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;

-- List all RLS policies for reference
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
