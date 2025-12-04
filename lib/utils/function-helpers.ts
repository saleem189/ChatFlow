// ================================
// Function Helper Utilities
// ================================
// Higher-order functions and function utilities

/**
 * Debounce function - delays execution until after wait time has passed
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds (default: 300)
 * @returns Debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching for:', query);
 * }, 500);
 * 
 * debouncedSearch('hello'); // Will only execute after 500ms of no calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function - limits execution to once per wait time
 * @param func - Function to throttle
 * @param wait - Wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= wait) {
      lastCall = now;
      func(...args);
    } else {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, wait - timeSinceLastCall);
    }
  };
}

