# Manual Security Testing Guide

**Purpose:** Comprehensive manual testing checklist for security features before production launch.

**Estimated Time:** 2-4 hours

---

## Prerequisites

1. **Test Users Created:**
   - Company A Admin
   - Company A Supervisor
   - Company A Worker
   - Company B Admin
   - Company B Worker

2. **Test Environment:**
   - Development or staging environment
   - Production-like configuration
   - Access to Supabase Dashboard

3. **Tools:**
   - Browser DevTools
   - Postman/Insomnia (for API testing)
   - Network monitoring tool

---

## 1. RLS Policy Testing

### 1.1 Test Company Isolation

**Objective:** Verify users can only access their own company's data.

**Steps:**

1. **Login as Company A Admin**
   ```bash
   # Via browser or API
   POST /api/auth/login
   ```

2. **Try to access Company B's data:**
   ```bash
   # Should return empty array or 403
   GET /api/workers
   GET /api/documents
   GET /api/certifications
   ```

3. **Expected Result:**
   - ✅ Only Company A data returned
   - ✅ No Company B data visible
   - ✅ No errors in console

4. **Repeat with Company B Admin:**
   - Should only see Company B data

**Test Script:** `scripts/test-rls-policies.sql` (Query 1, 5)

---

### 1.2 Test Role-Based Access

**Objective:** Verify role-based restrictions work correctly.

**Steps:**

1. **Login as Worker:**
   ```bash
   POST /api/auth/login
   # Use worker credentials
   ```

2. **Try to access admin routes:**
   ```bash
   GET /api/admin/users
   GET /admin/dashboard
   POST /api/invitations
   ```

3. **Expected Result:**
   - ✅ 403 Forbidden for admin routes
   - ✅ Worker routes accessible
   - ✅ Cannot create invitations

4. **Login as Supervisor:**
   - Should be able to view but not edit admin data

5. **Login as Admin:**
   - Should have full access

**Test Script:** `scripts/test-rls-policies.sql` (Query 2)

---

### 1.3 Test User-Specific Data Isolation

**Objective:** Verify users can only access their own personal data.

**Steps:**

1. **Login as User A:**
   ```bash
   POST /api/auth/login
   ```

2. **Try to access another user's submissions:**
   ```bash
   GET /api/forms/submissions
   # Should only return User A's submissions
   ```

3. **Try to access another user's profile:**
   ```bash
   GET /api/users/{other-user-id}
   # Should return 403 or empty
   ```

4. **Expected Result:**
   - ✅ Only own data visible
   - ✅ Cannot access other users' personal data

**Test Script:** `scripts/test-rls-policies.sql` (Query 3)

---

### 1.4 Test RLS Policies in Supabase SQL Editor

**Objective:** Verify RLS policies directly in database.

**Steps:**

1. **Open Supabase Dashboard → SQL Editor**

2. **Run test queries:**
   ```bash
   # Copy queries from scripts/test-rls-policies.sql
   ```

3. **Test as different users:**
   - Switch user context in SQL Editor
   - Run queries as Company A Admin
   - Run queries as Company B Admin
   - Run queries as Worker

4. **Expected Results:**
   - ✅ Company isolation works
   - ✅ Role restrictions work
   - ✅ User isolation works

**Test Script:** `scripts/test-rls-policies.sql`

---

## 2. Content-Security-Policy (CSP) Testing

### 2.1 Verify CSP Header Present

**Objective:** Verify CSP header is set on all responses.

**Steps:**

1. **Open Browser DevTools → Network tab**

2. **Navigate to pages:**
   - `/dashboard`
   - `/admin`
   - `/forms`
   - `/workers`

3. **Check Response Headers:**
   ```bash
   Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-...' ...
   ```

4. **Expected Result:**
   - ✅ CSP header present on all pages
   - ✅ Nonce value changes per request

---

### 2.2 Test CSP Doesn't Break Functionality

**Objective:** Verify CSP doesn't block legitimate resources.

**Steps:**

1. **Open Browser DevTools → Console**

2. **Navigate through app:**
   - Login/logout
   - Submit forms
   - Upload files
   - View images
   - Load charts/graphs

3. **Check for CSP violations:**
   ```javascript
   // Should see no violations in console
   ```

4. **Expected Result:**
   - ✅ No CSP violations in console
   - ✅ All scripts load correctly
   - ✅ All images load correctly
   - ✅ Forms submit correctly

**Common Issues:**
- ❌ Scripts blocked → Check nonce implementation
- ❌ Images blocked → Check `img-src` directive
- ❌ Forms blocked → Check `form-action` directive

---

### 2.3 Test CSP with Supabase Storage

**Objective:** Verify Supabase storage images load correctly.

**Steps:**

1. **Upload an image/document**

2. **View the uploaded file**

3. **Check CSP header:**
   ```bash
   img-src 'self' blob: data: https://*.supabase.co;
   ```

4. **Expected Result:**
   - ✅ Images from Supabase storage load
   - ✅ No CSP violations

---

## 3. Rate Limiting Testing

### 3.1 Test Form Submission Rate Limiting

**Objective:** Verify form submissions are rate limited.

**Steps:**

1. **Login as authenticated user**

2. **Submit form multiple times rapidly:**
   ```bash
   # Use script or Postman collection
   for i in {1..25}; do
     POST /api/forms/convert-pdf/{id}/test-submit
   done
   ```

3. **Expected Result:**
   - ✅ First 20 requests succeed (200 OK)
   - ✅ Request 21+ returns 429 Too Many Requests
   - ✅ Rate limit headers present:
     ```
     X-RateLimit-Limit: 20
     X-RateLimit-Remaining: 0
     X-RateLimit-Reset: <timestamp>
     ```

4. **Wait for reset period (1 minute)**

5. **Try again:**
   - Should succeed after reset

**Limit:** 20 requests/minute per user

---

### 3.2 Test Email Route Rate Limiting

**Objective:** Verify email routes are rate limited.

**Steps:**

1. **Test Invitation Endpoint:**
   ```bash
   # Send 11 invitations rapidly
   for i in {1..11}; do
     POST /api/invitations
   done
   ```

2. **Expected Result:**
   - ✅ First 10 succeed
   - ✅ Request 11 returns 429

3. **Test Bulk Upload:**
   ```bash
   # Try 4 bulk uploads rapidly
   for i in {1..4}; do
     POST /api/invitations/bulk
   done
   ```

4. **Expected Result:**
   - ✅ First 3 succeed
   - ✅ Request 4 returns 429

**Limits:**
- Invitations: 10/hour
- Bulk uploads: 3/hour

---

### 3.3 Test Search Rate Limiting

**Objective:** Verify search routes are rate limited.

**Steps:**

1. **Perform rapid searches:**
   ```bash
   # Basic search
   for i in {1..65}; do
     GET /api/documents/search?q=test
   done
   
   # Advanced search
   for i in {1..35}; do
     POST /api/documents/search/advanced
   done
   ```

2. **Expected Result:**
   - ✅ Basic search: 60/minute limit
   - ✅ Advanced search: 30/minute limit
   - ✅ Returns 429 after limit

---

## 4. File Upload Security Testing

### 4.1 Test File Size Limits

**Objective:** Verify file size limits are enforced.

**Steps:**

1. **Try uploading large file (>50MB):**
   ```bash
   POST /api/pdf-converter/upload
   Content-Type: multipart/form-data
   file: <large-file.pdf>
   ```

2. **Expected Result:**
   - ✅ Returns 400 Bad Request
   - ✅ Error message: "File size must be less than 50MB"

---

### 4.2 Test File Type Validation

**Objective:** Verify only allowed file types are accepted.

**Steps:**

1. **Try uploading non-PDF file:**
   ```bash
   POST /api/pdf-converter/upload
   file: malicious.exe
   ```

2. **Expected Result:**
   - ✅ Returns 400 Bad Request
   - ✅ Error message: "File must be a PDF"

---

### 4.3 Test Filename Sanitization

**Objective:** Verify malicious filenames are sanitized.

**Steps:**

1. **Try uploading file with malicious name:**
   ```bash
   file: "../../../etc/passwd.pdf"
   file: "<script>alert('xss')</script>.pdf"
   ```

2. **Expected Result:**
   - ✅ Filename sanitized
   - ✅ No path traversal possible
   - ✅ No XSS in filename

---

## 5. Offline Mode Testing

### 5.1 Test Offline Form Submission

**Objective:** Verify forms work offline and sync when online.

**Steps:**

1. **Open app in browser**

2. **Enable offline mode:**
   ```javascript
   // DevTools → Application → Service Workers → Offline
   ```

3. **Submit a form**

4. **Expected Result:**
   - ✅ Form saved to IndexedDB
   - ✅ Success message shown
   - ✅ Form appears in "Pending Sync" list

5. **Re-enable online mode**

6. **Expected Result:**
   - ✅ Form automatically syncs
   - ✅ Appears in server database
   - ✅ Success notification shown

---

### 5.2 Test Offline Data Access

**Objective:** Verify cached data is accessible offline.

**Steps:**

1. **Load forms/documents while online**

2. **Enable offline mode**

3. **Try to view cached forms/documents**

4. **Expected Result:**
   - ✅ Cached data accessible
   - ✅ UI shows "Offline" indicator
   - ✅ No errors in console

---

## 6. User Role Testing

### 6.1 Test Admin Role

**Objective:** Verify admin has full access.

**Steps:**

1. **Login as Admin**

2. **Test admin routes:**
   - ✅ `/admin` accessible
   - ✅ `/api/admin/*` accessible
   - ✅ Can create invitations
   - ✅ Can manage users
   - ✅ Can view all company data

3. **Expected Result:**
   - ✅ All admin features work
   - ✅ No 403 errors

---

### 6.2 Test Supervisor Role

**Objective:** Verify supervisor has view-only admin access.

**Steps:**

1. **Login as Supervisor**

2. **Test access:**
   - ✅ Can view admin dashboard
   - ✅ Cannot create invitations
   - ✅ Cannot edit admin settings
   - ✅ Can view company data

3. **Expected Result:**
   - ✅ View access works
   - ✅ Edit access blocked (403)

---

### 6.3 Test Worker Role

**Objective:** Verify worker has limited access.

**Steps:**

1. **Login as Worker**

2. **Test access:**
   - ✅ Cannot access `/admin`
   - ✅ Cannot access `/api/admin/*`
   - ✅ Can submit forms
   - ✅ Can view own data
   - ✅ Cannot view other users' data

3. **Expected Result:**
   - ✅ Worker routes accessible
   - ✅ Admin routes blocked (403)

---

## 7. API Security Testing

### 7.1 Test Authentication Required

**Objective:** Verify protected routes require authentication.

**Steps:**

1. **Make request without auth token:**
   ```bash
   GET /api/documents
   # No Authorization header
   ```

2. **Expected Result:**
   - ✅ Returns 401 Unauthorized
   - ✅ Error message: "Unauthorized"

---

### 7.2 Test Authorization Checks

**Objective:** Verify role-based authorization works.

**Steps:**

1. **Login as Worker**

2. **Try to access admin endpoint:**
   ```bash
   POST /api/invitations
   ```

3. **Expected Result:**
   - ✅ Returns 403 Forbidden
   - ✅ Error message: "Insufficient permissions"

---

### 7.3 Test Input Validation

**Objective:** Verify input validation prevents malicious data.

**Steps:**

1. **Try SQL injection:**
   ```bash
   GET /api/documents/search?q=' OR '1'='1
   ```

2. **Try XSS:**
   ```bash
   POST /api/documents
   { "title": "<script>alert('xss')</script>" }
   ```

3. **Expected Result:**
   - ✅ SQL injection sanitized/blocked
   - ✅ XSS sanitized/escaped
   - ✅ No errors in database

---

## 8. Error Handling Testing

### 7.1 Test Error Messages Don't Leak Info

**Objective:** Verify errors don't expose sensitive information.

**Steps:**

1. **Trigger various errors:**
   - Invalid auth token
   - Database error
   - File upload error

2. **Check error responses:**
   ```json
   {
     "error": "An error occurred"
     // Should NOT include:
     // - Database connection strings
     // - Stack traces (in production)
     // - Internal file paths
   }
   ```

3. **Expected Result:**
   - ✅ Generic error messages
   - ✅ No sensitive data exposed
   - ✅ Detailed errors only in development

---

## 9. Build and Production Testing

### 9.1 Test Production Build

**Objective:** Verify app builds and runs correctly.

**Steps:**

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Expected Result:**
   - ✅ Build succeeds
   - ✅ No TypeScript errors
   - ✅ No build warnings

3. **Start production server:**
   ```bash
   npm run start
   ```

4. **Test key features:**
   - ✅ Pages load correctly
   - ✅ API routes work
   - ✅ Authentication works
   - ✅ Forms submit correctly

---

### 9.2 Test Environment Variables

**Objective:** Verify all required env vars are set.

**Steps:**

1. **Check production environment:**
   ```bash
   # Verify these are set:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - SENTRY_DSN (if using Sentry)
   ```

2. **Expected Result:**
   - ✅ All required vars set
   - ✅ No undefined errors
   - ✅ App functions correctly

---

## 10. Security Headers Testing

### 10.1 Verify Security Headers

**Objective:** Verify all security headers are present.

**Steps:**

1. **Check response headers:**
   ```bash
   curl -I https://your-domain.com
   ```

2. **Expected Headers:**
   ```
   Content-Security-Policy: ...
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: ...
   ```

3. **Expected Result:**
   - ✅ All headers present
   - ✅ Values correct

---

## Testing Checklist

### Critical Tests

- [ ] Company isolation works (Company A cannot see Company B data)
- [ ] Role-based access works (Workers cannot access admin routes)
- [ ] User isolation works (Users cannot see other users' data)
- [ ] CSP header present and doesn't break functionality
- [ ] Rate limiting works (forms, emails, search)
- [ ] File upload limits enforced
- [ ] Authentication required for protected routes
- [ ] Authorization checks work (403 for insufficient permissions)

### High Priority Tests

- [ ] Offline mode works correctly
- [ ] All user roles tested (admin, supervisor, worker)
- [ ] Error messages don't leak sensitive info
- [ ] Production build succeeds
- [ ] All environment variables set
- [ ] Security headers present

### Medium Priority Tests

- [ ] Input validation prevents SQL injection
- [ ] Input validation prevents XSS
- [ ] Filename sanitization works
- [ ] File type validation works
- [ ] Service worker cache security

---

## Reporting Issues

**When reporting security issues:**

1. **Document:**
   - Which test failed
   - Expected vs actual result
   - Steps to reproduce
   - Screenshots/logs

2. **Priority:**
   - Critical: Blocks launch
   - High: Fix before launch
   - Medium: Fix within 2 weeks

3. **Create Issue:**
   - Use security label
   - Include test details
   - Reference this guide

---

## Related Documentation

- **RLS Testing:** `scripts/test-rls-policies.sql`
- **RLS Audit:** `SUPABASE_MANUAL_REVIEW_GUIDE.md`
- **CSP Implementation:** `CSP_IMPLEMENTATION.md`
- **Rate Limiting:** `RATE_LIMITING_ADDITIONAL_ROUTES.md`
- **Pre-Launch Checklist:** `SECURITY_PRE_LAUNCH_CHECKLIST.md`

---

*Last Updated: January 20, 2026*
