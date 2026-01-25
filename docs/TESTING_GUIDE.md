# Testing Guide: Registration & Onboarding Flow

## Prerequisites

1. **Database Migration**
   - Run: `supabase/migrations/027_add_company_industry.sql`
   - Verify columns added to `companies` and `registration_tokens` tables

2. **Environment Variables**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set
   - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (for API routes)

## Test Scenario: Jennifer Martinez Registration

### Test Data
```
Company Name: Maple Ridge Concrete Ltd.
WSIB Number: 123456789
Company Email: info@mapleridgeconcrete.ca
Address: 2500 Industrial Parkway
City: Ottawa
Province: ON
Postal Code: K1G 4K9
Phone: (613) 555-7800

Registrant Name: Jennifer Martinez
Registrant Position: Director
Registrant Email: jennifer@mapleridgeconcrete.ca

Industry: Concrete Construction
Employee Count: 32
Years in Business: 5
Main Services: Foundations, Flatwork, Structural Concrete, Decorative Finishes
```

## Test Steps

### 1. Test Registration Form

**URL:** `http://localhost:3000/register`

**Test Cases:**
- [ ] Form loads correctly
- [ ] All required fields are marked with asterisk
- [ ] WSIB number accepts exactly 9 digits
- [ ] Email domain validation works (blocks Gmail, etc.)
- [ ] Registrant email must match company email domain
- [ ] Postal code auto-formats to A1A 1A1
- [ ] Phone number auto-formats to (123) 456-7890
- [ ] "Add Industry Info" button expands/collapses industry section
- [ ] Industry dropdown shows all 19 options
- [ ] Main services tag system works (add/remove)
- [ ] Form validation shows errors for missing required fields
- [ ] Submit button disabled during submission

**Expected Result:**
- Success message: "Registration submitted. Check your email for verification link."
- Email sent to registrant email address

### 2. Test Email Verification

**Check Email:**
- [ ] Email received at `jennifer@mapleridgeconcrete.ca`
- [ ] Email contains verification link
- [ ] Link expires in 24 hours

**Click Verification Link:**
- [ ] Redirects to `/welcome`
- [ ] Company created in database
- [ ] User profile created with admin role
- [ ] Worker record created for admin
- [ ] Industry data saved (if provided)

### 3. Test Welcome Page

**URL:** `http://localhost:3000/welcome`

**Test Cases:**
- [ ] Welcome message displays: "Welcome to COR Pathways, Maple Ridge Concrete Ltd.!"
- [ ] Company information card shows correct data
- [ ] If industry info missing, shows "Complete Your Company Profile" alert
- [ ] "View COR Elements" button works
- [ ] All 14 COR elements display correctly
- [ ] Element descriptions are visible
- [ ] "Show All 14 Elements" button works
- [ ] Links to `/phases` and `/dashboard` work

**Expected Elements:**
1. Health & Safety Policy (5%)
2. Hazard Assessment (10%)
3. Safe Work Practices (10%)
4. Safe Job Procedures (10%)
5. Company Safety Rules (5%)
6. Personal Protective Equipment (5%)
7. Preventative Maintenance (5%)
8. Training & Communication (10%)
9. Workplace Inspections (10%)
10. Incident Investigation (10%)
11. Emergency Preparedness (5%)
12. Statistics & Records (5%)
13. Legislation & Compliance (5%)
14. Management Review (5%)

### 4. Test Company Profile Completion

**URL:** `http://localhost:3000/admin/profile`

**Prerequisites:**
- Must be logged in as admin
- Company must exist

**Test Cases:**
- [ ] Page loads with existing company data
- [ ] Industry dropdown pre-populated (if set)
- [ ] Employee count pre-populated (if set)
- [ ] Years in business pre-populated (if set)
- [ ] Main services tags display correctly
- [ ] Can add new main services
- [ ] Can remove main services
- [ ] Form validation works
- [ ] Save button updates company in database
- [ ] Success message displays
- [ ] Error handling works (network errors, etc.)

**Test Update:**
1. Select industry: "Concrete Construction"
2. Enter employee count: 32
3. Enter years in business: 5
4. Add services: Foundations, Flatwork, Structural Concrete, Decorative Finishes
5. Click "Save Changes"
6. Verify data saved in database

### 5. Test Dashboard Integration

**URL:** `http://localhost:3000/dashboard`

**Test Cases:**
- [ ] COR Certification Phases widget displays
- [ ] Shows 0% progress initially
- [ ] Shows 0/12 phases completed
- [ ] "View Phases" link works
- [ ] COR Audit Dashboard card displays
- [ ] Admin area accessible

### 6. Test Phases Page

**URL:** `http://localhost:3000/phases`

**Test Cases:**
- [ ] All 12 phases display
- [ ] Overall progress shows 0%
- [ ] Each phase shows "not_started" status
- [ ] Phase cards are clickable
- [ ] Links to individual phase pages work

### 7. Test API Endpoints

#### POST `/api/register`
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "wsib_number": "987654321",
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
    "years_in_business": 3,
    "main_services": ["Foundations", "Flatwork"]
  }'
```

**Expected:** Success response with email address

#### PATCH `/api/admin/company/profile`
```bash
curl -X PATCH http://localhost:3000/api/admin/company/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "industry": "concrete_construction",
    "employee_count": 32,
    "years_in_business": 5,
    "main_services": ["Foundations", "Flatwork", "Structural Concrete"]
  }'
```

**Expected:** Success response

### 8. Database Verification

**Check Companies Table:**
```sql
SELECT 
  name,
  industry,
  employee_count,
  years_in_business,
  main_services
FROM companies
WHERE name = 'Maple Ridge Concrete Ltd.';
```

**Expected:**
- Industry: `concrete_construction`
- Employee count: `32`
- Years in business: `5`
- Main services: `{Foundations,Flatwork,Structural Concrete,Decorative Finishes}`

**Check User Profile:**
```sql
SELECT 
  up.role,
  up.first_admin,
  up.position,
  up.display_name,
  c.name as company_name
FROM user_profiles up
JOIN companies c ON c.id = up.company_id
WHERE up.display_name = 'Jennifer Martinez';
```

**Expected:**
- Role: `admin`
- First admin: `true`
- Position: `Director`
- Company name: `Maple Ridge Concrete Ltd.`

## Common Issues & Solutions

### Issue: Industry fields not saving
**Solution:** 
- Verify migration ran successfully
- Check `registration_tokens` table has new columns
- Verify API route includes industry fields in insert

### Issue: Welcome page not showing company data
**Solution:**
- Check user is authenticated
- Verify company_id exists in user_profiles
- Check database query in welcome page

### Issue: Profile completion page not accessible
**Solution:**
- Verify user has admin role
- Check RLS policies allow access
- Verify route exists at `/admin/profile`

### Issue: Email not sending
**Solution:**
- Check Supabase email settings
- Verify email templates configured
- Check email service limits

## Automated Testing Script

Create a test script to verify all endpoints:

```typescript
// test-registration-flow.ts
// Run with: npx tsx test-registration-flow.ts

const BASE_URL = 'http://localhost:3000';

async function testRegistration() {
  // Test registration endpoint
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: 'Test Company',
      wsib_number: '999888777',
      company_email: 'info@testcompany.ca',
      address: '123 Test St',
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M5V3A1',
      phone: '4165551234',
      registrant_name: 'Test User',
      registrant_position: 'director',
      registrant_email: 'test@testcompany.ca',
      industry: 'concrete_construction',
      employee_count: 10,
      years_in_business: 3,
      main_services: ['Foundations', 'Flatwork']
    })
  });

  const result = await response.json();
  console.log('Registration test:', result);
}

testRegistration();
```

## Success Criteria

✅ All test cases pass
✅ No console errors
✅ Database migrations successful
✅ Email verification works
✅ Welcome page displays correctly
✅ Profile completion works
✅ Dashboard integration works
✅ Phases page loads correctly

## Next Steps After Testing

1. Fix any issues found
2. Deploy to staging environment
3. Perform user acceptance testing
4. Deploy to production
5. Monitor for errors
