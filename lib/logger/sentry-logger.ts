// ================================
// Sentry Logger Implementation
// ================================
// Logger implementation using Sentry for error tracking
// Implements ILogger interface

import { ILogger, LogContext } from './logger.interface';
import { IErrorTrackingAdapter } from './error-tracking-adapter.interface';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Logger implementation using error tracking adapter
 * Works with any error tracking provider (Sentry, Datadog, LogRocket, etc.)
 * The adapter is injected via dependency injection
 * 
 * @example
 * // With Sentry
 * const logger = new SentryLogger(new SentryAdapter());
 * 
 * // With Datadog
 * const logger = new SentryLogger(new DatadogAdapter());
 * 
 * // With multiple providers
 * const logger = new SentryLogger(new CompositeAdapter([
 *   new SentryAdapter(),
 *   new DatadogAdapter()
 * ]));
 */
export class SentryLogger implements ILogger {
  constructor(private errorTrackingAdapter: IErrorTrackingAdapter) {}

  /**
   * Log debug information (only in development)
   * These are NOT sent to Sentry - use for debugging only
   */
  log(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages
   * Sent to Sentry as breadcrumbs (context), not as events
   */
  info(message: string, context?: LogContext): void {
    if (isDev) {
      console.info(`[INFO] ${message}`, context || '');
    }

    // Add as breadcrumb for error tracking context
    this.errorTrackingAdapter.addBreadcrumb(
      message,
      context?.component || 'app',
      'info',
      context as Record<string, unknown>
    );
  }

  /**
   * Log warnings
   * Sent to Sentry as breadcrumbs, but can also be sent as messages if important
   */
  warn(message: string, context?: LogContext, sendToSentry = false): void {
    if (isDev) {
      console.warn(`[WARN] ${message}`, context || '');
    }

    // Add as breadcrumb
    this.errorTrackingAdapter.addBreadcrumb(
      message,
      context?.component || 'app',
      'warning',
      context as Record<string, unknown>
    );

    // Optionally send as error tracking message for important warnings
    if (sendToSentry) {
      this.errorTrackingAdapter.captureMessage(message, 'warning', context as Record<string, unknown>);
    }
  }

  /**
   * Log errors (always logged, sent to Sentry in production)
   * This is the main method for error tracking
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    // Always log to console
    console.error(`[ERROR] ${message}`, error || '', context || '');

    // Send to error tracking provider
    if (error instanceof Error) {
      this.errorTrackingAdapter.captureException(error, {
        message,
        ...(context as Record<string, unknown>),
      });
    } else if (error) {
      // If error is not an Error instance, create one
      this.errorTrackingAdapter.captureException(new Error(message), {
        originalError: String(error),
        ...(context as Record<string, unknown>),
      });
    } else {
      // Just a message, send as error-level message
      this.errorTrackingAdapter.captureMessage(message, 'error', context as Record<string, unknown>);
    }
  }

  /**
   * Log performance metrics (optional)
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    if (isDev) {
      console.log(`[PERF] ${operation} took ${duration}ms`, context || '');
    }

    // Add as breadcrumb with performance data
    this.errorTrackingAdapter.addBreadcrumb(
      `${operation} completed`,
      'performance',
      'info',
      {
        duration,
        ...(context as Record<string, unknown>),
      }
    );

    // If operation is slow, send warning
    if (duration > 1000) {
      this.errorTrackingAdapter.captureMessage(`Slow operation: ${operation}`, 'warning', {
        duration,
        ...(context as Record<string, unknown>),
      });
    }
  }
}

