/**
 * Sentry Client Configuration
 * 
 * This file configures Sentry for the client-side of your Next.js application.
 * It captures errors, performance data, and user sessions.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Only log errors in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Sample rate for performance monitoring (10% of transactions)
  tracesSampleRate: 0.1,
  
  // Set sample rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 0.1,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
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
      
      // Remove sensitive query params
      if (event.request.query_string) {
        const params = new URLSearchParams(event.request.query_string);
        params.delete('token');
        params.delete('api_key');
        params.delete('password');
        event.request.query_string = params.toString();
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
    // Browser extensions
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'atomicFindClose',
    'fb_xd_fragment',
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    // Network errors
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    // Chrome extensions
    'chrome-extension://',
    'moz-extension://',
  ],
  
  // Deny URLs from being instrumented
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
  
  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask all text content and user input
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
