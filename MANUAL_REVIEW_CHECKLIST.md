# Supabase Manual Review Checklist

## Quick Start

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Click **SQL Editor** → **New Query**

2. **Run Review Queries**
   - Open `scripts/manual-rls-review.sql`
   - Copy and paste each query section
   - Review results

3. **Document Findings**
   - Use this checklist to track issues
   - Create migrations to fix any problems

---

## Review Checklist

### ✅ Critical Checks

- [ ] **Query 1: Tables without RLS**
  - Result: _____ rows
  - Status: ✅ Secure / ⚠️ Issues found
  - Action: ________________

- [ ] **Query 2: Weak Policies (`USING (true)`)**
  - Result: _____ rows
  - Status: ✅ Secure / ⚠️ Review needed
  - Policies to review: ________________
  - Action: ________________

- [ ] **Query 3: Public Table Access (anon role)**
  - Result: _____ rows
  - Status: ✅ Secure / ⚠️ Issues found
  - Tables with public access: ________________
  - Action: ________________

- [ ] **Query 4: Public Functions**
  - Result: _____ rows
  - Status: ✅ Secure / ⚠️ Review needed
  - Functions to review: ________________
  - Action: ________________

- [ ] **Query 5: Tables without Policies**
  - Result: _____ rows
  - Status: ✅ Secure / ⚠️ Issues found
  - Tables needing policies: ________________
  - Action: ________________

---

### ✅ Verification Checks

- [ ] **Query 6: Company Isolation**
  - Result: _____ rows
  - Status: ✅ Good coverage / ⚠️ Missing isolation
  - Notes: ________________

- [ ] **Query 7: Role-Based Access**
  - Result: _____ rows
  - Status: ✅ Properly configured / ⚠️ Review needed
  - Notes: ________________

- [ ] **Query 8: SECURITY DEFINER Functions**
  - Result: _____ rows
  - Status: ✅ Secure / ⚠️ Review needed
  - Functions to review: ________________

- [ ] **Query 9: Sensitive Tables Coverage**
  - Result: All tables have policies
  - Status: ✅ Complete / ⚠️ Missing policies
  - Notes: ________________

- [ ] **Query 10: Security Summary**
  - All checks: ✅ Pass / ⚠️ Warnings
  - Overall status: ________________

---

## Findings Log

### Critical Issues Found

| Table/Function | Issue | Severity | Fix Required |
|---------------|-------|----------|--------------|
| | | | |
| | | | |

### Review Required

| Item | Type | Notes | Decision |
|------|------|-------|----------|
| | | | |
| | | | |

---

## Fixes Applied

### Migrations Created

- [ ] Migration: ________________
- [ ] Migration: ________________
- [ ] Migration: ________________

### Policies Updated

- [ ] Policy: ________________
- [ ] Policy: ________________
- [ ] Policy: ________________

---

## Final Status

- [ ] All critical issues resolved
- [ ] All policies reviewed and secure
- [ ] Public access minimized
- [ ] Company isolation verified
- [ ] Role-based access verified
- [ ] Security summary: ✅ Pass

**Review Completed:** _______________  
**Reviewed By:** _______________  
**Next Review Date:** _______________

---

## Notes

_Add any additional notes or observations here:_



