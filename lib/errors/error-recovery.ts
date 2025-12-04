// ================================
// Error Recovery Utilities
// ================================
// Provides error recovery strategies and retry logic

import { ApiError } from "@/lib/api-client";

/**
 * Error categories for recovery strategies
 */
export enum ErrorCategory {
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

/**
 * Determine error category from error
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof ApiError) {
    // Network errors (0 status or fetch errors)
    if (error.status === 0 || error.message.includes("fetch") || error.message.includes("network")) {
      return ErrorCategory.NETWORK;
    }

    // Authentication errors
    if (error.status === 401 || error.status === 403) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Not found errors
    if (error.status === 404) {
      return ErrorCategory.NOT_FOUND;
    }

    // Rate limit errors
    if (error.status === 429) {
      return ErrorCategory.RATE_LIMIT;
    }

    // Validation errors
    if (error.status === 400) {
      return ErrorCategory.VALIDATION;
    }

    // Server errors
    if (error.status >= 500) {
      return ErrorCategory.SERVER;
    }
  }

  // Network errors from native Error
  if (error instanceof Error) {
    if (error.message.includes("fetch") || error.message.includes("network") || error.name === "NetworkError") {
      return ErrorCategory.NETWORK;
    }
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Check if error is recoverable (can be retried)
 */
export function isRecoverableError(error: unknown): boolean {
  const category = categorizeError(error);
  
  return [
    ErrorCategory.NETWORK,
    ErrorCategory.SERVER,
    ErrorCategory.RATE_LIMIT,
  ].includes(category);
}

/**
 * Get retry delay based on error category and attempt number
 */
export function getRetryDelay(category: ErrorCategory, attempt: number): number {
  const baseDelays: Record<ErrorCategory, number> = {
    [ErrorCategory.NETWORK]: 1000,      // 1 second
    [ErrorCategory.SERVER]: 2000,       // 2 seconds
    [ErrorCategory.RATE_LIMIT]: 5000,   // 5 seconds
    [ErrorCategory.AUTHENTICATION]: 0,  // No retry
    [ErrorCategory.VALIDATION]: 0,      // No retry
    [ErrorCategory.NOT_FOUND]: 0,       // No retry
    [ErrorCategory.UNKNOWN]: 1000,      // 1 second
  };

  const baseDelay = baseDelays[category] || 1000;
  
  // Exponential backoff: baseDelay * 2^attempt (capped at 30 seconds)
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

/**
 * Get maximum retry attempts for error category
 */
export function getMaxRetries(category: ErrorCategory): number {
  const maxRetries: Record<ErrorCategory, number> = {
    [ErrorCategory.NETWORK]: 3,
    [ErrorCategory.SERVER]: 2,
    [ErrorCategory.RATE_LIMIT]: 1,
    [ErrorCategory.AUTHENTICATION]: 0,
    [ErrorCategory.VALIDATION]: 0,
    [ErrorCategory.NOT_FOUND]: 0,
    [ErrorCategory.UNKNOWN]: 1,
  };

  return maxRetries[category] || 0;
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  shouldRetry: boolean;
  retryDelay: number;
  maxRetries: number;
  userMessage?: string;
}

/**
 * Get recovery strategy for error
 */
export function getRecoveryStrategy(error: unknown, attempt: number = 0): ErrorRecoveryStrategy {
  const category = categorizeError(error);
  const shouldRetry = isRecoverableError(error) && attempt < getMaxRetries(category);
  
  return {
    shouldRetry,
    retryDelay: shouldRetry ? getRetryDelay(category, attempt) : 0,
    maxRetries: getMaxRetries(category),
    userMessage: getUserFriendlyMessage(category, error),
  };
}

/**
 * Get user-friendly error message based on category
 */
function getUserFriendlyMessage(category: ErrorCategory, error: unknown): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }

  const messages: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]: "Network error. Please check your connection and try again.",
    [ErrorCategory.AUTHENTICATION]: "Authentication failed. Please log in again.",
    [ErrorCategory.VALIDATION]: "Invalid input. Please check your data and try again.",
    [ErrorCategory.NOT_FOUND]: "Resource not found.",
    [ErrorCategory.RATE_LIMIT]: "Too many requests. Please wait a moment and try again.",
    [ErrorCategory.SERVER]: "Server error. Please try again later.",
    [ErrorCategory.UNKNOWN]: "An unexpected error occurred. Please try again.",
  };

  return messages[category] || messages[ErrorCategory.UNKNOWN];
}

