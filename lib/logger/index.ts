// ================================
// Logger Module Exports
// ================================
// Centralized exports for logger module

// Interfaces
export type { ILogger, LogContext } from './logger.interface';
export type { IErrorTrackingAdapter } from './error-tracking-adapter.interface';

// Implementations
export { SentryAdapter } from './sentry-adapter';
export { SentryLogger } from './sentry-logger';
export { TestLogger, type LogEntry } from './test-logger';

// Backward compatibility: Export singleton logger for gradual migration
// TODO: Remove this after all services are migrated to DI
export { logger } from './logger-singleton';

