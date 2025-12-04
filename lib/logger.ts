// ================================
// Enhanced Logger with Sentry Integration
// ================================
// Centralized logging with Sentry error tracking
// Use logger.log/info/warn for general logging
// Use logger.error for errors (automatically sent to Sentry)

import { captureException, captureMessage, addBreadcrumb } from './monitoring/sentry';

const isDev = process.env.NODE_ENV === 'development';

interface LogContext {
  component?: string;
  userId?: string;
  roomId?: string;
  messageId?: string;
  [key: string]: unknown;
}

// Allow any object to be passed as context (for flexibility)
type LogContextInput = LogContext | Record<string, unknown> | string | undefined | any;

export const logger = {
  /**
   * Log debug information (only in development)
   * These are NOT sent to Sentry - use for debugging only
   */
  log: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[LOG] ${message}`, ...args);
    }
  },

  /**
   * Log info messages
   * Sent to Sentry as breadcrumbs (context), not as events
   */
  info: (message: string, context?: LogContextInput) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, context || '');
    }
    
    // Add as breadcrumb for Sentry context
    const ctx = typeof context === 'object' && context !== null ? context : {};
    addBreadcrumb(message, (ctx as LogContext)?.component || 'app', 'info', ctx);
  },

  /**
   * Log warnings
   * Sent to Sentry as breadcrumbs, but can also be sent as messages if important
   */
  warn: (message: string, context?: LogContextInput, sendToSentry = false) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, context || '');
    }
    
    // Add as breadcrumb
    const ctx = typeof context === 'object' && context !== null ? context : {};
    addBreadcrumb(message, (ctx as LogContext)?.component || 'app', 'warning', ctx);
    
    // Optionally send as Sentry message for important warnings
    if (sendToSentry) {
      captureMessage(message, 'warning', ctx);
    }
  },

  /**
   * Log errors (always logged, sent to Sentry in production)
   * This is the main method for error tracking
   */
  error: (message: string, error?: Error | unknown, context?: LogContextInput) => {
    // Always log to console
    console.error(`[ERROR] ${message}`, error || '', context || '');
    
    // Send to Sentry
    const ctx = typeof context === 'object' && context !== null ? context : {};
    if (error instanceof Error) {
      captureException(error, {
        message,
        ...ctx,
      });
    } else if (error) {
      // If error is not an Error instance, create one
      captureException(new Error(message), {
        originalError: String(error),
        ...ctx,
      });
    } else {
      // Just a message, send as error-level message
      captureMessage(message, 'error', ctx);
    }
  },

  /**
   * Log performance metrics (optional)
   */
  performance: (operation: string, duration: number, context?: LogContextInput) => {
    if (isDev) {
      console.log(`[PERF] ${operation} took ${duration}ms`, context || '');
    }
    
    // Add as breadcrumb with performance data
    const ctx = typeof context === 'object' && context !== null ? context : {};
    addBreadcrumb(`${operation} completed`, 'performance', 'info', {
      duration,
      ...ctx,
    });
    
    // If operation is slow, send warning
    if (duration > 1000) {
      captureMessage(`Slow operation: ${operation}`, 'warning', {
        duration,
        ...ctx,
      });
    }
  },
};
