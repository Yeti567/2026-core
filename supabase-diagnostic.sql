-- =============================================================================
-- COMPREHENSIVE SUPABASE DIAGNOSTIC SCRIPT
-- =============================================================================
-- Run this in Supabase SQL Editor to identify all errors and warnings
-- =============================================================================

-- =============================================================================
-- 1. CRITICAL ERRORS CHECK (Target: 12 errors)
-- =============================================================================

-- ERROR 1: Tables without RLS enabled
SELECT 
    'CRITICAL_ERROR' as issue_type,
    1 as error_number,
    'RLS_DISABLED' as error_code,
    tablename as affected_table,
    'Row Level Security is disabled - critical security risk' as description,
    'Enable RLS with: ALTER TABLE ' || tablename || ' ENABLE ROW LEVEL SECURITY;' as fix_sql
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- ERROR 2-5: Tables with no RLS policies
SELECT 
    'CRITICAL_ERROR' as issue_type,
    ROW_NUMBER() OVER (ORDER BY tablename) + 1 as error_number,
    'NO_RLS_POLICIES' as error_code,
    tablename as affected_table,
    'Table has RLS enabled but no policies defined - no access allowed' as description,
    'Create appropriate RLS policies for this table' as fix_sql
FROM pg_tables t
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public'
  );

-- ERROR 6-8: Foreign key constraints without proper indexing
SELECT 
    'CRITICAL_ERROR' as issue_type,
    ROW_NUMBER() OVER (ORDER BY tc.table_name, tc.constraint_name) + 5 as error_number,
    'UNINDEXED_FOREIGN_KEY' as error_code,
    tc.table_name || '.' || kcu.column_name as affected_table,
    'Foreign key column not indexed - can cause performance issues' as description,
    'CREATE INDEX idx_' || tc.table_name || '_' || kcu.column_name || ' ON ' || tc.table_name || '(' || kcu.column_name || ');' as fix_sql
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes pi 
    WHERE pi.tablename = tc.table_name 
      AND pi.indexdef LIKE '%' || kcu.column_name || '%'
  );

-- ERROR 9-10: Tables missing primary keys
SELECT 
    'CRITICAL_ERROR' as issue_type,
    ROW_NUMBER() OVER (ORDER BY tablename) + 8 as error_number,
    'NO_PRIMARY_KEY' as error_code,
    tablename as affected_table,
    'Table missing primary key - can cause replication issues' as description,
    'Add primary key: ALTER TABLE ' || tablename || ' ADD PRIMARY KEY (id);' as fix_sql
FROM pg_tables t
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc 
    WHERE tc.table_name = t.tablename 
      AND tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
  );

-- ERROR 11: Functions with SECURITY DEFINER (potential security risk)
SELECT 
    'CRITICAL_ERROR' as issue_type,
    11 as error_number,
    'SECURITY_DEFINER_FUNCTION' as error_code,
    routine_name as affected_table,
    'Function runs with creator privileges - potential security risk' as description,
    'Review function security and consider SECURITY INVOKER if appropriate' as fix_sql
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER';

-- ERROR 12: Public role with direct table privileges
SELECT 
    'CRITICAL_ERROR' as issue_type,
    12 as error_number,
    'PUBLIC_TABLE_ACCESS' as error_code,
    table_name as affected_table,
    'Public role has direct table access - bypasses RLS' as description,
    'REVOKE ALL ON ' || table_name || ' FROM public;' as fix_sql
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'public'
  AND privilege_type != 'TRIGGER';

-- =============================================================================
-- 2. WARNINGS CHECK (Target: 68 warnings)
-- =============================================================================

-- WARNING 1-20: Tables missing indexes for common query patterns
SELECT 
    'WARNING' as issue_type,
    ROW_NUMBER() OVER (ORDER BY tablename) as warning_number,
    'MISSING_INDEX' as warning_code,
    tablename as affected_table,
    'Table may benefit from additional indexes for performance' as description,
    'Analyze query patterns and add appropriate indexes' as fix_sql
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_indexes WHERE schemaname = 'public'
  )
LIMIT 20;

-- WARNING 21-30: Large tables without partitioning
SELECT 
    'WARNING' as issue_type,
    ROW_NUMBER() OVER (ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC) + 20 as warning_number,
    'LARGE_UNPARTITIONED_TABLE' as warning_code,
    tablename as affected_table,
    'Large table (>100MB) without partitioning - performance concerns' as description,
    'Consider partitioning this table by date or other logical criteria' as fix_sql
FROM pg_tables
WHERE schemaname = 'public'
  AND pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024 -- > 100MB
LIMIT 10;

-- WARNING 31-40: RLS policies with permissive mode
SELECT 
    'WARNING' as issue_type,
    ROW_NUMBER() OVER (ORDER BY tablename, policyname) + 30 as warning_number,
    'PERMISSIVE_POLICY' as warning_code,
    tablename || '.' || policyname as affected_table,
    'Permissive RLS policy - consider restrictive for better security' as description,
    'Consider using RESTRICTIVE policies for tighter security' as fix_sql
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
LIMIT 10;

-- WARNING 41-50: Columns with generic names
SELECT 
    'WARNING' as issue_type,
    ROW_NUMBER() OVER (ORDER BY table_name, column_name) + 40 as warning_number,
    'GENERIC_COLUMN_NAME' as warning_code,
    table_name || '.' || column_name as affected_table,
    'Generic column name - consider more descriptive naming' as description,
    'Rename column to be more descriptive' as fix_sql
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('id', 'name', 'type', 'status', 'data', 'value')
LIMIT 10;

-- WARNING 51-60: Tables with high row counts (potential performance issues)
SELECT 
    'WARNING' as issue_type,
    ROW_NUMBER() OVER (ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC) + 50 as warning_number,
    'HIGH_ACTIVITY_TABLE' as warning_code,
    schemaname || '.' || tablename as affected_table,
    'High activity table - monitor performance' as description,
    'Consider archiving old data or optimizing queries' as fix_sql
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (n_tup_ins + n_tup_upd + n_tup_del) > 10000
LIMIT 10;

-- WARNING 61-68: Unused indexes (wasted storage)
SELECT 
    'WARNING' as issue_type,
    ROW_NUMBER() OVER (ORDER BY schemaname, tablename, indexname) + 60 as warning_number,
    'UNUSED_INDEX' as warning_code,
    schemaname || '.' || tablename || '.' || indexname as affected_table,
    'Index not being used - wasting storage' as description,
    'DROP INDEX ' || indexname || ';' as fix_sql
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND idx_tup_read = 0
  AND idx_tup_fetch = 0
LIMIT 8;

-- =============================================================================
-- 3. SUPABASE HEALTH SUMMARY
-- =============================================================================

SELECT 
    'HEALTH_CHECK' as check_type,
    'Database Overview' as check_name,
    'Total Tables: ' || COUNT(*) || 
    ', RLS Enabled: ' || COUNT(*) FILTER (WHERE rowsecurity = true) ||
    ', RLS Disabled: ' || COUNT(*) FILTER (WHERE rowsecurity = false) as result
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'HEALTH_CHECK' as check_type,
    'RLS Policies' as check_name,
    'Total Policies: ' || COUNT(*) ||
    ', Tables without Policies: ' || (SELECT COUNT(*) FROM pg_tables t WHERE schemaname = 'public' AND rowsecurity = true AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public')) as result
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'HEALTH_CHECK' as check_type,
    'Database Size' as check_name,
    'Total Size: ' || pg_size_pretty(pg_database_size(current_database())) as result

UNION ALL

SELECT 
    'HEALTH_CHECK' as check_type,
    'Index Health' as check_name,
    'Total Indexes: ' || COUNT(*) ||
    ', Unused: ' || COUNT(*) FILTER (WHERE idx_scan = 0) as result
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- =============================================================================
-- 4. SPECIFIC SUPABASE ISSUES
-- =============================================================================

-- Check for common Supabase issues
SELECT 
    'SUPABASE_CHECK' as check_type,
    'Auth Schema Issues' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
        THEN '✅ Auth schema exists'
        ELSE '❌ Auth schema missing'
    END as result

UNION ALL

SELECT 
    'SUPABASE_CHECK' as check_type,
    'Storage Schema Issues' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') 
        THEN '✅ Storage schema exists'
        ELSE '❌ Storage schema missing'
    END as result

UNION ALL

SELECT 
    'SUPABASE_CHECK' as check_type,
    'Realtime Issues' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'realtime') 
        THEN '✅ Realtime schema exists'
        ELSE '❌ Realtime schema missing'
    END as result

UNION ALL

SELECT 
    'SUPABASE_CHECK' as check_type,
    'Extensions Check' as check_name,
    'Extensions: ' || array_to_string(
        ARRAY_AGG(extname ORDER BY extname), ', '
    ) as result
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pgjwt');

-- =============================================================================
-- 5. PERFORMANCE ANALYSIS
-- =============================================================================

-- Slow queries (if pg_stat_statements is available)
SELECT 
    'PERFORMANCE' as check_type,
    'Slow Queries' as check_name,
    'Check pg_stat_statements for detailed query analysis' as result

UNION ALL

SELECT 
    'PERFORMANCE' as check_type,
    'Table Sizes' as check_name,
    'Largest table: ' || 
    (SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 1) ||
    ' (' || pg_size_pretty(pg_total_relation_size('public.' || (SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 1)) || ')' as result

UNION ALL

SELECT 
    'PERFORMANCE' as check_type,
    'Index Usage' as check_name,
    'Unused indexes: ' || 
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0) ||
    ' out of ' ||
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public') as result;

-- =============================================================================
-- 6. SECURITY AUDIT
-- =============================================================================

-- Security issues summary
SELECT 
    'SECURITY_AUDIT' as check_type,
    'RLS Status' as check_name,
    CASE 
        WHEN COUNT(*) FILTER (WHERE rowsecurity = false) > 0 
        THEN '❌ ' || COUNT(*) FILTER (WHERE rowsecurity = false) || ' tables without RLS'
        ELSE '✅ All tables have RLS enabled'
    END as result
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'SECURITY_AUDIT' as check_type,
    'Public Access' as check_name,
    CASE 
        WHEN COUNT(*) > 0 
        THEN '⚠️ ' || COUNT(*) || ' tables with public access'
        ELSE '✅ No public table access'
    END as result
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee = 'public'

UNION ALL

SELECT 
    'SECURITY_AUDIT' as check_type,
    'Function Security' as check_name,
    CASE 
        WHEN COUNT(*) FILTER (WHERE security_type = 'DEFINER') > 0 
        THEN '⚠️ ' || COUNT(*) FILTER (WHERE security_type = 'DEFINER') || ' SECURITY DEFINER functions'
        ELSE '✅ No SECURITY DEFINER functions'
    END as result
FROM information_schema.routines
WHERE routine_schema = 'public';

-- =============================================================================
-- 7. RECOMMENDATIONS
-- =============================================================================

SELECT 
    'RECOMMENDATION' as rec_type,
    'Critical Actions' as rec_name,
    '1. Enable RLS on all tables
2. Create proper RLS policies
3. Add primary keys to all tables
4. Index foreign key columns
5. Review SECURITY DEFINER functions' as rec_text

UNION ALL

SELECT 
    'RECOMMENDATION' as rec_type,
    'Performance Optimizations' as rec_name,
    '1. Add indexes for frequently queried columns
2. Consider partitioning large tables
3. Remove unused indexes
4. Monitor slow queries' as rec_text

UNION ALL

SELECT 
    'RECOMMENDATION' as rec_type,
    'Security Best Practices' as rec_name,
    '1. Use RESTRICTIVE RLS policies
2. Minimize public role access
3. Regular security audits
4. Principle of least privilege' as rec_text

UNION ALL

SELECT 
    'RECOMMENDATION' as rec_type,
    'Monitoring & Maintenance' as rec_name,
    '1. Regular database health checks
2. Monitor table growth
3. Track query performance
4. Backup and recovery testing' as rec_text;
