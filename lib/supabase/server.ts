/**
 * Supabase Server-Side Client Utilities
 * 
 * Uses @supabase/ssr for proper cookie handling in Next.js middleware,
 * Server Components, and API routes.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

// =============================================================================
// SERVER COMPONENT CLIENT
// =============================================================================

/**
 * Creates a Supabase client for use in Server Components.
 * 
 * This client uses the cookies() function from next/headers to
 * read authentication cookies. It's read-only and cannot modify cookies.
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * import { createServerComponentClient } from '@/lib/supabase/server';
 * 
 * export default async function Page() {
 *   const supabase = createServerComponentClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */
export function createServerComponentClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}

// =============================================================================
// SERVER ACTION CLIENT
// =============================================================================

/**
 * Creates a Supabase client for use in Server Actions.
 * 
 * This client can both read and write cookies, which is necessary
 * for auth operations like sign-in/sign-out in Server Actions.
 * 
 * @example
 * ```tsx
 * // In a Server Action
 * 'use server';
 * import { createServerActionClient } from '@/lib/supabase/server';
 * 
 * export async function signOut() {
 *   const supabase = createServerActionClient();
 *   await supabase.auth.signOut();
 * }
 * ```
 */
export function createServerActionClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

// =============================================================================
// MIDDLEWARE CLIENT
// =============================================================================

/**
 * Creates a Supabase client for use in Next.js middleware.
 * 
 * This client handles cookie operations through the request/response
 * objects, which is required in middleware context where cookies()
 * from next/headers is not available.
 * 
 * @param request - The incoming NextRequest
 * @param response - The NextResponse to modify
 * @returns Object with supabase client and the response to return
 * 
 * @example
 * ```tsx
 * // In middleware.ts
 * import { createMiddlewareClient } from '@/lib/supabase/server';
 * 
 * export async function middleware(request: NextRequest) {
 *   const response = NextResponse.next();
 *   const { supabase, response: res } = createMiddlewareClient(request, response);
 *   
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 *   
 *   return res;
 * }
 * ```
 */
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Set on both request and response for middleware
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  return { supabase, response };
}

// =============================================================================
// API ROUTE CLIENT
// =============================================================================

/**
 * Creates a Supabase client for use in API Route Handlers.
 * 
 * Similar to Server Actions, this client can read and write cookies.
 * 
 * @example
 * ```tsx
 * // In app/api/example/route.ts
 * import { createRouteHandlerClient } from '@/lib/supabase/server';
 * 
 * export async function GET() {
 *   const supabase = createRouteHandlerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */
export function createRouteHandlerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

// =============================================================================
// GENERIC SERVER CLIENT (Alias)
// =============================================================================

/**
 * Creates a Supabase client for server-side usage.
 * 
 * This is an async function alias for createRouteHandlerClient,
 * providing backwards compatibility for code that expects `await createClient()`.
 * 
 * @example
 * ```tsx
 * import { createClient } from '@/lib/supabase/server';
 * 
 * const supabase = await createClient();
 * ```
 */
export async function createClient() {
  return createRouteHandlerClient();
}