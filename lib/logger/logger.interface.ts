// ================================
// Logger Interface
// ================================
// Defines the contract for all logger implementations
// Allows swapping logger providers without changing service code

export interface LogContext {
  component?: string;
  userId?: string;
  roomId?: string;
  messageId?: string;
  [key: string]: unknown;
}

/**
 * Logger interface for application-wide logging
 * All logger implementations must conform to this interface
 */
export interface ILogger {
  /**
   * Log debug information (only in development)
   * These are NOT sent to error tracking - use for debugging only
   */
  log(message: string, ...args: unknown[]): void;

  /**
   * Log info messages
   * Sent to error tracking as breadcrumbs (context), not as events
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log warnings
   * Sent to error tracking as breadcrumbs, but can also be sent as messages if important
   */
  warn(message: string, context?: LogContext, sendToSentry?: boolean): void;

  /**
   * Log errors (always logged, sent to error tracking in production)
   * This is the main method for error tracking
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void;

  /**
   * Log performance metrics (optional)
   */
  performance(operation: string, duration: number, context?: LogContext): void;
}

