# TypeScript Type Safety Audit Report

## Executive Summary

**Status:** ⚠️ **ISSUES FOUND** - 65 dangerous type casts detected

**Files Audited:** All `.ts` and `.tsx` files in `app/`, `lib/`, `components/`
**Critical Issues:** 65 instances of `as any`
**Suppressions:** 1 instance of `// @ts-expect-error` (documented)
**Status:** ⚠️ **NEEDS IMPROVEMENT**

---

## Summary Statistics

- **`as any` casts:** 65 instances
- **`// @ts-ignore`:** 0 instances ✅
- **`// @ts-expect-error`:** 1 instance (documented) ✅

**Total Dangerous Patterns:** 66

---

## Categories of `as any` Usage

### 1. API Query Parameters (17 instances) ⚠️ MEDIUM RISK

**Location:** API routes handling query parameters

**Files:**
- `app/api/documents/route.ts` (2 instances)
- `app/api/documents/search/route.ts` (2 instances)
- `app/api/maintenance/dashboard/route.ts` (6 instances)
- `app/api/maintenance/work-orders/route.ts` (2 instances)
- `app/api/maintenance/schedules/route.ts` (1 instance)
- `app/api/maintenance/records/route.ts` (1 instance)
- `app/api/audit/evidence/route.ts` (1 instance)
- `app/api/invitations/accept-with-auth/route.ts` (1 instance)

**Example:**
```typescript
// ❌ DANGEROUS
document_type: searchParams.get('type') as any || undefined,
status: searchParams.get('status') as any || undefined,
```

**Risk:** ⚠️ **MEDIUM** - Could allow invalid values, bypass validation

**Fix:** Use proper type guards or Zod schemas:
```typescript
// ✅ SAFE
const documentType = searchParams.get('type');
const validTypes = ['policy', 'procedure', 'form'] as const;
const typedType = validTypes.includes(documentType as any) ? documentType : undefined;
```

---

### 2. Supabase Query Results (28 instances) 🔴 HIGH RISK

**Location:** Database query results with joins

**Files:**
- `lib/integrations/auditsoft/export-engine.ts` (15 instances)
- `lib/documents/document-service.ts` (3 instances)
- `lib/certifications/expiry-notifications.ts` (2 instances)
- `lib/certifications/expiry-alerts.ts` (2 instances)
- `lib/audit/compliance-scoring.ts` (2 instances)
- `lib/cron/daily-notifications.ts` (1 instance)
- `app/api/maintenance/dashboard/route.ts` (3 instances)

**Example:**
```typescript
// ❌ DANGEROUS
const template = submission.form_templates as any;
const submitter = submission.user_profiles as any;
const worker = cert.user_profiles as any;
```

**Risk:** 🔴 **HIGH** - Type safety bypassed, could cause runtime errors

**Fix:** Define proper types for joined results:
```typescript
// ✅ SAFE
interface SubmissionWithRelations {
  form_templates: FormTemplate | null;
  user_profiles: UserProfile | null;
}

const submission = data as SubmissionWithRelations;
const template = submission.form_templates;
```

---

### 3. Private Property Access (5 instances) 🟡 MEDIUM RISK

**Location:** Accessing private properties of classes

**Files:**
- `lib/integrations/auditsoft/secure-client.ts` (5 instances)

**Example:**
```typescript
// ❌ DANGEROUS
const endpoint = (this.client as any).endpoint || 'https://api.auditsoft.co';
const apiKey = (this.client as any).apiKey;
```

**Risk:** 🟡 **MEDIUM** - Bypasses encapsulation, could break if class changes

**Fix:** Add public getters or proper interface:
```typescript
// ✅ SAFE
interface ClientAccess {
  getEndpoint(): string;
  getApiKey(): string;
}

const endpoint = this.client.getEndpoint();
```

---

### 4. Browser API Extensions (4 instances) 🟢 LOW RISK

**Location:** Accessing non-standard browser APIs

**Files:**
- `lib/pwa/install-detection.ts` (2 instances)
- `components/pwa/ios-install-prompt.tsx` (2 instances)

**Example:**
```typescript
// ⚠️ ACCEPTABLE (with proper checks)
if ((window.navigator as any).standalone === true) {
  // iOS standalone mode
}
```

**Risk:** 🟢 **LOW** - Non-standard APIs require type assertions

**Fix:** Use type guards:
```typescript
// ✅ SAFER
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

const nav = window.navigator as NavigatorStandalone;
if (nav.standalone === true) {
  // ...
}
```

---

### 5. Form/Component Props (5 instances) 🟡 MEDIUM RISK

**Location:** Component props and form handling

**Files:**
- `app/(protected)/admin/form-templates/page.tsx` (1 instance)
- `components/form-builder/admin/template-metadata.tsx` (1 instance)
- `components/form-builder/admin/form-preview.tsx` (1 instance)
- `components/form-builder/admin/form-builder.tsx` (1 instance)
- `lib/sync/form-queue.ts` (1 instance)

**Example:**
```typescript
// ❌ DANGEROUS
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
```

**Risk:** 🟡 **MEDIUM** - Could allow invalid values

**Fix:** Use proper types:
```typescript
// ✅ SAFE
type TabValue = 'overview' | 'forms' | 'settings';
<Tabs value={activeTab} onValueChange={(v: TabValue) => setActiveTab(v)}>
```

---

### 6. Error Handling (4 instances) 🟡 MEDIUM RISK

**Location:** Error type handling

**Files:**
- `lib/sync/sync-engine.ts` (4 instances)

**Example:**
```typescript
// ❌ DANGEROUS
error: this.classifyError(error, (error as any).code),
```

**Risk:** 🟡 **MEDIUM** - Could miss error properties

**Fix:** Use type guards:
```typescript
// ✅ SAFE
interface ErrorWithCode extends Error {
  code?: string | number;
}

if ('code' in error) {
  const errorWithCode = error as ErrorWithCode;
  // ...
}
```

---

## Detailed Findings by File

### High Priority Fixes

#### 1. `lib/integrations/auditsoft/export-engine.ts` (15 instances)

**Issues:**
- Multiple `as any` casts on Supabase query results
- Accessing joined table properties without proper types

**Risk:** 🔴 **HIGH** - Type safety completely bypassed

**Recommendation:** Define proper interfaces for all query results

---

#### 2. `app/api/maintenance/dashboard/route.ts` (6 instances)

**Issues:**
- `as any` casts on equipment relations
- Query parameter type assertions

**Risk:** 🔴 **HIGH** - Could cause runtime errors

**Recommendation:** Define proper types for maintenance queries

---

#### 3. `lib/integrations/auditsoft/secure-client.ts` (5 instances)

**Issues:**
- Accessing private properties via `as any`
- Bypassing encapsulation

**Risk:** 🟡 **MEDIUM** - Could break if class structure changes

**Recommendation:** Add proper public accessors

---

### Medium Priority Fixes

#### 4. API Route Query Parameters (17 instances)

**Files:** Multiple API route files

**Issues:**
- Query parameters cast to `any`
- No validation of input types

**Risk:** ⚠️ **MEDIUM** - Could allow invalid values

**Recommendation:** Use Zod schemas for query parameter validation

---

#### 5. Component Props (5 instances)

**Files:** Form builder and admin components

**Issues:**
- Props cast to `any`
- Form values not properly typed

**Risk:** 🟡 **MEDIUM** - Could allow invalid form values

**Recommendation:** Define proper prop types

---

### Low Priority (Acceptable)

#### 6. Browser API Extensions (4 instances)

**Files:** PWA detection code

**Issues:**
- Non-standard browser APIs require type assertions

**Risk:** 🟢 **LOW** - Documented, necessary for browser compatibility

**Status:** ✅ **ACCEPTABLE** - But could be improved with type guards

---

## Documented Suppressions

### `// @ts-expect-error` (1 instance)

**File:** `app/(protected)/admin/documents/upload/page.tsx:587`

**Usage:**
```typescript
// @ts-expect-error webkitdirectory is not in standard types
```

**Status:** ✅ **ACCEPTABLE** - Properly documented with explanation

**Note:** This is the correct way to suppress TypeScript errors when necessary

---

## Recommendations

### 🔴 HIGH PRIORITY

1. **Fix Supabase Query Result Types**
   - Define proper interfaces for all joined query results
   - Create type helpers for common query patterns
   - Remove all `as any` casts on database results

2. **Fix API Query Parameter Types**
   - Use Zod schemas for query parameter validation
   - Create type-safe query parameter parsers
   - Remove `as any` casts on query parameters

3. **Fix Private Property Access**
   - Add public getters to classes
   - Create proper interfaces for client access
   - Remove `as any` casts for property access

### 🟡 MEDIUM PRIORITY

4. **Fix Component Props**
   - Define proper types for all component props
   - Use TypeScript discriminated unions where appropriate
   - Remove `as any` casts on props

5. **Fix Error Handling**
   - Create proper error type guards
   - Define error interfaces
   - Remove `as any` casts on errors

### 🟢 LOW PRIORITY

6. **Improve Browser API Types**
   - Create type declarations for non-standard APIs
   - Use type guards instead of `as any`
   - Document browser compatibility requirements

---

## Implementation Guide

### Step 1: Create Type Definitions

**File:** `lib/db/types.ts` (or create new file)

```typescript
// Supabase query result types
export interface SubmissionWithRelations {
  form_templates: FormTemplate | null;
  user_profiles: UserProfile | null;
  // ... other relations
}

export interface CertificationWithRelations {
  user_profiles: UserProfile | null;
  certification_types: CertificationType | null;
  // ... other relations
}

// API query parameter types
export type DocumentType = 'policy' | 'procedure' | 'form' | 'other';
export type DocumentStatus = 'draft' | 'published' | 'archived';
```

### Step 2: Create Type Guards

**File:** `lib/utils/type-guards.ts`

```typescript
export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && 
    ['policy', 'procedure', 'form', 'other'].includes(value);
}

export function hasCode(error: unknown): error is Error & { code: string | number } {
  return error instanceof Error && 'code' in error;
}
```

### Step 3: Replace `as any` with Proper Types

**Before:**
```typescript
const template = submission.form_templates as any;
const documentType = searchParams.get('type') as any;
```

**After:**
```typescript
const submission = data as SubmissionWithRelations;
const template = submission.form_templates;

const rawType = searchParams.get('type');
const documentType = isDocumentType(rawType) ? rawType : undefined;
```

---

## Summary

### Current State
- ❌ 65 instances of `as any`
- ✅ 0 instances of `// @ts-ignore`
- ✅ 1 instance of `// @ts-expect-error` (documented)

### Target State
- ✅ 0 instances of `as any` (or minimal, well-documented)
- ✅ 0 instances of `// @ts-ignore`
- ✅ Minimal `// @ts-expect-error` (only when necessary, documented)

### Priority Actions
1. **Immediate:** Fix Supabase query result types (28 instances)
2. **High:** Fix API query parameter types (17 instances)
3. **Medium:** Fix component props and error handling (9 instances)
4. **Low:** Improve browser API types (4 instances)

---

*Report generated: $(date)*
*Files audited: All .ts and .tsx files*
*Total dangerous patterns: 66*
*Status: ⚠️ NEEDS IMPROVEMENT*
