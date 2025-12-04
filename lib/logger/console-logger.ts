// ================================
// Console Logger Implementation
// ================================
// Simple console-based logger for local development
// Implements ILogger interface

import { ILogger, LogContext } from './logger.interface';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Console logger implementation
 * Logs to console only - no external error tracking
 * Used for local development or when LOGGER_TYPE=console
 */
export class ConsoleLogger implements ILogger {
  /**
   * Log debug information (only in development)
   */
  log(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    if (isDev) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext, sendToSentry?: boolean): void {
    if (isDev) {
      console.warn(`[WARN] ${message}`, context || '');
    }
    // sendToSentry is ignored for console logger
  }

  /**
   * Log errors (always logged)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, error || '', context || '');
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    if (isDev) {
      console.log(`[PERF] ${operation} took ${duration}ms`, context || '');
    }
    
    // Log slow operations as warnings
    if (duration > 1000) {
      console.warn(`[PERF] Slow operation: ${operation} took ${duration}ms`, context || '');
    }
  }
}

