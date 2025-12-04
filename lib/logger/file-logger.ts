// ================================
// File Logger Implementation
// ================================
// Logger that writes structured JSON logs to a file
// Similar to message-flow.log format
// Implements ILogger interface
// SERVER-ONLY: Uses Node.js fs module

import 'server-only'; // Mark as server-only to prevent client bundling

import fs from 'fs';
import path from 'path';
import { ILogger, LogContext } from './logger.interface';

const isDev = process.env.NODE_ENV === 'development';

// Default log file path (can be configured via env or database)
const DEFAULT_LOG_FILE = path.join(process.cwd(), 'app.log');

interface FileLogEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'performance';
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  performance?: {
    operation: string;
    duration: number;
  };
}

/**
 * File logger implementation
 * Writes structured JSON logs to a file (similar to message-flow.log)
 */
export class FileLogger implements ILogger {
  private logFile: string;

  constructor(logFilePath?: string) {
    // Use provided path, env variable, or default
    this.logFile = logFilePath || 
                   process.env.LOG_FILE_PATH || 
                   DEFAULT_LOG_FILE;
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Write log entry to file
   */
  private writeLog(entry: FileLogEntry): void {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine, 'utf8');
      
      // Also log to console in development for immediate visibility
      if (isDev) {
        const levelEmoji = {
          'log': '📝',
          'info': 'ℹ️',
          'warn': '⚠️',
          'error': '❌',
          'performance': '⚡',
        }[entry.level] || '📋';
        
        console.log(`${levelEmoji} [${entry.level.toUpperCase()}] ${entry.message}`, entry.context || '');
      }
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error);
      console.error(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context || '');
    }
  }

  /**
   * Log debug information (only in development)
   */
  log(message: string, ...args: unknown[]): void {
    if (isDev) {
      this.writeLog({
        timestamp: new Date().toISOString(),
        level: 'log',
        message,
        context: args.length > 0 ? { args } : undefined,
      });
    }
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext, sendToSentry?: boolean): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context: {
        ...context,
        sendToSentry: sendToSentry || false,
      },
    });
  }

  /**
   * Log errors (always logged)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : error
        ? { message: String(error) }
        : undefined;

    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: errorDetails,
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'performance',
      message: `${operation} completed`,
      context,
      performance: {
        operation,
        duration,
      },
    });
    
    // Log slow operations as warnings
    if (duration > 1000) {
      this.warn(`Slow operation: ${operation} took ${duration}ms`, context);
    }
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFile;
  }

  /**
   * Clear the log file (useful for testing)
   */
  clearLog(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }
    } catch (error) {
      console.error('Failed to clear log file:', error);
    }
  }

  /**
   * Read recent log entries
   */
  readRecentLogs(limit: number = 50): FileLogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line) as FileLogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is FileLogEntry => entry !== null);
      
      return entries;
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }
}

