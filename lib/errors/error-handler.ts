// ================================
// Error Handler
// ================================
// Centralized error handling for API routes
// Errors are automatically sent to Sentry via logger.error()

import { NextResponse } from 'next/server';
import { AppError } from './base.error';
import { ZodError } from 'zod';

/**
 * Handles errors and returns appropriate HTTP response
 * @param error - The error to handle
 * @returns NextResponse with error details
 */
export function handleError(error: unknown): NextResponse {
  // Handle known application errors
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.issues,
        },
      },
      { status: 400 }
    );
  }

  // Log unexpected errors (automatically sent to Sentry via logger)
  // Use dynamic import to avoid circular dependencies (fire and forget)
  import('@/lib/logger').then(({ logger }) => {
    logger.error('Unexpected error in API route', error instanceof Error ? error : new Error(String(error)), {
      component: 'ErrorHandler',
    });
  }).catch(() => {
    // Fallback if logger import fails
    console.error('Unexpected error:', error);
  });

  // Return generic error for unexpected errors
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}

