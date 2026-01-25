# Security Pre-Launch Checklist

**Last Updated:** January 20, 2026  
**Status:** In Progress  
**Target Launch Date:** _______________

---

## 🚨 Critical (Must Complete Before Launch)

### Database Security

- [ ] **Review 5 Supabase RLS policies with `USING (true)`**
  - **Action:** Run Query 2 from `scripts/manual-rls-review.sql` in Supabase SQL Editor
  - **Location:** `SUPABASE_MANUAL_REVIEW_GUIDE.md`
  - **Expected:** Verify these are intentional (public reference data only)
  - **Risk:** Policies with `USING (true)` on user/company data expose all records

- [ ] **Review 2 functions granted to `anon` role**
  - **Action:** Run Query 4 from `scripts/manual-rls-review.sql`
  - **Location:** `SUPABASE_MANUAL_REVIEW_GUIDE.md`
  - **Expected:** Should only be invitation validation functions
  - **Risk:** Functions accessible to unauthenticated users could expose data

- [ ] **Test cross-company data access (should be blocked)**
  - **Action:** 
    1. Create test user in Company A
    2. Try to access Company B's data via API
    3. Verify 403 Forbidden or empty results
  - **Test Routes:** `/api/documents`, `/api/workers`, `/api/certifications`
  - **Risk:** Users could access other companies' data

### Security Headers

- [x] **Add Content-Security-Policy header**
  - **Status:** ✅ Complete
  - **Location:** `middleware.ts`
  - **Implementation:** CSP with nonce-based script execution
  - **Note:** See `CSP_IMPLEMENTATION.md`

- [ ] **Test CSP doesn't break functionality**
  - **Action:** 
    1. Test all pages load correctly
    2. Test forms submit correctly
    3. Test images load (Supabase storage)
    4. Check browser console for CSP violations
  - **Risk:** CSP might block legitimate resources

### Security Scanning

- [ ] **Authenticate Snyk (`snyk auth`)**
  - **Action:** Run `snyk auth` in terminal (requires browser)
  - **Location:** `SNYK_SETUP_INSTRUCTIONS.md`
  - **Alternative:** Use API token method if browser doesn't work
  - **Risk:** Can't run security scans without authentication

- [ ] **Run full security scan (`npm run security:scan`)**
  - **Action:** After authentication, run `npm run security:scan`
  - **Expected:** Review vulnerabilities and fix critical/high issues
  - **Risk:** Unknown vulnerabilities in dependencies

---

## ⚠️ High Priority (Complete Before Launch)

### Type Safety

- [ ] **Fix 28 Supabase `as any` instances**
  - **Location:** `TYPESCRIPT_TYPE_SAFETY_AUDIT.md`
  - **Action:** Replace with proper types from `lib/supabase/database.types.ts`
  - **Example:**
    ```typescript
    // ❌ Before
    const data = result.data as any;
    
    // ✅ After
    const data = result.data as UserProfile[];
    ```

- [ ] **Fix 17 API parameter `as any` instances**
  - **Location:** `TYPESCRIPT_TYPE_SAFETY_AUDIT.md`
  - **Action:** Add proper Zod validation or TypeScript types
  - **Example:**
    ```typescript
    // ❌ Before
    const body = await request.json() as any;
    
    // ✅ After
    const body = await request.json();
    const validated = createDocumentSchema.parse(body);
    ```

### Monitoring & Configuration

- [x] **Setup Sentry error monitoring**
  - **Status:** ✅ Complete
  - **Location:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
  - **Action Required:** Add DSN to `.env.local` (see `SENTRY_SETUP.md`)
  - **Note:** Production-only (disabled in development)

- [ ] **Configure production environment variables**
  - **Action:** Verify all required variables are set in production:
    - [ ] `NEXT_PUBLIC_SUPABASE_URL`
    - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - [ ] `SUPABASE_SERVICE_ROLE_KEY`
    - [ ] `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`
    - [ ] `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
    - [ ] `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (optional)
    - [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
  - **Location:** Production hosting platform (Vercel, etc.)

- [ ] **Verify HTTPS enforced (check HSTS header)**
  - **Action:** 
    1. Deploy to production
    2. Check response headers: `Strict-Transport-Security`
    3. Verify value: `max-age=63072000; includeSubDomains; preload`
  - **Location:** `next.config.js` (already configured)
  - **Tool:** Browser DevTools → Network → Headers

### Testing

- [ ] **Test offline mode thoroughly**
  - **Action:**
    1. Enable offline mode in browser DevTools
    2. Test form submissions (should save to IndexedDB)
    3. Test form viewing (should work from cache)
    4. Test sync when back online
  - **Risk:** Offline functionality might not work correctly

- [ ] **Test all user roles (admin, supervisor, worker)**
  - **Action:** Create test users for each role and verify:
    - [ ] Admin can access admin routes
    - [ ] Supervisor can view but not edit admin data
    - [ ] Worker cannot access admin routes
    - [ ] Each role sees only their company's data
  - **Risk:** Role-based access control might have gaps

---

## 📋 Medium Priority (Complete Within 2 Weeks)

### Code Quality

- [ ] **Replace remaining `as any` instances**
  - **Location:** `TYPESCRIPT_TYPE_SAFETY_AUDIT.md`
  - **Total:** 65 instances found
  - **Priority:** Focus on API routes and data access code first

### Rate Limiting

- [x] **Add rate limiting to form submissions**
  - **Status:** ✅ Complete
  - **Location:** `app/api/forms/convert-pdf/[id]/test-submit/route.ts`
  - **Limit:** 20 requests/minute per user

- [x] **Add rate limiting to email routes**
  - **Status:** ✅ Complete
  - **Location:** 
    - `app/api/invitations/route.ts` (10/hour)
    - `app/api/invitations/bulk/route.ts` (3/hour)
  - **Limit:** Prevents email abuse

### Automation

- [x] **Setup GitHub Actions security workflow**
  - **Status:** ✅ Complete
  - **Location:** `.github/workflows/security.yml`
  - **Action Required:** Add `SNYK_TOKEN` to GitHub Secrets
  - **Note:** Runs on push, PR, and weekly schedule

- [ ] **Document intentional security decisions**
  - **Action:** Create `SECURITY_DECISIONS.md` documenting:
    - Why certain policies use `USING (true)` (if intentional)
    - Why certain functions are public (if intentional)
    - Any known security trade-offs
  - **Risk:** Future developers might "fix" intentional configurations

- [ ] **Create incident response plan**
  - **Action:** Document:
    - Who to contact for security incidents
    - How to report vulnerabilities
    - Steps to take if breach detected
    - Rollback procedures
  - **Template:** See security best practices

---

## 🔵 Low Priority (Optional)

### Infrastructure

- [x] **Upgrade to Upstash Redis for rate limiting**
  - **Status:** ✅ Complete (code ready)
  - **Location:** `lib/utils/rate-limit.ts`
  - **Action Required:** Add Upstash credentials to `.env.local`
  - **Note:** Falls back to database/memory if not configured

- [ ] **Add automated penetration testing**
  - **Tools:** OWASP ZAP, Burp Suite, or commercial services
  - **Frequency:** Quarterly or before major releases
  - **Cost:** Free tools available, commercial tools cost $

- [ ] **Setup security headers monitoring**
  - **Tool:** SecurityHeaders.com, Mozilla Observatory
  - **Action:** Add to CI/CD to verify headers on each deploy
  - **Goal:** A+ rating

- [ ] **Add dependency update automation (Dependabot)**
  - **Action:** Enable Dependabot in GitHub
  - **Location:** Repository → Settings → Security → Dependabot
  - **Benefit:** Automatic PRs for dependency updates

---

## ✅ Completed Items

### Security Implementations

- [x] **XSS Protection**
  - Created HTML sanitizer utility
  - Fixed `dangerouslySetInnerHTML` vulnerabilities
  - Implemented CSP headers

- [x] **Rate Limiting**
  - Created centralized rate limiting utility
  - Protected 16 critical routes
  - Added Upstash Redis support

- [x] **CORS Configuration**
  - Verified secure CORS setup
  - Created CORS utility for future use

- [x] **Error Handling**
  - Created secure error handling utility
  - Fixed 50+ routes exposing sensitive errors
  - Implemented environment-specific error messages

- [x] **Environment Variables**
  - Created `.env.example` template
  - Verified `.env.local` is ignored
  - Audited for client-side secret exposure

- [x] **Security Headers**
  - Added 7 security headers to Next.js config
  - Implemented CSP with nonce
  - Configured HSTS, X-Frame-Options, etc.

- [x] **Service Worker Cache Security**
  - Fixed dangerous API route caching
  - Set sensitive routes to NetworkOnly

- [x] **Sentry Error Tracking**
  - Installed and configured Sentry
  - Production-only error tracking
  - Sensitive data filtering

- [x] **Automated Security Testing**
  - Created GitHub Actions security workflow
  - npm audit integration
  - Snyk integration
  - ESLint security scanning

---

## 📊 Progress Summary

### Critical Items
- **Total:** 7
- **Completed:** 1 (CSP header added)
- **Remaining:** 6
- **Progress:** 14%

### High Priority Items
- **Total:** 7
- **Completed:** 2 (Sentry setup, form/email rate limiting)
- **Remaining:** 5
- **Progress:** 29%

### Medium Priority Items
- **Total:** 5
- **Completed:** 2 (form/email rate limiting, GitHub Actions)
- **Remaining:** 3
- **Progress:** 40%

### Low Priority Items
- **Total:** 4
- **Completed:** 1 (Upstash code ready)
- **Remaining:** 3
- **Progress:** 25%

---

## 🎯 Quick Start Guide

### 1. Critical Items (Do First)

```bash
# 1. Review RLS policies
# Open Supabase SQL Editor and run:
# scripts/test-rls-policies.sql

# 2. Authenticate Snyk
snyk auth

# 3. Run security scan
npm run security:scan

# 4. Test CSP
npm run build
npm run start
# Open browser, check console for CSP violations

# 5. Run automated security tests
npm run test:security:automated
```

**See:** `SECURITY_TESTING_QUICK_START.md` for detailed testing guide

### 2. High Priority Items

```bash
# 1. Fix TypeScript types
# Review TYPESCRIPT_TYPE_SAFETY_AUDIT.md
# Fix 'as any' instances systematically

# 2. Configure Sentry
# Add DSN to .env.local (see SENTRY_SETUP.md)

# 3. Test roles and offline mode
# Create test users and test thoroughly
```

### 3. Medium Priority Items

```bash
# 1. Document security decisions
# Create SECURITY_DECISIONS.md

# 2. Create incident response plan
# Document procedures for security incidents
```

---

## 📝 Notes

### RLS Policies with `USING (true)`

**Found:** 5 policies  
**Action:** Review each in Supabase SQL Editor  
**Expected:** Should only be on public reference tables (e.g., `certification_types`, `document_types`)

**If found on user/company data:**
```sql
-- Fix by adding company isolation
DROP POLICY "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name
  FOR SELECT
  USING (company_id = get_user_company_id());
```

### Functions Granted to `anon` Role

**Found:** 2 functions  
**Action:** Review each function  
**Expected:** Should only be invitation validation functions

**If exposing sensitive data:**
```sql
-- Revoke public access
REVOKE EXECUTE ON FUNCTION function_name FROM anon;
```

### Type Safety Issues

**Total `as any` instances:** 65  
**Priority order:**
1. API route parameters (17) - security risk
2. Supabase queries (28) - data access risk
3. Component props (20) - lower risk

**Fix systematically:**
- Start with API routes
- Then Supabase queries
- Finally component code

---

## 🔗 Related Documentation

- **RLS Audit:** `SUPABASE_MANUAL_REVIEW_GUIDE.md`
- **RLS Testing:** `scripts/test-rls-policies.sql`
- **Type Safety:** `TYPESCRIPT_TYPE_SAFETY_AUDIT.md`
- **Sentry Setup:** `SENTRY_SETUP.md`
- **Snyk Setup:** `SNYK_SETUP_INSTRUCTIONS.md`
- **Security Audit:** `COR_PATHWAYS_SECURITY_AUDIT_REPORT.md`
- **Rate Limiting:** `RATE_LIMITING_ADDITIONAL_ROUTES.md`
- **CSP:** `CSP_IMPLEMENTATION.md`
- **Manual Testing:** `MANUAL_SECURITY_TESTING_GUIDE.md`
- **Quick Start:** `SECURITY_TESTING_QUICK_START.md`

---

## ✅ Sign-Off

**Security Review Completed By:** _______________  
**Date:** _______________  
**Approved for Launch:** [ ] Yes [ ] No

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

---

*Checklist Version: 1.0*  
*Last Updated: January 20, 2026*
