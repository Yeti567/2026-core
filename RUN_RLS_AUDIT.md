# How to Run Supabase RLS Audit

## Quick Start Guide

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run Queries

Copy queries from `scripts/supabase-rls-audit.sql` and run them one by one.

---

## Essential Queries to Run

### Query 1: Check for Tables Without RLS (CRITICAL)

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false;
```

**✅ Expected Result:** 0 rows (all tables should have RLS)

**❌ If rows found:** Enable RLS immediately:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

---

### Query 2: Summary Report

```sql
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
  'Policies with USING(true)' as metric,
  COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public' AND qual = 'true';
```

**Expected Results:**
- Total Tables: ~60-70
- Tables with RLS: ~60-70
- Tables without RLS: 0
- Total Policies: 100+
- Policies with USING(true): ~5

---

### Query 3: Find Weak Policies

```sql
SELECT 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual IS NULL OR qual = '' OR qual = 'true')
ORDER BY tablename, policyname;
```

**Expected:** ~5 rows (review each one)

---

### Query 4: Check Public Access

```sql
SELECT tablename, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'anon'
ORDER BY tablename, privilege_type;
```

**Expected:** Minimal/none (only if intentional)

---

### Query 5: Check Public Functions

```sql
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

**Expected:** Review each function, especially `SECURITY DEFINER` functions

---

## Full Script Location

**File:** `scripts/supabase-rls-audit.sql`

Contains all 10 queries with detailed comments.

---

## Troubleshooting

### Connection Timeout
- **Issue:** Queries timing out
- **Solution:** Run queries one at a time, start with simpler queries

### No Results
- **Issue:** Query returns no rows
- **Solution:** Check table names, verify schema is 'public'

### Permission Errors
- **Issue:** Permission denied
- **Solution:** Ensure you're using service role key or have proper permissions

---

## After Running Queries

1. **Document Results**
   - Save query results
   - Compare with migration files
   - Note any discrepancies

2. **Fix Issues**
   - Enable RLS on any tables without it
   - Review and fix weak policies
   - Document policy decisions

3. **Update Report**
   - Update `SUPABASE_RLS_AUDIT_RESULTS.md` with actual results
   - Document any fixes applied

---

*Script location: scripts/supabase-rls-audit.sql*
*Full report: SUPABASE_RLS_AUDIT_REPORT.md*
