-- Verification Script for Migration 027
-- Run this to verify the migration was successful

-- Check companies table has new columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN ('industry', 'employee_count', 'years_in_business', 'main_services')
ORDER BY column_name;

-- Check registration_tokens table has new columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'registration_tokens'
  AND column_name IN ('industry', 'employee_count', 'years_in_business', 'main_services')
ORDER BY column_name;

-- Check index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'companies'
  AND indexname = 'idx_companies_industry';

-- Check function exists and has correct signature
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'use_registration_token'
  AND routine_schema = 'public';

-- Test: Verify a company can have industry data
-- (Run this after creating a test company)
-- SELECT 
--     name,
--     industry,
--     employee_count,
--     years_in_business,
--     main_services
-- FROM companies
-- WHERE industry IS NOT NULL
-- LIMIT 1;
