// ================================
// Sentry Edge Configuration
// ================================
// This file configures Sentry for Edge runtime (middleware, edge functions)
// Official Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Setup Guide: https://chatflow.sentry.io/onboarding/setup-docs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSN from environment variable - required for Sentry to work
  // Set NEXT_PUBLIC_SENTRY_DSN in your .env.local file
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',

  // Performance monitoring: 10% in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Security: Only send PII if explicitly enabled
  sendDefaultPii: process.env.SENTRY_SEND_PII === 'true',

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      const headers = event.request.headers;
      sensitiveHeaders.forEach(header => {
        if (headers && headers[header]) {
          delete headers[header];
        }
      });
    }
    
    // Don't send events in development (unless explicitly enabled)
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'true') {
      return null;
    }
    
    return event;
  },
});
