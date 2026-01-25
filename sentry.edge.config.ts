/**
 * Sentry Edge Configuration
 * 
 * This file configures Sentry for Edge runtime (middleware, edge functions).
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Only log errors in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Lower sample rate for edge functions (they run more frequently)
  tracesSampleRate: 0.05,
  
  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // Filter out sensitive data
  beforeSend(event) {
    
    // Filter out sensitive information
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
    }
    
    return event;
  },
  
  // Ignore certain errors
  ignoreErrors: [
    'Rate limit exceeded',
    'Unauthorized',
    'Forbidden',
  ],
});
