// ================================
// Logger Singleton (Backward Compatibility)
// ================================
// Temporary singleton export for backward compatibility during migration
// TODO: Remove this file after all services are migrated to use DI
//
// This file maintains the old logger API while we migrate services to use
// the new DI-based logger. Once migration is complete, this file should be deleted.

import { SentryAdapter } from './sentry-adapter';
import { SentryLogger } from './sentry-logger';

// Create singleton instances
// Using SentryAdapter as the default error tracking provider
const errorTrackingAdapter = new SentryAdapter();
const logger = new SentryLogger(errorTrackingAdapter);

// Export with the old API for backward compatibility
export { logger };

