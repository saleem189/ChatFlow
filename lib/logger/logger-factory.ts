// ================================
// Logger Factory
// ================================
// Factory for creating logger instances
// Ensures FileLogger is only loaded server-side

import type { ILogger } from './logger.interface';
import { SentryAdapter } from './sentry-adapter';
import { SentryLogger } from './sentry-logger';
import { ConsoleLogger } from './console-logger';

/**
 * Create a logger instance based on type
 * FileLogger is loaded lazily to prevent client bundling
 */
export function createLogger(
  loggerType: 'file' | 'sentry' | 'console',
  logFilePath?: string
): ILogger {
  if (loggerType === 'file') {
    // Lazy load FileLogger only on server
    // This prevents Next.js from trying to bundle it for client
    if (typeof window !== 'undefined') {
      // Fallback to console logger on client (should never happen)
      console.warn('[LoggerFactory] FileLogger cannot be used on client. Using ConsoleLogger.');
      return new ConsoleLogger();
    }
    
    // Only in Node.js runtime, not Edge Runtime
    if (process.env.NEXT_RUNTIME === 'edge') {
      // Edge Runtime doesn't support fs module
      console.warn('[LoggerFactory] FileLogger not available in Edge Runtime. Using ConsoleLogger.');
      return new ConsoleLogger();
    }
    
    // Import FileLogger synchronously (safe on server)
    // FileLogger has 'server-only' directive to prevent client bundling
    try {
      // Use require for synchronous import (Node.js only)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FileLogger } = require('./file-logger');
      return new FileLogger(logFilePath);
    } catch (error) {
      // Fallback if import fails
      console.error('[LoggerFactory] Failed to load FileLogger:', error);
      return new ConsoleLogger();
    }
  } else if (loggerType === 'sentry') {
    const errorTrackingAdapter = new SentryAdapter();
    return new SentryLogger(errorTrackingAdapter);
  } else {
    return new ConsoleLogger();
  }
}

