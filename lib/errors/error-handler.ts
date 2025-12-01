// ================================
// Error Handler
// ================================
// Centralized error handling for API routes

import { NextResponse } from 'next/server';
import { AppError } from './base.error';

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
  if (error && typeof error === 'object' && 'issues' in error) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: (error as any).issues,
        },
      },
      { status: 400 }
    );
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

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

