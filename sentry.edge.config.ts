// ================================
// Sentry Edge Configuration
// ================================
// This file configures Sentry for Edge runtime (middleware, edge functions)
// Official Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Setup Guide: https://chatflow.sentry.io/onboarding/setup-docs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Use environment variable (fallback to hardcoded DSN if not set)
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://dc96bfd04a798a0ae84a0c38d7d77e01@o4510472153268224.ingest.de.sentry.io/4510472158773328",
  
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
