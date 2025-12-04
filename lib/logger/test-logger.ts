// ================================
// Test Logger Implementation
// ================================
// Logger implementation for testing
// Stores logs in memory for verification

import { ILogger, LogContext } from './logger.interface';

export interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'performance';
  message: string;
  error?: Error | unknown;
  context?: LogContext;
  args?: unknown[];
  duration?: number;
}

/**
 * Test logger implementation
 * Stores all logs in memory for test verification
 */
export class TestLogger implements ILogger {
  public logs: LogEntry[] = [];

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get logs by level
   */
  getLogs(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get all error logs
   */
  getErrors(): LogEntry[] {
    return this.getLogs('error');
  }

  /**
   * Check if a specific message was logged
   */
  hasMessage(message: string, level?: LogEntry['level']): boolean {
    const filtered = level ? this.getLogs(level) : this.logs;
    return filtered.some(log => log.message.includes(message));
  }

  log(message: string, ...args: unknown[]): void {
    this.logs.push({
      level: 'log',
      message,
      args,
    });
  }

  info(message: string, context?: LogContext): void {
    this.logs.push({
      level: 'info',
      message,
      context,
    });
  }

  warn(message: string, context?: LogContext, sendToSentry?: boolean): void {
    this.logs.push({
      level: 'warn',
      message,
      context: { ...context, sendToSentry },
    });
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.logs.push({
      level: 'error',
      message,
      error,
      context,
    });
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.logs.push({
      level: 'performance',
      message: operation,
      duration,
      context,
    });
  }
}

