// ================================
// Error Context Utilities
// ================================
// Provides context information for errors to improve debugging

import { logger } from "@/lib/logger";

/**
 * Error context information
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  roomId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced error logging with context
 */
export function logErrorWithContext(
  error: unknown,
  context: ErrorContext,
  level: "error" | "warn" | "info" = "error"
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logData = {
    ...context,
    error: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  };

  switch (level) {
    case "error":
      logger.error(`Error in ${context.component || "unknown"}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage), context);
      break;
    case "warn":
      logger.warn(`Warning in ${context.component || "unknown"}: ${errorMessage}`, context);
      break;
    case "info":
      logger.log(`Info in ${context.component || "unknown"}: ${errorMessage}`, context);
      break;
  }
}

/**
 * Create error context from common parameters
 */
export function createErrorContext(
  component: string,
  action?: string,
  metadata?: Record<string, unknown>
): ErrorContext {
  return {
    component,
    action,
    ...metadata,
  };
}

/**
 * Wrap async function with error context
 */
export async function withErrorContext<T>(
  fn: () => Promise<T>,
  context: ErrorContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logErrorWithContext(error, context);
    throw error;
  }
}

