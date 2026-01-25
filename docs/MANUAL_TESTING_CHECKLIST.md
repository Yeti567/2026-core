# Manual Testing Checklist
## Complete System Verification for Jennifer Martinez Registration

### Prerequisites
- [ ] Database migration `027_add_company_industry.sql` has been run
- [ ] Development server can start (`npm run dev`)
- [ ] Supabase is configured and accessible
- [ ] Email service is configured (for verification emails)

---

## Test 1: Registration Form Validation ✅

### 1.1 Valid Registration
**URL:** `http://localhost:3000/register`

**Steps:**
1. Navigate to registration page
2. Fill out form with Jennifer's data:
   ```
   Company Name: Maple Ridge Concrete Ltd.
   WSIB Number: 123456789
   Company Email: info@mapleridgeconcrete.ca
   Address: 2500 Industrial Parkway
   City: Ottawa
   Province: Ontario
   Postal Code: K1G 4K9
   Phone: (613) 555-7800
   Your Name: Jennifer Martinez
   Your Position: Director
   Your Email: jennifer@mapleridgeconcrete.ca
   ```
3. Click "Add Industry Info"
4. Fill industry fields:
   ```
   Industry: Concrete Construction
   Employees: 32
   Years: 5
   Services: Foundations, Flatwork, Structural Concrete, Decorative Finishes
   ```
5. Click "Submit Registration"

**Expected Results:**
- [ ] Form submits successfully
- [ ] Success message: "Registration submitted. Check your email for verification link."
- [ ] No validation errors
- [ ] Industry data included in submission

**Check Console:**
- [ ] No JavaScript errors
- [ ] API call to `/api/register` succeeds
- [ ] Response includes `success: true`

**Check Database:**
```sql
SELECT * FROM registration_tokens 
WHERE registrant_email = 'jennifer@mapleridgeconcrete.ca' 
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Token record exists
- [ ] Industry data saved: `concrete_construction`
- [ ] Employee count: `32`
- [ ] Years in business: `5`
- [ ] Main services: `{Foundations,Flatwork,Structural Concrete,Decorative Finishes}`

---

### 1.2 Invalid Data Validation

**Test Invalid WSIB (too short):**
- [ ] Enter WSIB: `123`
- [ ] Submit form
- [ ] Should show error: "WSIB number must be exactly 9 digits"

**Test Invalid Email Domain:**
- [ ] Enter company email: `info@gmail.com`
- [ ] Submit form
- [ ] Should show error: "Business email required (no Gmail, Yahoo, etc.)"

**Test Domain Mismatch:**
- [ ] Company email: `info@mapleridgeconcrete.ca`
- [ ] Registrant email: `jennifer@gmail.com`
- [ ] Submit form
- [ ] Should show error: "Email must be from @mapleridgeconcrete.ca"

**Test Missing Required Fields:**
- [ ] Leave company name empty
- [ ] Submit form
- [ ] Should show error for missing field

---

## Test 2: Email Verification ✅

**Steps:**
1. Check email inbox for `jennifer@mapleridgeconcrete.ca`
2. Look for email from COR Pathways
3. Click verification link

**Expected Results:**
- [ ] Email received within 1-2 minutes
- [ ] Email contains verification link
- [ ] Link format: `http://localhost:3000/auth/register-callback?token=xxx&code=yyy`
- [ ] Clicking link redirects to `/welcome`

**Check Database After Clicking Link:**
```sql
-- Check company created
SELECT * FROM companies WHERE name = 'Maple Ridge Concrete Ltd.';
```
- [ ] Company exists
- [ ] Industry: `concrete_construction`
- [ ] Employee count: `32`
- [ ] Years in business: `5`
- [ ] Main services saved correctly

```sql
-- Check user profile
SELECT * FROM user_profiles WHERE display_name = 'Jennifer Martinez';
```
- [ ] Profile exists
- [ ] Role: `admin`
- [ ] First admin: `TRUE`
- [ ] Position: `Director`

```sql
-- Check worker record
SELECT * FROM workers WHERE email = 'jennifer@mapleridgeconcrete.ca';
```
- [ ] Worker record exists
- [ ] First name: `Jennifer`
- [ ] Last name: `Martinez`
- [ ] Position: `Director`

```sql
-- Check token marked as used
SELECT status FROM registration_tokens 
WHERE registrant_email = 'jennifer@mapleridgeconcrete.ca' 
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Status: `used`

---

## Test 3: Welcome Page ✅

**URL:** `http://localhost:3000/welcome`

**Expected Results:**
- [ ] Page loads without errors
- [ ] Shows: "Welcome to COR Pathways, Maple Ridge Concrete Ltd.!"
- [ ] Company information card displays:
  - [ ] Company name
  - [ ] Industry: Concrete Construction
  - [ ] Employees: 32
  - [ ] Years: 5
  - [ ] Services listed

**Check "View COR Elements" Button:**
- [ ] Button is clickable
- [ ] Clicking shows all 14 elements
- [ ] Each element shows:
  - [ ] Element number
  - [ ] Element name
  - [ ] Weight percentage
  - [ ] Description

**Verify 14 Elements:**
- [ ] Element 1: Health & Safety Policy (5%)
- [ ] Element 2: Hazard Assessment (10%)
- [ ] Element 3: Safe Work Practices (10%)
- [ ] Element 4: Safe Job Procedures (10%)
- [ ] Element 5: Company Safety Rules (5%)
- [ ] Element 6: Personal Protective Equipment (5%)
- [ ] Element 7: Preventative Maintenance (5%)
- [ ] Element 8: Training & Communication (10%)
- [ ] Element 9: Workplace Inspections (10%)
- [ ] Element 10: Incident Investigation (10%)
- [ ] Element 11: Emergency Preparedness (5%)
- [ ] Element 12: Statistics & Records (5%)
- [ ] Element 13: Legislation & Compliance (5%)
- [ ] Element 14: Management Review (5%)

**Check Console:**
- [ ] No JavaScript errors
- [ ] No API errors
- [ ] All elements render correctly

---

## Test 4: Dashboard ✅

**URL:** `http://localhost:3000/dashboard`

**Expected Results:**
- [ ] Page loads without errors
- [ ] Shows dashboard header
- [ ] COR Certification Phases widget displays:
  - [ ] Overall Progress: `0%`
  - [ ] Progress bar shows 0%
  - [ ] "Phases Completed: 0/12"
  - [ ] "In Progress: 0"
  - [ ] "View Phases" button works

**Check Phases Widget:**
- [ ] Widget is visible
- [ ] Progress percentage is 0%
- [ ] Clicking "View Phases" navigates to `/phases`

**Check Other Widgets:**
- [ ] COR Audit Dashboard card visible
- [ ] Admin area accessible (if admin role)
- [ ] No console errors

**Check API Call:**
```javascript
// In browser console
fetch('/api/phases').then(r => r.json()).then(console.log)
```
- [ ] Returns phases data
- [ ] Overall progress: `0`
- [ ] All 12 phases returned

---

## Test 5: Phases Page ✅

**URL:** `http://localhost:3000/phases`

**Expected Results:**
- [ ] Page loads without errors
- [ ] Shows header: "COR Certification Phases"
- [ ] Overall progress card shows:
  - [ ] Progress: `0%`
  - [ ] Progress bar at 0%
  - [ ] "Phases Completed: 0/12"
  - [ ] "In Progress: 0"

**Check Phase Cards:**
- [ ] All 12 phases displayed
- [ ] Each phase shows:
  - [ ] Phase number
  - [ ] Phase title
  - [ ] Status: `not_started`
  - [ ] Progress: `0%`
  - [ ] Estimated duration
- [ ] Phase cards are clickable
- [ ] Clicking navigates to phase detail page

**Verify All 12 Phases:**
- [ ] Phase 1: Company Onboarding
- [ ] Phase 2: Team Setup & Roles
- [ ] Phase 3: Safety Program Setup
- [ ] Phase 4: Daily Operations
- [ ] Phase 5: Document Management
- [ ] Phase 6: Worker Certifications
- [ ] Phase 7: Equipment & Maintenance
- [ ] Phase 8: Forms & Inspections
- [ ] Phase 9: Incident Management
- [ ] Phase 10: Audit Preparation
- [ ] Phase 11: Mock Audit
- [ ] Phase 12: Certification & Reporting

---

## Test 6: Phase Detail Page ✅

**URL:** `http://localhost:3000/phases/[phase1-id]`

**Expected Results:**
- [ ] Page loads without errors
- [ ] Shows phase header: "Phase 1: Company Onboarding"
- [ ] Shows progress: `67%` (2/3 prompts completed)
- [ ] Shows all prompts for Phase 1:
  - [ ] Prompt 1: Company Registration (Completed ✓)
  - [ ] Prompt 2: Admin Account Setup (Completed ✓)
  - [ ] Prompt 3: Company Profile Completion (In Progress ○)

**Check Prompt Actions:**
- [ ] Can mark prompts as complete
- [ ] Status updates correctly
- [ ] Progress percentage updates

**Check Phase Completion:**
- [ ] "Mark Phase as Completed" button appears when all prompts done
- [ ] Button works correctly

---

## Test 7: Company Profile Page ✅

**URL:** `http://localhost:3000/admin/profile`

**Expected Results:**
- [ ] Page loads (requires admin role)
- [ ] Form displays with existing data:
  - [ ] Industry: Concrete Construction (pre-filled)
  - [ ] Employees: 32 (pre-filled)
  - [ ] Years: 5 (pre-filled)
  - [ ] Services: All 4 services listed as tags

**Test Profile Update:**
- [ ] Change industry to different value
- [ ] Update employee count
- [ ] Add/remove services
- [ ] Click "Save Changes"
- [ ] Success message appears
- [ ] Data saves to database

**Verify Database Update:**
```sql
SELECT industry, employee_count, years_in_business, main_services
FROM companies 
WHERE name = 'Maple Ridge Concrete Ltd.';
```
- [ ] Updated values match form

---

## Test 8: Compliance Score ✅

**URL:** `http://localhost:3000/audit`

**Expected Results:**
- [ ] Audit dashboard loads
- [ ] Compliance scorecard shows:
  - [ ] Overall Score: `0%` (or very low)
  - [ ] Status: `failing` or `at-risk`
  - [ ] All 14 elements listed
  - [ ] Each element shows 0% or low percentage

**Check Element Scores:**
- [ ] All elements show 0% or minimal progress
- [ ] No elements show as "passing" (80%+)
- [ ] Gap analysis shows all elements need work

**Verify Initial State:**
```javascript
// In browser console
fetch('/api/audit/compliance').then(r => r.json()).then(console.log)
```
- [ ] Returns compliance data
- [ ] Overall percentage: `0` or very low
- [ ] All elements have low scores

---

## Test 9: API Endpoints ✅

### 9.1 Registration API
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "wsib_number": "999888777",
    "company_email": "info@testcompany.ca",
    "address": "123 Test St",
    "city": "Toronto",
    "province": "ON",
    "postal_code": "M5V3A1",
    "phone": "4165551234",
    "registrant_name": "Test User",
    "registrant_position": "director",
    "registrant_email": "test@testcompany.ca",
    "industry": "concrete_construction",
    "employee_count": 10,
    "years_in_business": 3
  }'
```
- [ ] Returns success response
- [ ] Email field in response

### 9.2 Phases API
```bash
# Requires authentication
curl http://localhost:3000/api/phases \
  -H "Authorization: Bearer <token>"
```
- [ ] Returns 401 if not authenticated
- [ ] Returns phases data if authenticated

### 9.3 Company Profile API
```bash
# Requires authentication + admin role
curl -X PATCH http://localhost:3000/api/admin/company/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"industry": "concrete_construction", "employee_count": 32}'
```
- [ ] Returns 401/403 if not authenticated/admin
- [ ] Updates company if authenticated

---

## Test 10: Error Handling ✅

**Test Network Errors:**
- [ ] Disconnect network
- [ ] Try to submit registration
- [ ] Should show appropriate error message

**Test Invalid Routes:**
- [ ] Navigate to `/phases/invalid-id`
- [ ] Should show 404 or error page

**Test Unauthorized Access:**
- [ ] Log out
- [ ] Try to access `/admin/profile`
- [ ] Should redirect to login

---

## Final Verification ✅

### Database State
```sql
-- Complete company check
SELECT 
  c.name,
  c.industry,
  c.employee_count,
  c.years_in_business,
  c.main_services,
  up.display_name,
  up.role,
  up.first_admin
FROM companies c
JOIN user_profiles up ON up.company_id = c.id
WHERE c.name = 'Maple Ridge Concrete Ltd.';
```

**Expected:**
- [ ] Company: Maple Ridge Concrete Ltd.
- [ ] Industry: concrete_construction
- [ ] Employee count: 32
- [ ] Years: 5
- [ ] Services: All 4 services
- [ ] User: Jennifer Martinez
- [ ] Role: admin
- [ ] First admin: TRUE

### System State
- [ ] All pages load without errors
- [ ] All API endpoints respond correctly
- [ ] Database contains correct data
- [ ] No console errors
- [ ] No broken links
- [ ] All features functional

---

## Test Results Summary

**Registration:** ✅ / ❌
**Email Verification:** ✅ / ❌
**Company Creation:** ✅ / ❌
**Welcome Page:** ✅ / ❌
**Dashboard:** ✅ / ❌
**Phases Page:** ✅ / ❌
**14 COR Elements:** ✅ / ❌
**Compliance Score:** ✅ / ❌
**Profile Page:** ✅ / ❌
**API Endpoints:** ✅ / ❌

**Overall Status:** ✅ PASS / ❌ FAIL

---

## Notes

Document any issues found:
- 
- 
- 
