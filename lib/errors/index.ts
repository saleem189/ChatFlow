// ================================
// Error Exports
// ================================
// Barrel export for all error classes and utilities

export { AppError } from './base.error';
export { ValidationError } from './validation.error';
export { NotFoundError } from './not-found.error';
export { ForbiddenError } from './forbidden.error';
export { UnauthorizedError } from './unauthorized.error';
export { handleError } from './error-handler';
export { ERROR_MESSAGES } from './error-messages';

// Error recovery utilities
export {
  ErrorCategory,
  categorizeError,
  isRecoverableError,
  getRetryDelay,
  getMaxRetries,
  getRecoveryStrategy,
  type ErrorRecoveryStrategy,
} from './error-recovery';

// Error context utilities
export {
  logErrorWithContext,
  createErrorContext,
  withErrorContext,
  type ErrorContext,
} from './error-context';

// User-friendly messages
export {
  getUserMessage,
  shouldShowErrorToUser,
  getErrorSeverity,
  type ErrorSeverity,
} from './user-messages';

