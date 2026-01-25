# Security Pre-Launch Checklist - Quick Reference

## 🚨 Critical (Do First)

1. **Review RLS Policies**
   ```bash
   # Open Supabase SQL Editor
   # Run: scripts/manual-rls-review.sql (Query 2)
   # Review 5 policies with USING (true)
   ```

2. **Review Public Functions**
   ```bash
   # Run: scripts/manual-rls-review.sql (Query 4)
   # Review 2 functions granted to anon role
   ```

3. **Test Cross-Company Access**
   - Create test user in Company A
   - Try accessing Company B data
   - Should get 403 or empty results

4. **Test CSP**
   ```bash
   npm run dev
   # Check browser console for CSP violations
   ```

5. **Authenticate Snyk**
   ```bash
   snyk auth
   npm run security:scan
   ```

---

## ⚠️ High Priority

1. **Fix TypeScript Types**
   - Review: `TYPESCRIPT_TYPE_SAFETY_AUDIT.md`
   - Fix 28 Supabase `as any` instances
   - Fix 17 API parameter `as any` instances

2. **Configure Sentry**
   - Add DSN to `.env.local`
   - See: `SENTRY_SETUP.md`

3. **Production Environment**
   - Verify all env vars set in production
   - Check: `env.example` for list

4. **Test Roles & Offline**
   - Test admin, supervisor, worker roles
   - Test offline form submissions

---

## 📋 Medium Priority

1. **Document Decisions**
   - Create `SECURITY_DECISIONS.md`
   - Document intentional `USING (true)` policies

2. **Incident Response**
   - Create incident response plan
   - Document procedures

---

## ✅ Already Complete

- ✅ CSP headers added
- ✅ Rate limiting (16 routes)
- ✅ Error handling secure
- ✅ Security headers configured
- ✅ Sentry installed
- ✅ GitHub Actions security workflow
- ✅ Upstash Redis support (code ready)

---

## 📊 Progress

- **Critical:** 1/7 (14%)
- **High:** 2/7 (29%)
- **Medium:** 2/5 (40%)

**See full checklist:** `SECURITY_PRE_LAUNCH_CHECKLIST.md`
