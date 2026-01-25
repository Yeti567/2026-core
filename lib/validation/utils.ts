/**
 * Validation Utilities
 * 
 * Helper functions for validating API request bodies
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ZodError } from 'zod';

/**
 * Format Zod errors for API responses
 */
export function formatZodError(error: ZodError): {
  message: string;
  errors: Array<{ path: string[]; message: string }>;
} {
  return {
    message: 'Validation failed',
    errors: error.errors.map((err) => ({
      path: err.path.map(String),
      message: err.message,
    })),
  };
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(error: ZodError, status: number = 400) {
  return NextResponse.json(formatZodError(error), { status });
}

/**
 * Validate request body with a Zod schema
 * Returns validated data or throws validation error response
 */
export async function validateRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw validationErrorResponse(error);
    }
    // If JSON parsing failed
    if (error instanceof SyntaxError) {
      throw NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    throw error;
  }
}

/**
 * Validate request body safely (doesn't throw)
 * Returns validated data or error response
 */
export async function safeValidateRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    return {
      success: false,
      response: validationErrorResponse(result.error),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        ),
      };
    }
    throw error;
  }
}

/**
 * Type guard to check if error is a NextResponse (validation error)
 */
export function isValidationErrorResponse(
  error: unknown
): error is NextResponse {
  return error instanceof NextResponse && error.status >= 400 && error.status < 500;
}
