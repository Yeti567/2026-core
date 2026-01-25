# Jennifer Martinez Registration - Complete Flow

## ✅ Registration Complete!

This document shows the complete registration and onboarding flow for **Jennifer Martinez** from **Maple Ridge Concrete Ltd.**

---

## 📋 Registration Data Submitted

```json
{
  "company_name": "Maple Ridge Concrete Ltd.",
  "wsib_number": "123456789",
  "company_email": "info@mapleridgeconcrete.ca",
  "address": "2500 Industrial Parkway",
  "city": "Ottawa",
  "province": "ON",
  "postal_code": "K1G 4K9",
  "phone": "(613) 555-7800",
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

---

## 🔄 Step-by-Step Flow

### Step 1: Registration Form Submission ✅

**Action:** Jennifer fills out registration form at `/register`

**What Happens:**
1. ✅ Form validation passes
2. ✅ WSIB number checked for uniqueness
3. ✅ Rate limit checked (3 attempts/hour)
4. ✅ Registration token created
5. ✅ Token stored in `registration_tokens` table with all data
6. ✅ Magic link email sent to `jennifer@mapleridgeconcrete.ca`

**Database State:**
```sql
-- registration_tokens table
INSERT INTO registration_tokens (
  token_hash, company_name, wsib_number, company_email,
  address, city, province, postal_code, phone,
  registrant_name, registrant_position, registrant_email,
  industry, employee_count, years_in_business, main_services,
  status, expires_at
) VALUES (
  '<hashed_token>',
  'Maple Ridge Concrete Ltd.',
  '123456789',
  'info@mapleridgeconcrete.ca',
  '2500 Industrial Parkway',
  'Ottawa', 'ON', 'K1G 4K9', '6135557800',
  'Jennifer Martinez', 'director', 'jennifer@mapleridgeconcrete.ca',
  'concrete_construction', 32, 5,
  ARRAY['Foundations', 'Flatwork', 'Structural Concrete', 'Decorative Finishes'],
  'pending',
  NOW() + INTERVAL '24 hours'
);
```

**Response:**
```json
{
  "success": true,
  "message": "Registration submitted. Check your email for verification link.",
  "email": "jennifer@mapleridgeconcrete.ca"
}
```

---

### Step 2: Email Verification ✅

**Action:** Jennifer clicks verification link in email

**Email Content:**
```
Subject: Verify your COR Pathways account

Hi Jennifer Martinez,

Welcome to COR Pathways! Click the link below to verify your email 
and activate your account for Maple Ridge Concrete Ltd.:

[Verify Email] → https://yourapp.com/auth/register-callback?token=xxx&code=yyy

This link expires in 24 hours.

If you didn't request this, please ignore this email.
```

**What Happens When Link Clicked:**
1. ✅ Supabase Auth verifies the code
2. ✅ User session created
3. ✅ `use_registration_token()` function called
4. ✅ Company created in database
5. ✅ User profile created (Admin role)
6. ✅ Worker record created
7. ✅ Token marked as 'used'
8. ✅ Redirect to `/welcome`

**Database Changes:**

**Companies Table:**
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
  'Ottawa', 'ON', 'K1G 4K9', '6135557800',
  'active',
  'concrete_construction',
  32,
  5,
  ARRAY['Foundations', 'Flatwork', 'Structural Concrete', 'Decorative Finishes']
)
RETURNING id; -- <company_id>
```

**User Profiles Table:**
```sql
INSERT INTO user_profiles (
  user_id, company_id, role, first_admin,
  position, display_name
) VALUES (
  <auth_user_id>,
  <company_id>,
  'admin',
  TRUE,
  'Director',
  'Jennifer Martinez'
)
RETURNING id; -- <profile_id>
```

**Workers Table:**
```sql
INSERT INTO workers (
  company_id, first_name, last_name, email,
  position, user_id, profile_completed, hire_date
) VALUES (
  <company_id>,
  'Jennifer',
  'Martinez',
  'jennifer@mapleridgeconcrete.ca',
  'Director',
  <auth_user_id>,
  TRUE,
  CURRENT_DATE
)
RETURNING id; -- <worker_id>
```

---

### Step 3: Welcome Page Experience 🎉

**URL:** `/welcome`

**What Jennifer Sees:**

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        ✓  Welcome to COR Pathways,                        ║
║           Maple Ridge Concrete Ltd.!                      ║
║                                                           ║
║  Your journey to COR 2020 certification starts here.     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────┐
│  Company Registration Complete                            │
│  ────────────────────────────────────────────────────────  │
│  Company Name:     Maple Ridge Concrete Ltd.             │
│  Industry:         Concrete Construction                  │
│  Employees:        32                                      │
│  Years in Business: 5                                     │
│  Main Services:    Foundations, Flatwork,                 │
│                    Structural Concrete,                   │
│                    Decorative Finishes                    │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  What's Next?                                             │
│  ────────────────────────────────────────────────────────  │
│  1. ✓ Understand the 14 COR Elements                     │
│     Learn about certification requirements                │
│                                                           │
│  2. ⏭️ Set Up Your Team                                   │
│     Add 32 workers and assign roles                       │
│                                                           │
│  3. ⏭️ Start Your 12-Phase Journey                         │
│     Work through structured certification process          │
│                                                           │
│  4. ⏭️ Build Your Evidence                                │
│     Upload documents and complete forms                   │
└───────────────────────────────────────────────────────────┘

[View COR Elements →]  [Go to Dashboard]
```

**When "View COR Elements" Clicked:**

```
╔═══════════════════════════════════════════════════════════╗
║  The 14 COR Elements                                      ║
║  ──────────────────────────────────────────────────────── ║
╚═══════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────┐
│  1. Health & Safety Policy                    (Weight: 5%)│
│     Written policy signed by senior management             │
│                                                           │
│  2. Hazard Assessment                          (Weight: 10%)│
│     Identifying, assessing, and controlling hazards       │
│                                                           │
│  3. Safe Work Practices                        (Weight: 10%)│
│     Written safe work procedures and practices            │
│                                                           │
│  4. Safe Job Procedures                        (Weight: 10%)│
│     Step-by-step procedures for critical tasks           │
│                                                           │
│  5. Company Safety Rules                       (Weight: 5%)│
│     Established safety rules and enforcement              │
│                                                           │
│  6. Personal Protective Equipment             (Weight: 5%)│
│     PPE selection, provision, training, and use           │
│                                                           │
│  7. Preventative Maintenance                  (Weight: 5%)│
│     Equipment maintenance and inspection programs         │
│                                                           │
│  8. Training & Communication                  (Weight: 10%)│
│     Safety training and communication programs            │
│                                                           │
│  9. Workplace Inspections                     (Weight: 10%)│
│     Regular workplace safety inspections                  │
│                                                           │
│  10. Incident Investigation                   (Weight: 10%)│
│      Incident reporting, investigation, and actions      │
│                                                           │
│  11. Emergency Preparedness                   (Weight: 5%)│
│      Emergency response plans, drills, and equipment      │
│                                                           │
│  12. Statistics & Records                      (Weight: 5%)│
│      Safety statistics tracking and record keeping        │
│                                                           │
│  13. Legislation & Compliance                 (Weight: 5%)│
│      Compliance with health and safety legislation        │
│                                                           │
│  14. Management Review                        (Weight: 5%)│
│      Regular management review of safety program          │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  Important Information                                    │
│  ────────────────────────────────────────────────────────  │
│  • Passing Score: 80% overall compliance required        │
│  • Element Weights: Some elements weighted 10%, others 5% │
│  • Evidence Required: Documentation, forms, training      │
│  • Timeline: Typically 6-12 months                        │
└───────────────────────────────────────────────────────────┘

[Start Your 12-Phase Journey →]  [Go to Dashboard]
```

---

### Step 4: Dashboard Overview 📊

**URL:** `/dashboard`

**What Jennifer Sees:**

```
╔═══════════════════════════════════════════════════════════╗
║  Dashboard                                                ║
╚═══════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────┐
│  COR Certification Phases                                 │
│  ────────────────────────────────────────────────────────  │
│                                                           │
│  Overall Progress: 0%                                     │
│  ▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                           │
│  Phases Completed: 0/12                                   │
│  In Progress: 0                                           │
│                                                           │
│  [View Phases →]                                          │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  COR Audit Dashboard                                      │
│  ────────────────────────────────────────────────────────  │
│  Track your compliance progress, identify gaps, and        │
│  prepare for your Certificate of Recognition audit.       │
│                                                           │
│  [Open Dashboard →]                                       │
└───────────────────────────────────────────────────────────┘
```

---

### Step 5: Phases Overview 🗺️

**URL:** `/phases`

**What Jennifer Sees:**

```
╔═══════════════════════════════════════════════════════════╗
║  COR Certification Phases                                ║
╚═══════════════════════════════════════════════════════════╝

Overall Progress: 0%
Phases Completed: 0/12

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Phase 1      │  │ Phase 2      │  │ Phase 3      │
│ Company      │  │ Team Setup   │  │ Safety       │
│ Onboarding   │  │ & Roles      │  │ Program      │
│              │  │              │  │ Setup        │
│ ○ not_started│  │ ○ not_started│  │ ○ not_started│
│ 0% complete  │  │ 0% complete  │  │ 0% complete  │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Phase 4      │  │ Phase 5      │  │ Phase 6      │
│ Daily        │  │ Document     │  │ Worker      │
│ Operations   │  │ Management   │  │ Certifications│
│              │  │              │  │              │
│ ○ not_started│  │ ○ not_started│  │ ○ not_started│
└──────────────┘  └──────────────┘  └──────────────┘

... (6 more phases)
```

---

### Step 6: Phase 1 Detail 📝

**URL:** `/phases/[phase1-id]`

**What Jennifer Sees:**

```
╔═══════════════════════════════════════════════════════════╗
║  Phase 1: Company Onboarding                              ║
║  ──────────────────────────────────────────────────────── ║
╚═══════════════════════════════════════════════════════════╝

Progress: 67% (2/3 prompts completed)
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

Prompts:
────────────────────────────────────────────────────────────

✓ Prompt 1: Company Registration
  Status: Completed
  Completed on: [Today's Date]

✓ Prompt 2: Admin Account Setup
  Status: Completed
  Completed on: [Today's Date]

○ Prompt 3: Company Profile Completion
  Status: In Progress
  [Mark Complete]

[Mark Phase as Completed]
```

---

## 📊 Final Database State

### Companies Table
```sql
SELECT 
  name, industry, employee_count, years_in_business, main_services
FROM companies 
WHERE name = 'Maple Ridge Concrete Ltd.';

Result:
┌─────────────────────────────┬──────────────────────┬─────────────────┬─────────────────────┬────────────────────────────────────────────┐
│ name                        │ industry             │ employee_count  │ years_in_business   │ main_services                               │
├─────────────────────────────┼──────────────────────┼─────────────────┼─────────────────────┼────────────────────────────────────────────┤
│ Maple Ridge Concrete Ltd.   │ concrete_construction│ 32              │ 5                   │ {Foundations,Flatwork,Structural Concrete,  │
│                             │                      │                 │                     │  Decorative Finishes}                       │
└─────────────────────────────┴──────────────────────┴─────────────────┴─────────────────────┴────────────────────────────────────────────┘
```

### User Profiles Table
```sql
SELECT 
  display_name, role, first_admin, position, company_id
FROM user_profiles 
WHERE display_name = 'Jennifer Martinez';

Result:
┌──────────────────────┬────────┬──────────────┬──────────┬──────────────────────┐
│ display_name         │ role   │ first_admin  │ position │ company_id           │
├──────────────────────┼────────┼──────────────┼──────────┼──────────────────────┤
│ Jennifer Martinez    │ admin  │ TRUE         │ Director │ <company_uuid>       │
└──────────────────────┴────────┴──────────────┴──────────┴──────────────────────┘
```

---

## ✅ Registration Summary

**Status:** ✅ **COMPLETE**

- ✅ Company registered: Maple Ridge Concrete Ltd.
- ✅ Industry data saved: Concrete Construction
- ✅ Employee count: 32
- ✅ Years in business: 5
- ✅ Main services: Foundations, Flatwork, Structural Concrete, Decorative Finishes
- ✅ Admin account created: Jennifer Martinez
- ✅ User profile created: Admin role, First Admin
- ✅ Worker record created
- ✅ Welcome page accessible
- ✅ Dashboard ready
- ✅ Phases system ready

---

## 🚀 Next Steps for Jennifer

1. **Review 14 COR Elements** ✅ (Done via welcome page)
2. **Add Team Members** → `/admin/employees` or `/onboarding/upload-employees`
   - Add 32 workers
   - Assign roles (Supervisors, Workers)
   - Send invitations
3. **Complete Phase 1** → `/phases/[phase1-id]`
   - Mark "Company Profile Completion" as complete
   - Mark Phase 1 as completed
4. **Start Phase 2** → Team Setup & Roles
5. **Begin Document Collection** → `/documents`
   - Upload safety documents
   - Organize by COR element
6. **Review Compliance** → `/audit`
   - Check current status
   - Identify gaps
   - Create action plan

---

## 🎉 Success!

**Jennifer Martinez** is now registered and ready to begin her COR 2020 certification journey!

**Company:** Maple Ridge Concrete Ltd.  
**Industry:** Concrete Construction  
**Status:** Active  
**Progress:** 0% (Just starting)  
**Next Phase:** Phase 1 - Company Onboarding

---

*Registration completed successfully!* ✅
