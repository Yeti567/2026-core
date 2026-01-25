/**
 * Common Validation Schemas
 * 
 * Reusable Zod schemas for API route validation
 * Use these to ensure consistent, type-safe input validation
 */

import { z } from 'zod';

// =============================================================================
// COMMON PRIMITIVES
// =============================================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

/**
 * Date string validation (ISO 8601)
 */
export const dateStringSchema = z.string().datetime('Invalid date format');

/**
 * Date string or Date object
 */
export const dateSchema = z.union([
  z.string().datetime(),
  z.date(),
]).transform((val) => val instanceof Date ? val.toISOString() : val);

/**
 * Non-empty string
 */
export const nonEmptyStringSchema = z.string().min(1, 'String cannot be empty');

/**
 * Limited length string
 */
export const limitedStringSchema = (maxLength: number) =>
  z.string().max(maxLength, `String must be ${maxLength} characters or less`);

/**
 * Positive integer
 */
export const positiveIntSchema = z.number().int().positive('Must be a positive number');

/**
 * Non-negative integer
 */
export const nonNegativeIntSchema = z.number().int().nonnegative('Must be a non-negative number');

// =============================================================================
// USER ROLES
// =============================================================================

export const userRoleSchema = z.enum([
  'super_admin',
  'admin',
  'internal_auditor',
  'supervisor',
  'worker'
], {
  errorMap: () => ({ message: 'Invalid user role' })
});

// =============================================================================
// COMMON ENTITY SCHEMAS
// =============================================================================

/**
 * Company ID schema
 */
export const companyIdSchema = uuidSchema;

/**
 * User ID schema
 */
export const userIdSchema = uuidSchema;

/**
 * Worker ID schema
 */
export const workerIdSchema = uuidSchema;

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(25),
  offset: z.number().int().nonnegative().optional(),
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  query: z.string().max(200).optional(),
  search: z.string().max(200).optional(),
  q: z.string().max(200).optional(),
}).transform((data) => ({
  query: data.query || data.search || data.q || undefined,
}));

// =============================================================================
// DOCUMENT SCHEMAS
// =============================================================================

export const documentTypeSchema = z.string().min(1).max(50);
export const documentStatusSchema = z.enum([
  'draft',
  'pending_review',
  'under_review',
  'approved',
  'active',
  'under_revision',
  'obsolete',
  'archived'
]);

export const createDocumentSchema = z.object({
  document_type: documentTypeSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  review_frequency: z.number().int().positive().optional(),
  owner_user_id: userIdSchema.optional(),
  prefix: z.string().max(20).optional(),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export const batchTagSchema = z.object({
  document_ids: z.array(uuidSchema).min(1, 'At least one document ID required'),
  tags: z.array(z.string().max(50)).optional(),
  cor_elements: z.array(z.number().int().positive().max(14)).optional(),
});

// =============================================================================
// CERTIFICATION SCHEMAS
// =============================================================================

export const createCertificationSchema = z.object({
  worker_id: workerIdSchema,
  certification_type_id: uuidSchema.optional(),
  name: z.string().min(1).max(200),
  issuing_organization: z.string().max(200).optional(),
  certificate_number: z.string().max(100).optional(),
  issue_date: dateStringSchema.optional(),
  expiry_date: dateStringSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCertificationSchema = createCertificationSchema.partial();

// =============================================================================
// INVITATION SCHEMAS
// =============================================================================

export const createInvitationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: emailSchema,
  position: z.string().min(1).max(100),
  role: userRoleSchema.default('worker'),
});

export const bulkInvitationSchema = z.object({
  invitations: z.array(createInvitationSchema).min(1).max(100),
});

// =============================================================================
// EQUIPMENT SCHEMAS
// =============================================================================

export const createEquipmentSchema = z.object({
  name: z.string().min(1).max(200),
  equipment_type: z.string().min(1).max(100),
  category: z.string().max(100).optional(),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  year_manufactured: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  purchase_date: dateStringSchema.optional(),
  purchase_price: z.number().nonnegative().optional(),
});

// =============================================================================
// MAINTENANCE SCHEMAS
// =============================================================================

export const maintenanceTypeSchema = z.enum([
  'preventive',
  'corrective',
  'inspection',
  'calibration',
  'repair',
  'other'
]);

export const prioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const createWorkOrderSchema = z.object({
  equipment_id: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  maintenance_type: maintenanceTypeSchema,
  priority: prioritySchema.default('medium'),
  scheduled_date: dateStringSchema.optional(),
  due_date: dateStringSchema.optional(),
  schedule_id: uuidSchema.optional(),
  assigned_to: userIdSchema.optional(),
  assigned_mechanic: userIdSchema.optional(),
  problem_description: z.string().max(2000).optional(),
  safety_concern: z.boolean().default(false),
  safety_notes: z.string().max(1000).optional(),
  estimated_labor_hours: z.number().nonnegative().optional(),
  estimated_cost: z.number().nonnegative().optional(),
  approval_required: z.boolean().default(false),
});

// =============================================================================
// ACTION PLAN SCHEMAS
// =============================================================================

export const gapSchema = z.object({
  id: z.string(),
  element_number: z.number().int().positive().max(14),
  requirement_id: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

export const createActionPlanSchema = z.object({
  gaps: z.array(gapSchema).min(1, 'At least one gap is required'),
  targetDate: dateStringSchema.optional(),
  estimatedHours: z.number().int().positive().default(80),
});

// =============================================================================
// PUSH NOTIFICATION SCHEMAS
// =============================================================================

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const subscribePushSchema = z.object({
  userId: userIdSchema,
  subscription: pushSubscriptionSchema,
});

export const unsubscribePushSchema = z.object({
  userId: userIdSchema,
  endpoint: z.string().url().optional(),
});

export const testPushSchema = z.object({
  userId: userIdSchema,
});

// =============================================================================
// NOTIFICATION SCHEMAS
// =============================================================================

export const trackNotificationSchema = z.object({
  notificationId: uuidSchema,
  action: z.enum(['clicked', 'dismissed', 'viewed']),
  timestamp: dateStringSchema.optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates request body against a Zod schema
 * Returns validated data or throws ZodError
 */
export function validateRequest<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validates request body, returns result object
 */
export function safeValidateRequest<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
