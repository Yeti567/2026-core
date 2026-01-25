# Security Testing Quick Start

**Purpose:** Quick reference for running security tests before launch.

---

## 🚀 Quick Commands

### Automated Tests

```bash
# Run all automated security tests
npm run test:security:automated

# Test API security
npm run test:security:api http://localhost:3000 [AUTH_TOKEN]

# Run all security tests
npm run test:security:all
```

### Manual Tests

```bash
# 1. Build and start production server
npm run build
npm run start

# 2. Test in browser
# Open http://localhost:3000
# Check DevTools → Console for CSP violations
# Check DevTools → Network → Headers for security headers
```

---

## 📋 Testing Checklist

### 1. RLS Policy Testing

**Location:** Supabase Dashboard → SQL Editor

**Script:** `scripts/test-rls-policies.sql`

**Steps:**
1. Copy queries from `scripts/test-rls-policies.sql`
2. Run as different users (Company A Admin, Company B Admin, Worker)
3. Verify company isolation works
4. Verify role-based access works

**Expected:**
- ✅ Company A users cannot see Company B data
- ✅ Workers cannot access admin routes
- ✅ Users cannot see other users' personal data

---

### 2. CSP Testing

**Location:** Browser DevTools

**Steps:**
1. Open app in browser
2. Navigate through pages
3. Check Console for CSP violations
4. Check Network → Headers for CSP header

**Expected:**
- ✅ No CSP violations in console
- ✅ CSP header present on all pages
- ✅ All scripts/images load correctly

**Guide:** `CSP_IMPLEMENTATION.md`

---

### 3. Rate Limiting Testing

**Location:** API endpoints

**Test Script:**
```bash
# Test form submission rate limit (20/minute)
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/forms/convert-pdf/1/test-submit \
    -H "Authorization: Bearer $TOKEN"
done

# Should see 429 after 20 requests
```

**Expected:**
- ✅ First 20 requests succeed
- ✅ Request 21+ returns 429
- ✅ Rate limit headers present

**Guide:** `RATE_LIMITING_ADDITIONAL_ROUTES.md`

---

### 4. File Upload Testing

**Location:** File upload endpoints

**Test Cases:**
1. Upload file > 50MB → Should fail
2. Upload non-PDF file → Should fail
3. Upload malicious filename → Should sanitize

**Expected:**
- ✅ Size limits enforced
- ✅ File type validation works
- ✅ Filenames sanitized

---

### 5. Offline Mode Testing

**Location:** Browser DevTools → Application → Service Workers

**Steps:**
1. Enable offline mode
2. Submit form
3. Verify saved to IndexedDB
4. Re-enable online
5. Verify sync works

**Expected:**
- ✅ Forms save offline
- ✅ Data syncs when online
- ✅ No errors in console

---

### 6. User Role Testing

**Test Users Needed:**
- Admin
- Supervisor
- Worker

**Test Cases:**
1. Admin → Full access ✅
2. Supervisor → View-only admin access ✅
3. Worker → No admin access ✅

**Expected:**
- ✅ Role-based access works
- ✅ 403 for insufficient permissions

---

### 7. Cross-Company Access Testing

**Test Users Needed:**
- Company A Admin
- Company B Admin

**Steps:**
1. Login as Company A Admin
2. Try to access Company B data
3. Should return empty or 403

**Expected:**
- ✅ Company isolation works
- ✅ Cannot access other company data

---

## 🔍 Detailed Guides

- **Full Manual Testing:** `MANUAL_SECURITY_TESTING_GUIDE.md`
- **RLS Testing:** `scripts/test-rls-policies.sql`
- **Pre-Launch Checklist:** `SECURITY_PRE_LAUNCH_CHECKLIST.md`

---

## ⚡ Quick Test Sequence

```bash
# 1. Build
npm run build

# 2. Start
npm run start

# 3. Run automated tests
npm run test:security:automated

# 4. Test API (requires AUTH_TOKEN)
npm run test:security:api http://localhost:3000 $AUTH_TOKEN

# 5. Manual browser testing
# - Open http://localhost:3000
# - Check CSP violations
# - Test offline mode
# - Test user roles
```

---

## 📊 Test Results

**Document results in:**
- `SECURITY_PRE_LAUNCH_CHECKLIST.md`
- `MANUAL_REVIEW_CHECKLIST.md` (for RLS)

**Report issues:**
- Create GitHub issue with `security` label
- Include test details and screenshots

---

*Last Updated: January 20, 2026*
