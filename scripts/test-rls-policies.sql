-- =============================================================================
-- RLS Policy Testing Script
-- =============================================================================
-- Run these queries in Supabase SQL Editor to test RLS policies
-- Test with different user roles and companies
-- =============================================================================

-- =============================================================================
-- SETUP: Create Test Users (Run as service_role)
-- =============================================================================
-- Note: These are example queries - adjust based on your auth setup
-- You may need to create users via Supabase Auth UI instead

-- Test User 1: Company A Admin
-- Test User 2: Company A Worker
-- Test User 3: Company B Admin
-- Test User 4: Company B Worker

-- =============================================================================
-- TEST 1: Verify Company Isolation
-- =============================================================================
-- Expected: Users can only see their own company's data
-- Run as: Test User 1 (Company A Admin)

-- Test: Try to access Company B's workers
SELECT * FROM workers 
WHERE company_id != (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
LIMIT 1;

-- Expected Result: Should return 0 rows (RLS should block)

-- =============================================================================
-- TEST 2: Verify Role-Based Access
-- =============================================================================
-- Expected: Workers cannot access admin-only tables/routes
-- Run as: Test User 2 (Company A Worker)

-- Test: Try to access admin functions
SELECT * FROM auditsoft_connections 
WHERE company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid());

-- Expected Result: Should return 0 rows or error (if RLS blocks by role)

-- =============================================================================
-- TEST 3: Verify User-Specific Data Isolation
-- =============================================================================
-- Expected: Users can only see their own submissions
-- Run as: Test User 2 (Company A Worker)

-- Test: Try to access another user's form submissions
SELECT * FROM form_submissions 
WHERE user_id != auth.uid()
LIMIT 1;

-- Expected Result: Should return 0 rows (RLS should block)

-- =============================================================================
-- TEST 4: Verify Public Reference Data Access
-- =============================================================================
-- Expected: All authenticated users can read reference data
-- Run as: Any authenticated user

-- Test: Access certification types (should be public reference)
SELECT * FROM certification_types LIMIT 10;

-- Expected Result: Should return rows (if USING (true) is intentional)

-- =============================================================================
-- TEST 5: Verify Cross-Company Document Access
-- =============================================================================
-- Expected: Users cannot access other companies' documents
-- Run as: Test User 1 (Company A Admin)

-- Test: Try to access Company B's documents
SELECT d.* 
FROM documents d
JOIN user_profiles up ON d.company_id = up.company_id
WHERE up.user_id != auth.uid()
LIMIT 1;

-- Expected Result: Should return 0 rows (RLS should block)

-- =============================================================================
-- TEST 6: Verify INSERT Restrictions
-- =============================================================================
-- Expected: Users can only insert data for their own company
-- Run as: Test User 1 (Company A Admin)

-- Test: Try to insert document for Company B
-- Note: This should fail due to RLS or application logic
INSERT INTO documents (company_id, title, document_type_id)
VALUES (
  (SELECT company_id FROM user_profiles WHERE user_id != auth.uid() LIMIT 1),
  'Test Document',
  1
);

-- Expected Result: Should fail with permission denied

-- =============================================================================
-- TEST 7: Verify UPDATE Restrictions
-- =============================================================================
-- Expected: Users can only update their own company's data
-- Run as: Test User 1 (Company A Admin)

-- Test: Try to update Company B's worker
UPDATE workers 
SET first_name = 'Hacked'
WHERE company_id != (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
LIMIT 1;

-- Expected Result: Should update 0 rows (RLS should block)

-- =============================================================================
-- TEST 8: Verify DELETE Restrictions
-- =============================================================================
-- Expected: Users can only delete their own company's data
-- Run as: Test User 1 (Company A Admin)

-- Test: Try to delete Company B's document
DELETE FROM documents 
WHERE company_id != (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
LIMIT 1;

-- Expected Result: Should delete 0 rows (RLS should block)

-- =============================================================================
-- TEST 9: Verify Function Access (anon role)
-- =============================================================================
-- Expected: Only invitation validation functions accessible to anon
-- Run as: Unauthenticated (anon role)

-- Test: Try to access invitation validation function
SELECT * FROM validate_invitation_token('test-token');

-- Expected Result: Should work (if function is intentionally public)

-- Test: Try to access sensitive function
-- SELECT * FROM get_user_company_id(); -- Should fail

-- Expected Result: Should fail with permission denied

-- =============================================================================
-- TEST 10: Comprehensive Policy Test
-- =============================================================================
-- Expected: All policies work correctly
-- Run as: Test User 1 (Company A Admin)

-- Count accessible records
SELECT 
  'workers' as table_name,
  COUNT(*) as accessible_count
FROM workers
WHERE company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())

UNION ALL

SELECT 
  'documents' as table_name,
  COUNT(*) as accessible_count
FROM documents
WHERE company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())

UNION ALL

SELECT 
  'form_submissions' as table_name,
  COUNT(*) as accessible_count
FROM form_submissions
WHERE user_id = auth.uid();

-- Expected Result: Should only show data for user's company/user_id

-- =============================================================================
-- TEST 11: Verify Policies with USING (true)
-- =============================================================================
-- Expected: Only reference data tables should have USING (true)
-- Run as: Any authenticated user

-- List all policies with USING (true)
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
  AND qual = 'true'
ORDER BY tablename;

-- Expected Result: Should only be reference tables like:
-- - certification_types
-- - document_types
-- - equipment_types
-- - etc.

-- If user/company data tables appear, this is a SECURITY ISSUE

-- =============================================================================
-- TEST 12: Verify Anon Role Access
-- =============================================================================
-- Expected: Minimal anon access (only invitation flow)
-- Run as: Unauthenticated (anon role)

-- Test: Try to read user_profiles
SELECT * FROM user_profiles LIMIT 1;

-- Expected Result: Should return 0 rows or error

-- Test: Try to read workers
SELECT * FROM workers LIMIT 1;

-- Expected Result: Should return 0 rows or error

-- Test: Try to read documents
SELECT * FROM documents LIMIT 1;

-- Expected Result: Should return 0 rows or error

-- =============================================================================
-- TESTING CHECKLIST
-- =============================================================================
-- After running all tests, verify:

-- [ ] Company A users cannot see Company B data
-- [ ] Company B users cannot see Company A data
-- [ ] Workers cannot access admin-only data
-- [ ] Users cannot see other users' personal data (form_submissions, etc.)
-- [ ] Users cannot insert/update/delete other companies' data
-- [ ] Only reference data has USING (true) policies
-- [ ] Anon role has minimal access (only invitation functions)
-- [ ] All sensitive tables have proper RLS policies
-- [ ] Role-based access control works correctly

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================
-- Document any failures or unexpected results:
-- 1. Which test failed
-- 2. What was the actual result vs expected
-- 3. Which policy/table is involved
-- 4. How to fix (create migration)

-- =============================================================================
-- END OF TESTS
-- =============================================================================
