/**
 * Sentry Instrumentation
 * 
 * This file is executed when the Next.js server starts.
 * It initializes Sentry for server-side error tracking.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
