/**
 * Sentry Server Configuration
 * 
 * This file configures Sentry for the server-side of your Next.js application.
 * It captures errors from API routes, server components, and server-side rendering.
 * 
 * Production-only: Only logs errors in production environment.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Only log errors in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Sample rate for performance monitoring (10% of transactions)
  tracesSampleRate: 0.1,
  
  // Set sample rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 0.1,
  
  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // Filter out sensitive data
  beforeSend(event) {
    // Remove passwords, API keys, cookies, etc.
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
        delete event.request.headers['x-supabase-key'];
      }
      
      // Remove cookies from request
      delete event.request.cookies;
      
      // Remove sensitive query params
      if (event.request.query_string) {
        const params = new URLSearchParams(event.request.query_string);
        params.delete('token');
        params.delete('api_key');
        params.delete('password');
        params.delete('secret');
        event.request.query_string = params.toString();
      }
      
      // Remove sensitive body data
      if (event.request.data) {
        const data = event.request.data;
        if (typeof data === 'object' && data !== null) {
          const d = data as Record<string, unknown>;
          delete d['password'];
          delete d['token'];
          delete d['apiKey'];
          delete d['secret'];
          delete d['privateKey'];
        }
      }
    }
    
    // Remove sensitive user data
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    
    return event;
  },
  
  // Ignore certain errors
  ignoreErrors: [
    // Database connection errors (too noisy)
    'Connection terminated',
    'Connection timeout',
    'ECONNREFUSED',
    // Rate limiting (expected behavior)
    'Rate limit exceeded',
    // Validation errors (expected)
    'Validation error',
    'Invalid input',
  ],
  
  // Integrations - nodeProfilingIntegration requires @sentry/profiling-node package
  // Remove profiling to prevent crashes when package is not installed
  integrations: [],
});
