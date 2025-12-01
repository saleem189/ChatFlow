// ================================
// Base Error Class
// ================================
// Abstract base class for all application errors

export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract code: string;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

