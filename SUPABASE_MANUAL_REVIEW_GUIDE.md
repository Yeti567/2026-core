# Supabase Manual Security Review Guide

## Overview

This guide provides SQL queries to run in the Supabase SQL Editor to verify security configuration. These queries check for potential security issues that require manual review.

**Estimated Time:** 10-15 minutes  
**Difficulty:** Easy (copy/paste queries)

---

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

---

## Step 2: Run Essential Security Queries

### Query 1: Check Tables Without RLS

**Purpose:** Verify all tables have Row Level Security enabled

```sql
-- Check for tables without RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;
```

**Expected Result:** Should return **0 rows** (all tables should have RLS enabled)

**If rows are returned:**
- ⚠️ **CRITICAL** - These tables are accessible without RLS
- **Action:** Enable RLS immediately:
  ```sql
  ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
  ```

---

### Query 2: Check Weak RLS Policies

**Purpose:** Find policies that allow access to all rows (`USING (true)`)

```sql
-- Check for policies with USING (true) - allows all rows
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
```

**Expected Result:** May return some rows (review each one)

**What to check:**
- ✅ **Acceptable:** Policies on public reference tables (e.g., `certification_types`, `document_types`)
- ⚠️ **Review:** Policies on user/company data tables
- ❌ **Critical:** Policies allowing all users to see all companies' data

**Example of ACCEPTABLE:**
```sql
-- Public reference data (OK)
CREATE POLICY "certification_types_select" ON certification_types
  FOR SELECT USING (true);  -- ✅ OK - public reference data
```

**Example of CRITICAL:**
```sql
-- User data (NOT OK)
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (true);  -- ❌ CRITICAL - exposes all user data!
```

---

### Query 3: Check Public Access (anon role)

**Purpose:** Find tables/functions accessible to unauthenticated users

```sql
-- Check for tables with public (anon) access
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND grantee = 'anon'
ORDER BY table_name, privilege_type;
```

**Expected Result:** Should return **minimal or no rows**

**If rows are returned:**
- Review each table - should only be public reference data
- **Action:** Revoke access if not needed:
  ```sql
  REVOKE ALL ON TABLE <table_name> FROM anon;
  ```

---

### Query 4: Check Exposed Functions

**Purpose:** Find functions accessible to unauthenticated users

```sql
-- Check for functions granted to anon role
SELECT 
  routine_schema,
  routine_name,
  routine_type,
  security_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    SELECT routine_name 
    FROM information_schema.routine_privileges 
    WHERE grantee = 'anon'
  )
ORDER BY routine_name;
```

**Expected Result:** May return 1-2 functions (invitation flow)

**What to check:**
- ✅ **Acceptable:** Invitation validation functions (e.g., `validate_invitation_token`)
- ⚠️ **Review:** Any function that modifies data
- ❌ **Critical:** Functions that expose user data without authentication

**Example of ACCEPTABLE:**
```sql
-- Invitation validation (OK)
GRANT EXECUTE ON FUNCTION validate_invitation_token(text) TO anon;
-- ✅ OK - needed for invitation acceptance flow
```

**Example of CRITICAL:**
```sql
-- User data access (NOT OK)
GRANT EXECUTE ON FUNCTION get_all_users() TO anon;
-- ❌ CRITICAL - exposes all user data!
```

---

### Query 5: Check Policy Coverage

**Purpose:** Verify all tables have policies for common operations

```sql
-- Check which tables have SELECT policies
SELECT 
  t.tablename,
  COUNT(p.policyname) as policy_count,
  STRING_AGG(DISTINCT p.cmd::text, ', ') as operations_covered
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true  -- Only check tables with RLS enabled
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0  -- Tables with no policies
ORDER BY t.tablename;
```

**Expected Result:** Should return **0 rows** (all tables should have policies)

**If rows are returned:**
- ⚠️ **CRITICAL** - Tables with RLS enabled but no policies = no access
- **Action:** Create appropriate policies or disable RLS if table should be public

---

### Query 6: Check for Company Isolation

**Purpose:** Verify company isolation is enforced in policies

```sql
-- Check policies for company isolation patterns
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
```

**Expected Result:** Should return many rows (most tables should have company isolation)

**What to check:**
- ✅ **Good:** Policies using `company_id = get_user_company_id()`
- ✅ **Good:** Policies using `is_super_admin()` for admin access
- ⚠️ **Review:** Policies without company_id checks on user data tables

---

### Query 7: Check for Role-Based Access

**Purpose:** Verify role-based access control is implemented

```sql
-- Check policies with role restrictions
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
```

**Expected Result:** Should return rows for admin/supervisor-specific policies

**What to check:**
- ✅ **Good:** Role-specific policies (e.g., `{admin}`, `{supervisor}`)
- ✅ **Good:** Policies restricting access by role
- ⚠️ **Review:** Ensure workers can't access admin-only data

---

### Query 8: Check SECURITY DEFINER Functions

**Purpose:** Find functions that run with elevated privileges

```sql
-- Check for SECURITY DEFINER functions (run with creator's privileges)
SELECT 
  routine_schema,
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER'
ORDER BY routine_name;
```

**Expected Result:** May return some functions (review each)

**What to check:**
- ✅ **Acceptable:** Helper functions (e.g., `get_user_company_id()`, `is_super_admin()`)
- ⚠️ **Review:** Functions that modify data
- ❌ **Critical:** Functions that bypass RLS without proper checks

**Security Note:** `SECURITY DEFINER` functions run with the function creator's privileges, potentially bypassing RLS. Ensure they have proper security checks.

---

### Query 9: Check for Missing Policies on Sensitive Tables

**Purpose:** Identify sensitive tables that might be missing policies

```sql
-- Check sensitive tables for policy coverage
WITH sensitive_tables AS (
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN (
      'user_profiles', 'workers', 'documents', 
      'form_submissions', 'worker_certifications',
      'auditsoft_connections', 'push_subscriptions',
      'maintenance_records', 'equipment_inventory'
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
```

**Expected Result:** All tables should have multiple policies

**What to check:**
- ✅ **Good:** Each table has SELECT, INSERT, UPDATE, DELETE policies
- ⚠️ **Review:** Tables with only SELECT policies (might need INSERT/UPDATE)
- ❌ **Critical:** Tables with no policies (blocked access)

---

### Query 10: Comprehensive Security Summary

**Purpose:** Get an overview of security configuration

```sql
-- Comprehensive security summary
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
```

**Expected Result:** Summary showing:
- ✅ All tables have RLS
- Policy count (should be high)
- Minimal/no public access
- Minimal public functions

---

## Step 3: Review Findings

### Critical Issues (Fix Immediately)

1. **Tables without RLS**
   - **Impact:** Data accessible without authentication
   - **Fix:** Enable RLS immediately

2. **Policies with `USING (true)` on sensitive tables**
   - **Impact:** All users can see all data
   - **Fix:** Add company_id/user_id checks

3. **Public access to sensitive tables**
   - **Impact:** Unauthenticated users can access data
   - **Fix:** Revoke anon privileges

### Review Required (Verify Intentionality)

1. **Policies with `USING (true)`**
   - Check if on public reference tables (OK)
   - Check if on user/company data (NOT OK)

2. **Functions granted to `anon` role**
   - Check if needed for invitation flow (OK)
   - Check if exposes sensitive data (NOT OK)

3. **SECURITY DEFINER functions**
   - Check if they have proper security checks
   - Verify they don't bypass RLS inappropriately

---

## Step 4: Fix Issues (If Found)

### Enable RLS on Table

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

### Create Secure Policy

```sql
-- Example: Company-isolated SELECT policy
CREATE POLICY "users_select_company" ON user_profiles
  FOR SELECT
  USING (company_id = get_user_company_id() OR is_super_admin());
```

### Revoke Public Access

```sql
REVOKE ALL ON TABLE <table_name> FROM anon;
REVOKE ALL ON TABLE <table_name> FROM public;
```

### Fix Weak Policy

```sql
-- Drop weak policy
DROP POLICY IF EXISTS <policy_name> ON <table_name>;

-- Create secure policy
CREATE POLICY "<policy_name>" ON <table_name>
  FOR SELECT
  USING (company_id = get_user_company_id());
```

---

## Step 5: Document Findings

After running the queries, document:

1. **Tables without RLS:** List any found
2. **Weak policies:** List policies with `USING (true)` and verify they're intentional
3. **Public functions:** List functions granted to `anon` and verify they're needed
4. **Missing policies:** List tables that need additional policies

---

## Quick Reference: Expected Results

| Query | Expected Result | Action if Different |
|-------|----------------|---------------------|
| Tables without RLS | 0 rows | Enable RLS immediately |
| Weak policies (`USING (true)`) | 0-5 rows (review) | Verify intentionality |
| Public table access | 0 rows | Revoke anon access |
| Public functions | 0-2 rows (invitation) | Review each function |
| Tables without policies | 0 rows | Create policies |
| Company isolation | Many rows | Verify all user tables |

---

## Support Resources

- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **Policy Examples:** See `supabase/migrations/*.sql` files
- **Security Best Practices:** See `SUPABASE_RLS_AUDIT_REPORT.md`

---

## Next Steps After Review

1. ✅ Document any issues found
2. ✅ Create migration to fix issues (if any)
3. ✅ Test policies with different user roles
4. ✅ Verify company isolation works correctly
5. ✅ Update security audit report

---

*Guide created: January 20, 2026*  
*Estimated review time: 10-15 minutes*  
*Status: Ready for manual review*
