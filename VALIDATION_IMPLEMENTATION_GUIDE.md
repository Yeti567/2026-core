# Input Validation Implementation Guide

## Quick Start

### 1. Import Validation Utilities

```typescript
import { validateRequestBody } from '@/lib/validation/utils';
import { createDocumentSchema } from '@/lib/validation/schemas';
```

### 2. Validate Request Body

```typescript
export async function POST(request: Request) {
  try {
    // This will throw a NextResponse if validation fails
    const validated = await validateRequestBody(request, createDocumentSchema);
    
    // Use validated data (type-safe!)
    await supabase.from('documents').insert(validated);
    
  } catch (error) {
    // Validation errors are already formatted as NextResponse
    if (error instanceof NextResponse) {
      return error;
    }
    throw error;
  }
}
```

### 3. Alternative: Safe Validation (No Throw)

```typescript
import { safeValidateRequestBody } from '@/lib/validation/utils';

export async function POST(request: Request) {
  const validation = await safeValidateRequestBody(request, createDocumentSchema);
  
  if (!validation.success) {
    return validation.response; // Already formatted error
  }
  
  // Use validation.data (type-safe!)
  const validated = validation.data;
  await supabase.from('documents').insert(validated);
}
```

---

## Available Schemas

### Common Schemas
- `uuidSchema` - UUID validation
- `emailSchema` - Email validation (auto-lowercase, trim)
- `dateStringSchema` - ISO 8601 date string
- `userRoleSchema` - User role enum
- `paginationSchema` - Pagination params
- `searchQuerySchema` - Search query params

### Entity Schemas
- `createDocumentSchema` - Create document
- `updateDocumentSchema` - Update document
- `batchTagSchema` - Batch tag documents
- `createCertificationSchema` - Create certification
- `createInvitationSchema` - Create invitation
- `createEquipmentSchema` - Create equipment
- `createWorkOrderSchema` - Create work order
- `createActionPlanSchema` - Create action plan
- `subscribePushSchema` - Subscribe to push notifications
- `trackNotificationSchema` - Track notification interaction

---

## Creating Custom Schemas

### Example: Custom Route Schema

```typescript
import { z } from 'zod';
import { uuidSchema, emailSchema } from '@/lib/validation/schemas';

const createCustomEntitySchema = z.object({
  name: z.string().min(1).max(200),
  email: emailSchema,
  companyId: uuidSchema,
  tags: z.array(z.string().max(50)).optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

### Example: Extending Existing Schema

```typescript
import { createDocumentSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

const createDocumentWithAttachmentsSchema = createDocumentSchema.extend({
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    size: z.number().positive(),
  })).optional(),
});
```

---

## Migration Checklist

For each route:

- [ ] Identify the request body structure
- [ ] Find or create appropriate Zod schema
- [ ] Replace `await request.json()` with `validateRequestBody()`
- [ ] Update error handling to catch validation errors
- [ ] Test with valid data
- [ ] Test with invalid data (missing fields, wrong types, etc.)
- [ ] Test with edge cases (empty strings, null, undefined, etc.)

---

## Examples

### Before (Manual Validation)
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  if (!body.name || !body.email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  
  // No type checking, no format validation
  await supabase.from('users').insert(body);
}
```

### After (Zod Validation)
```typescript
import { validateRequestBody } from '@/lib/validation/utils';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const validated = await validateRequestBody(request, createUserSchema);
    await supabase.from('users').insert(validated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    throw error;
  }
}
```

---

## Error Response Format

Validation errors return:
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    },
    {
      "path": ["age"],
      "message": "Must be a positive number"
    }
  ]
}
```

---

## Priority Routes to Fix

1. **Critical** (Fix First):
   - `/api/push/*` - All push notification routes
   - `/api/notifications/*` - All notification routes
   - Routes using `.catch(() => ({}))`

2. **High Priority**:
   - `/api/documents/*` - Document management
   - `/api/maintenance/*` - Maintenance operations
   - `/api/certifications/*` - Certification management

3. **Medium Priority**:
   - `/api/audit/*` - Audit operations
   - `/api/admin/*` - Admin operations
   - `/api/invitations/*` - Invitation management

4. **Low Priority**:
   - `/api/pdf-converter/*` - PDF conversion
   - `/api/training/*` - Training operations

---

## Testing Validation

### Test Valid Data
```typescript
const response = await fetch('/api/documents', {
  method: 'POST',
  body: JSON.stringify({
    document_type: 'POL',
    title: 'Test Document',
  }),
});
expect(response.status).toBe(201);
```

### Test Invalid Data
```typescript
const response = await fetch('/api/documents', {
  method: 'POST',
  body: JSON.stringify({
    // Missing required fields
  }),
});
expect(response.status).toBe(400);
const data = await response.json();
expect(data.errors).toBeDefined();
```

### Test Type Validation
```typescript
const response = await fetch('/api/documents', {
  method: 'POST',
  body: JSON.stringify({
    document_type: 123, // Wrong type!
    title: 'Test',
  }),
});
expect(response.status).toBe(400);
```

---

## Benefits

✅ **Type Safety** - Runtime validation matches TypeScript types
✅ **Consistency** - Same validation logic across all routes
✅ **Security** - Prevents injection attacks, type confusion
✅ **Better Errors** - Detailed validation error messages
✅ **Maintainability** - Centralized validation logic
✅ **Documentation** - Schemas serve as API documentation
