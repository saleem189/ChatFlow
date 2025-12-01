// ================================
// Logger Utility
// ================================
// Centralized logging with environment-based filtering

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log debug information (only in development)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

