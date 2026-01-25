# Simulated Registration Flow: Jennifer Martinez

## Step-by-Step Process

### Step 1: Registration Form Submission

**URL:** `POST /api/register`

**Request Data:**
```json
{
  "company_name": "Maple Ridge Concrete Ltd.",
  "wsib_number": "123456789",
  "company_email": "info@mapleridgeconcrete.ca",
  "address": "2500 Industrial Parkway",
  "city": "Ottawa",
  "province": "ON",
  "postal_code": "K1G 4K9",
  "phone": "6135557800",
  "registrant_name": "Jennifer Martinez",
  "registrant_position": "director",
  "registrant_email": "jennifer@mapleridgeconcrete.ca",
  "industry": "concrete_construction",
  "employee_count": 32,
  "years_in_business": 5,
  "main_services": [
    "Foundations",
    "Flatwork",
    "Structural Concrete",
    "Decorative Finishes"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration submitted. Check your email for verification link.",
  "email": "jennifer@mapleridgeconcrete.ca"
}
```

**What Happens:**
1. ✅ Form data validated
2. ✅ Rate limit checked
3. ✅ WSIB number uniqueness verified
4. ✅ Registration token created and stored
5. ✅ Magic link email sent to jennifer@mapleridgeconcrete.ca

---

### Step 2: Email Verification

**Email Received:**
```
Subject: Verify your COR Pathways account

Hi Jennifer Martinez,

Click the link below to verify your email and activate your account:

[Verify Email] → https://yourapp.com/auth/register-callback?token=xxx&code=yyy

This link expires in 24 hours.

If you didn't request this, please ignore this email.
```

**What Happens When Link Clicked:**
1. ✅ Supabase auth verifies the code
2. ✅ User session created
3. ✅ `use_registration_token` function called
4. ✅ Company created in database:
   ```sql
   INSERT INTO companies (
     name, wsib_number, company_email, address, city, 
     province, postal_code, phone, registration_status,
     industry, employee_count, years_in_business, main_services
   ) VALUES (
     'Maple Ridge Concrete Ltd.',
     '123456789',
     'info@mapleridgeconcrete.ca',
     '2500 Industrial Parkway',
     'Ottawa',
     'ON',
     'K1G 4K9',
     '6135557800',
     'active',
     'concrete_construction',
     32,
     5,
     ARRAY['Foundations', 'Flatwork', 'Structural Concrete', 'Decorative Finishes']
   );
   ```
5. ✅ User profile created:
   ```sql
   INSERT INTO user_profiles (
     user_id, company_id, role, first_admin, 
     position, display_name
   ) VALUES (
     <user_id>,
     <company_id>,
     'admin',
     TRUE,
     'Director',
     'Jennifer Martinez'
   );
   ```
6. ✅ Worker record created for admin
7. ✅ Redirect to `/welcome?new=true&company=Maple%20Ridge%20Concrete%20Ltd.`

---

### Step 3: Welcome Page Experience

**URL:** `/welcome`

**What Jennifer Sees:**

```
┌─────────────────────────────────────────────────────────┐
│  ✓  Welcome to COR Pathways, Maple Ridge Concrete Ltd.! │
│                                                         │
│  Your journey to COR 2020 certification starts here.   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Company Registration Complete                         │
│  ────────────────────────────────────────────────────  │
│  Company Name:     Maple Ridge Concrete Ltd.          │
│  Industry:         Concrete Construction               │
│  Employees:        32                                   │
│  Years in Business: 5                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  What's Next?                                           │
│  ────────────────────────────────────────────────────  │
│  1. Understand the 14 COR Elements                      │
│  2. Set Up Your Team                                    │
│  3. Start Your 12-Phase Journey                         │
│  4. Build Your Evidence                                 │
└─────────────────────────────────────────────────────────┘

[View COR Elements →]  [Go to Dashboard]
```

**When "View COR Elements" Clicked:**

```
┌─────────────────────────────────────────────────────────┐
│  The 14 COR Elements                                    │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  1. Health & Safety Policy (5%)                        │
│  2. Hazard Assessment (10%)                            │
│  3. Safe Work Practices (10%)                           │
│  4. Safe Job Procedures (10%)                           │
│  5. Company Safety Rules (5%)                           │
│  6. Personal Protective Equipment (5%)                  │
│  7. Preventative Maintenance (5%)                       │
│  8. Training & Communication (10%)                     │
│  9. Workplace Inspections (10%)                        │
│  10. Incident Investigation (10%)                      │
│  11. Emergency Preparedness (5%)                        │
│  12. Statistics & Records (5%)                          │
│  13. Legislation & Compliance (5%)                      │
│  14. Management Review (5%)                             │
│                                                         │
│  Passing Score: 80% overall compliance required        │
└─────────────────────────────────────────────────────────┘

[Start Your 12-Phase Journey →]  [Go to Dashboard]
```

---

### Step 4: Dashboard View

**URL:** `/dashboard`

**What Jennifer Sees:**

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                                              │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ COR Certification Phases                        │  │
│  │ ─────────────────────────────────────────────── │  │
│  │ Overall Progress: 0%                           │  │
│  │ Completed: 0/12                                │  │
│  │                                                 │  │
│  │ [View Phases →]                                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ COR Audit Dashboard                            │  │
│  │ ─────────────────────────────────────────────── │  │
│  │ Track compliance, identify gaps, prepare for   │  │
│  │ certification audit                            │  │
│  │                                                 │  │
│  │ [Open Dashboard →]                             │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

### Step 5: Phases Overview

**URL:** `/phases`

**What Jennifer Sees:**

```
┌─────────────────────────────────────────────────────────┐
│  COR Certification Phases                              │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Overall Progress: 0%                                   │
│  Phases Completed: 0/12                                 │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Phase 1      │  │ Phase 2      │  │ Phase 3      │ │
│  │ Company      │  │ Team Setup   │  │ Safety       │ │
│  │ Onboarding   │  │ & Roles      │  │ Program      │ │
│  │              │  │              │  │ Setup        │ │
│  │ ○ not_started│  │ ○ not_started│  │ ○ not_started│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ... (9 more phases)                                    │
└─────────────────────────────────────────────────────────┘
```

---

### Step 6: Phase 1 Detail

**URL:** `/phases/[phase1-id]`

**What Jennifer Sees:**

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Company Onboarding                           │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Progress: 67% (2/3 prompts completed)                 │
│                                                         │
│  Prompts:                                              │
│  ────────────────────────────────────────────────────  │
│  ✓ Prompt 1: Company Registration                      │
│    Status: Completed                                    │
│                                                         │
│  ✓ Prompt 2: Admin Account Setup                       │
│    Status: Completed                                    │
│                                                         │
│  ○ Prompt 3: Company Profile Completion                │
│    Status: In Progress                                  │
│    [Mark Complete]                                     │
│                                                         │
│  [Mark Phase as Completed]                              │
└─────────────────────────────────────────────────────────┘
```

---

### Step 7: Complete Profile (if needed)

**URL:** `/admin/profile`

**If industry info was provided during registration:**
- Form pre-populated with data
- Can update if needed

**If industry info was NOT provided:**
- Form shows empty fields
- Fill in:
  - Industry: Concrete Construction
  - Employees: 32
  - Years: 5
  - Services: Foundations, Flatwork, Structural Concrete, Decorative Finishes
- Click "Save Changes"
- Success message displayed

---

## Database State After Registration

### Companies Table
```sql
SELECT * FROM companies WHERE name = 'Maple Ridge Concrete Ltd.';

id: <uuid>
name: Maple Ridge Concrete Ltd.
wsib_number: 123456789
company_email: info@mapleridgeconcrete.ca
address: 2500 Industrial Parkway
city: Ottawa
province: ON
postal_code: K1G 4K9
phone: 6135557800
industry: concrete_construction
employee_count: 32
years_in_business: 5
main_services: {Foundations,Flatwork,Structural Concrete,Decorative Finishes}
registration_status: active
created_at: <timestamp>
```

### User Profiles Table
```sql
SELECT * FROM user_profiles WHERE display_name = 'Jennifer Martinez';

id: <uuid>
user_id: <auth_user_id>
company_id: <company_uuid>
role: admin
first_admin: TRUE
position: Director
display_name: Jennifer Martinez
created_at: <timestamp>
```

### Workers Table
```sql
SELECT * FROM workers WHERE email = 'jennifer@mapleridgeconcrete.ca';

id: <uuid>
company_id: <company_uuid>
first_name: Jennifer
last_name: Martinez
email: jennifer@mapleridgeconcrete.ca
position: Director
user_id: <auth_user_id>
profile_completed: TRUE
hire_date: <today>
created_at: <timestamp>
```

---

## Next Actions for Jennifer

1. ✅ **Registration Complete**
2. ✅ **Email Verified**
3. ✅ **Company Profile Created**
4. ⏭️ **Add Team Members** (`/admin/employees` or `/onboarding/upload-employees`)
5. ⏭️ **Start Phase 1** (`/phases/[phase1-id]`)
6. ⏭️ **Upload Documents** (`/documents`)
7. ⏭️ **Review Compliance** (`/audit`)

---

## Summary

✅ **Registration:** Complete
✅ **Company Created:** Maple Ridge Concrete Ltd.
✅ **Industry Data:** Saved (Concrete Construction, 32 employees, 5 years)
✅ **User Profile:** Created (Admin role)
✅ **Welcome Page:** Ready to view
✅ **Dashboard:** Ready to use
✅ **Phases:** Ready to start

**Status:** Ready to begin COR certification journey! 🚀
