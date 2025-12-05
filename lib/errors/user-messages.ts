// ================================
// User-Friendly Error Messages
// ================================
// Maps error codes and categories to user-friendly messages

import { ERROR_MESSAGES } from "./error-messages";
import { ErrorCategory, categorizeError } from "./error-recovery";
import { ApiError } from "@/lib/api-client";

/**
 * User-friendly error message mapping
 */
const USER_MESSAGE_MAP: Record<string, string> = {
  // API Error codes
  VALIDATION_ERROR: "Please check your input and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
  NOT_AUTHENTICATED: "Please log in to continue.",
  ACCESS_DENIED: "You don't have permission to perform this action.",
  RATE_LIMITED: "Too many requests. Please wait a moment.",

  // Network errors
  "NetworkError": "Network error. Please check your connection.",
  "Failed to fetch": "Unable to connect to the server. Please check your internet connection.",

  // Default messages by category
  [ErrorCategory.NETWORK]: "Network error. Please check your connection and try again.",
  [ErrorCategory.AUTHENTICATION]: "Authentication failed. Please log in again.",
  [ErrorCategory.VALIDATION]: "Invalid input. Please check your data and try again.",
  [ErrorCategory.NOT_FOUND]: "Resource not found.",
  [ErrorCategory.RATE_LIMIT]: "Too many requests. Please wait a moment and try again.",
  [ErrorCategory.SERVER]: "Server error. Please try again later.",
  [ErrorCategory.UNKNOWN]: "An unexpected error occurred. Please try again.",
};

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  // Check if it's an ApiError with a code
  if (error instanceof ApiError) {
    const errorData = error.data;

    // Check for error code in nested structure
    if (errorData?.error && typeof errorData.error === "object" && "code" in errorData.error) {
      const code = errorData.error.code as string;
      if (USER_MESSAGE_MAP[code]) {
        return USER_MESSAGE_MAP[code];
      }
    }

    // Check for direct error message
    if (error.message && USER_MESSAGE_MAP[error.message]) {
      return USER_MESSAGE_MAP[error.message];
    }

    // Use error message if it's user-friendly
    if (error.message && !error.message.includes("Request failed")) {
      return error.message;
    }
  }

  // Check for standard error messages
  if (error instanceof Error) {
    if (USER_MESSAGE_MAP[error.message]) {
      return USER_MESSAGE_MAP[error.message];
    }

    if (USER_MESSAGE_MAP[error.name]) {
      return USER_MESSAGE_MAP[error.name];
    }
  }

  // Fall back to category-based message
  const category = categorizeError(error);
  return USER_MESSAGE_MAP[category] || USER_MESSAGE_MAP[ErrorCategory.UNKNOWN];
}

/**
 * Check if error message should be shown to user
 */
export function shouldShowErrorToUser(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Don't show auth errors (handled by auth system)
    if (error.status === 401 || error.status === 403) {
      return false;
    }

    // Don't show generic 404s (resource not found)
    if (error.status === 404 && !error.message.includes("not found")) {
      return false;
    }
  }

  return true;
}

/**
 * Get error severity for UI display
 */
export type ErrorSeverity = "error" | "warning" | "info";

export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return "error";
    }
    if (error.status === 429 || error.status === 408) {
      return "warning";
    }
    if (error.status === 404) {
      return "info";
    }
  }

  return "error";
}

