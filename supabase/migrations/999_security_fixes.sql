-- ============================================================================
-- Security Fixes (Audit Remediation)
-- ============================================================================

-- 1. Secure tables found during audit with disabled RLS
-- These tables appear to be manually created or legacy, but pose a security risk if public.

ALTER TABLE IF EXISTS company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_passwords ENABLE ROW LEVEL SECURITY;

-- 2. Add Deny All policies to ensure no unauthorized access
-- (Service Role will still have access)

DROP POLICY IF EXISTS "company_users_deny_all" ON company_users;
CREATE POLICY "company_users_deny_all" ON company_users FOR ALL USING (false);

DROP POLICY IF EXISTS "user_passwords_deny_all" ON user_passwords;
CREATE POLICY "user_passwords_deny_all" ON user_passwords FOR ALL USING (false);

-- 3. Explicitly deny public access to registration tables (System only)
-- Clears "RLS enabled but no policies" warnings
DROP POLICY IF EXISTS "registration_attempts_deny_all" ON registration_attempts;
CREATE POLICY "registration_attempts_deny_all" ON registration_attempts FOR ALL USING (false);

DROP POLICY IF EXISTS "registration_tokens_deny_all" ON registration_tokens;
CREATE POLICY "registration_tokens_deny_all" ON registration_tokens FOR ALL USING (false);
