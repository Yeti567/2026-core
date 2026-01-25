# Security Checklist - Pre-Production Verification

**Date:** January 16, 2026  
**Status:** ✅ 13/13 Passed | All Issues Resolved

---

## ✅ Passed Items

### 1. Company Email Validation Blocks Free Providers
**Status:** ✅ PASS  
**Location:** `lib/validation/company.ts`

```typescript
const BLOCKED_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.ca', 'hotmail.com',
  'hotmail.ca', 'outlook.com', // ... more
];
```

Validation error message: `"Business email required (no Gmail, Yahoo, etc.)"`

---

### 2. WSIB Number Format Enforced
**Status:** ✅ PASS  
**Location:** `lib/validation/company.ts`, `app/(auth)/register/page.tsx`

- Format validation: 7-8 digit number
- Server-side validation in registration API
- Real-time validation on registration form

---

### 3. Invitation Tokens Are Cryptographically Secure (32+ chars)
**Status:** ✅ PASS  
**Locations:** 
- `supabase/migrations/002_invitation_system.sql` - 32-char hex (16 random bytes)
- `lib/invitations/token.ts` - 64-char hex (32 random bytes)

```sql
-- SQL: 32 characters (128 bits entropy)
token := encode(gen_random_bytes(16), 'hex');
```

```typescript
// TypeScript: 64 characters (256 bits entropy)
const array = new Uint8Array(32);
crypto.getRandomValues(array);
```

---

### 4. Tokens Are Single-Use (Marked Accepted Immediately)
**Status:** ✅ PASS  
**Location:** `app/api/invitations/accept-with-auth/route.ts`, `supabase/migrations/002_invitation_system.sql`

```typescript
// API immediately marks as accepted
.update({
  status: 'accepted',
  accepted_at: new Date().toISOString(),
})
```

```sql
-- SQL function marks as accepted atomically
SET status = 'accepted', accepted_at = NOW()
```

---

### 5. Expired Invitations Cannot Be Used
**Status:** ✅ PASS  
**Location:** `app/api/invitations/accept-with-auth/route.ts`

```typescript
if (new Date(invitation.expires_at) < new Date()) {
  await supabase.from('worker_invitations')
    .update({ status: 'expired' })
    .eq('id', invitation.id);
  return NextResponse.json(
    { error: 'This invitation has expired...' },
    { status: 410 }
  );
}
```

---

### 6. First Admin Cannot Be Deleted
**Status:** ✅ PASS  
**Locations:**
- `supabase/migrations/002_invitation_system.sql` - Database trigger
- `app/api/admin/employees/[id]/route.ts` - API check
- `app/(protected)/admin/employees/page.tsx` - UI disabled

```sql
-- Database trigger prevents deletion
CREATE OR REPLACE FUNCTION prevent_first_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.first_admin = TRUE THEN
        RAISE EXCEPTION 'Cannot delete the first admin of a company.';
    END IF;
    RETURN OLD;
END;
$$;
```

```typescript
// API also checks
if (employee.first_admin) {
  return NextResponse.json(
    { error: 'Cannot delete the first admin' },
    { status: 403 }
  );
}
```

---

### 7. Must Have 1+ Active Admin at All Times
**Status:** ✅ PASS  
**Location:** `app/api/admin/employees/[id]/route.ts`

```typescript
if (is_active === false && employee.role === 'admin') {
  const { count } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.companyId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .neq('id', id);

  if ((count ?? 0) < 1) {
    return NextResponse.json(
      { error: 'Cannot deactivate the last active admin' },
      { status: 400 }
    );
  }
}
```

---

### 8. Cross-Company Invitations Blocked
**Status:** ✅ PASS  
**Location:** `supabase/migrations/002_invitation_system.sql`

All RLS policies enforce company isolation:

```sql
CREATE POLICY "invitations_select_admin" ON worker_invitations
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id()
        AND get_user_role() IN ('admin', 'super_admin')
    );
```

---

### 9. Rate Limiting on Registration and Invitation Acceptance
**Status:** ✅ PASS  
**Locations:**
- `app/api/register/route.ts` - 3 attempts/hour/IP
- `app/api/invitations/accept-with-auth/route.ts` - 5 attempts/hour/IP
- `app/api/auth/forgot-password/route.ts` - 3 attempts/15min/email

```typescript
// Registration rate limit via database function
const { data: rateLimitOk } = await supabase
  .rpc('check_registration_rate_limit', { p_ip_address: ip });

// Invitation acceptance - in-memory rate limiting
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 attempts per hour per IP
```

---

### 10. All Invitation Attempts Logged
**Status:** ✅ PASS  
**Location:** `app/api/invitations/accept-with-auth/route.ts`

```typescript
async function logAcceptanceAttempt(
  supabase: SupabaseClient,
  ip: string,
  userAgent: string,
  token: string,
  success: boolean,
  reason: string,
  userId?: string
) {
  // Logs: timestamp, ip, user_agent, token (partial), success, reason, user_id
}
```

All failure reasons are logged:
- `invalid_token`
- `company_suspended`
- `already_accepted`
- `revoked`
- `expired`
- `profile_exists`
- `user_creation_failed`
- `profile_creation_failed`
- `success`

---

### 11. Magic Links Expire Appropriately
**Status:** ✅ PASS  

| Link Type | Expiration |
|-----------|------------|
| Company Registration | 24 hours |
| Worker Invitations | 7 days |
| Password Reset | 1 hour |

---

### 12. RLS Policies Prevent Cross-Tenant Access
**Status:** ✅ PASS  
**Location:** `supabase/migrations/001_multi_tenant_foundation.sql`

All tables have RLS enabled and policies enforcing `company_id = get_user_company_id()`:

- ✅ `companies`
- ✅ `user_profiles`
- ✅ `workers`
- ✅ `forms`
- ✅ `evidence_chain`
- ✅ `worker_invitations`
- ✅ `registration_tokens`
- ✅ `registration_attempts`
- ✅ `certifications`

---

## ✅ Previously Resolved Issues

### 1. Individual Signup Page (FIXED)
**Status:** ✅ RESOLVED  
**Location:** `app/(auth)/signup/page.tsx`

**Solution Applied:** Converted to a redirect to `/register`

```typescript
import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect('/register');
}
```

Users visiting `/signup` are now automatically redirected to company registration.

---

## Summary

| Category | Status |
|----------|--------|
| Email Validation | ✅ Pass |
| WSIB Validation | ✅ Pass |
| Token Security | ✅ Pass |
| Single-Use Tokens | ✅ Pass |
| Expiration Handling | ✅ Pass |
| First Admin Protection | ✅ Pass |
| Admin Minimum | ✅ Pass |
| Cross-Company Blocking | ✅ Pass |
| Rate Limiting | ✅ Pass |
| Audit Logging | ✅ Pass |
| Link Expiration | ✅ Pass |
| RLS Policies | ✅ Pass |
| No Standalone Signup | ✅ Pass |

**Overall:** ✅ 13/13 checks passed. Ready for production.
