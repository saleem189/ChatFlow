// ================================
// Date Helper Utilities
// ================================
// Helper functions for date conversion and validation

/**
 * Safely convert date to ISO string
 * Handles Date objects, ISO strings, and invalid dates
 * Provides fallback options for consistent date handling across the app
 * 
 * @param date - Date object, ISO string, or null/undefined
 * @param options - Options for fallback behavior
 * @param options.fallback - Fallback date to use if input is invalid (default: new Date())
 * @param options.useFallback - Whether to use fallback for invalid dates (default: true)
 * @returns ISO string, fallback ISO string, or undefined
 * 
 * @example
 * toISOString(new Date()) // "2024-01-15T10:30:00.000Z"
 * toISOString("2024-01-15T10:30:00Z") // "2024-01-15T10:30:00Z"
 * toISOString(null) // "2024-01-15T10:30:00.000Z" (current date)
 * toISOString(null, { useFallback: false }) // undefined
 * toISOString(invalidDate, { fallback: new Date('2024-01-01') }) // "2024-01-01T00:00:00.000Z"
 */
export function toISOString(
  date: Date | string | null | undefined,
  options: {
    fallback?: Date | string;
    useFallback?: boolean;
  } = {}
): string | undefined {
  const { 
    fallback = new Date(), 
    useFallback = true 
  } = options;

  // Handle null/undefined
  if (!date) {
    if (useFallback) {
      const fallbackDate = typeof fallback === 'string' ? new Date(fallback) : fallback;
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString();
      }
      // If fallback is also invalid, use current date
      return new Date().toISOString();
    }
    return undefined;
  }
  
  // Handle string input
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      if (useFallback) {
        const fallbackDate = typeof fallback === 'string' ? new Date(fallback) : fallback;
        if (!isNaN(fallbackDate.getTime())) {
          return fallbackDate.toISOString();
        }
        return new Date().toISOString();
      }
      console.warn('Invalid date string provided to toISOString:', date);
      return undefined;
    }
    return parsed.toISOString();
  }
  
  // Handle Date object
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      if (useFallback) {
        const fallbackDate = typeof fallback === 'string' ? new Date(fallback) : fallback;
        if (!isNaN(fallbackDate.getTime())) {
          return fallbackDate.toISOString();
        }
        return new Date().toISOString();
      }
      console.warn('Invalid Date object provided to toISOString');
      return undefined;
    }
    return date.toISOString();
  }
  
  // Try to convert to Date (for other types)
  try {
    const parsed = new Date(date as any);
    if (isNaN(parsed.getTime())) {
      if (useFallback) {
        const fallbackDate = typeof fallback === 'string' ? new Date(fallback) : fallback;
        if (!isNaN(fallbackDate.getTime())) {
          return fallbackDate.toISOString();
        }
        return new Date().toISOString();
      }
      return undefined;
    }
    return parsed.toISOString();
  } catch {
    if (useFallback) {
      const fallbackDate = typeof fallback === 'string' ? new Date(fallback) : fallback;
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString();
      }
      return new Date().toISOString();
    }
    return undefined;
  }
}

/**
 * Safely convert to Date object
 * 
 * @param date - Date object, ISO string, or null/undefined
 * @returns Date object or undefined
 */
export function toDate(
  date: Date | string | null | undefined
): Date | undefined {
  if (!date) return undefined;
  
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? undefined : date;
  }
  
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  
  return undefined;
}

/**
 * Check if a date is valid
 * 
 * @param date - Date object, ISO string, or null/undefined
 * @returns true if date is valid
 */
export function isValidDate(
  date: Date | string | null | undefined
): boolean {
  if (!date) return false;
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
}

/**
 * Get current date/time as ISO string
 * Centralized function to replace all `new Date().toISOString()` calls
 * 
 * @returns Current date/time as ISO string
 * 
 * @example
 * nowISO() // "2024-01-15T10:30:00.000Z"
 * 
 * // Use instead of:
 * // new Date().toISOString()
 */
export function nowISO(): string {
  return new Date().toISOString();
}

