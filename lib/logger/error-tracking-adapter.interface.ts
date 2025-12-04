// ================================
// Error Tracking Adapter Interface
// ================================
// Generic interface for error tracking providers (Sentry, Datadog, LogRocket, etc.)
// Allows swapping error tracking providers without changing logger implementation

/**
 * Generic adapter interface for error tracking providers
 * Any error tracking service (Sentry, Datadog, LogRocket, etc.) can implement this
 * 
 * @example
 * // Sentry implementation
 * class SentryAdapter implements IErrorTrackingAdapter { ... }
 * 
 * // Datadog implementation
 * class DatadogAdapter implements IErrorTrackingAdapter { ... }
 * 
 * // LogRocket implementation
 * class LogRocketAdapter implements IErrorTrackingAdapter { ... }
 */
export interface IErrorTrackingAdapter {
  /**
   * Capture an exception/error
   */
  captureException(error: Error, context?: Record<string, unknown>): void;

  /**
   * Capture a message (for important events, not general logging)
   */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' | 'fatal',
    context?: Record<string, unknown>
  ): void;

  /**
   * Add breadcrumb (context leading up to errors)
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'info' | 'warning' | 'error',
    data?: Record<string, unknown>
  ): void;
}

