// ================================
// Sentry Adapter Implementation
// ================================
// Sentry-specific implementation of IErrorTrackingAdapter
// Wraps Sentry SDK calls to match the generic error tracking interface

import { IErrorTrackingAdapter } from './error-tracking-adapter.interface';
import { captureException, captureMessage, addBreadcrumb } from '@/lib/monitoring/sentry';

/**
 * Sentry adapter implementation
 * Implements IErrorTrackingAdapter using Sentry SDK
 * This is the Sentry-specific implementation of the generic error tracking interface
 */
export class SentryAdapter implements IErrorTrackingAdapter {
  /**
   * Capture an exception/error
   */
  captureException(error: Error, context?: Record<string, unknown>): void {
    captureException(error, context);
  }

  /**
   * Capture a message (for important events, not general logging)
   */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
    context?: Record<string, unknown>
  ): void {
    captureMessage(message, level, context);
  }

  /**
   * Add breadcrumb (context leading up to errors)
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, unknown>
  ): void {
    addBreadcrumb(message, category, level, data);
  }
}

