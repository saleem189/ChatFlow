// ================================
// Utils Index - Re-exports
// ================================
// Centralized exports for backward compatibility
// New code should import directly from specific modules

// Class helpers
export { cn } from './utils/class-helpers';

// String helpers
export { getInitials } from './utils/string-helpers';

// Function helpers
export { debounce } from './utils/function-helpers';

/**
 * Format time for chat list (e.g., "2h ago", "Yesterday", "Jan 15")
 * @deprecated Use formatChatListTime from '@/lib/utils/date-formatter' instead
 * This function is kept for backward compatibility and re-exports from the new location
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted time string
 */
export { formatChatListTime } from './utils/date-formatter';

/**
 * Format time for message display (e.g., "2m ago", "1h ago", "Yesterday", "Jan 15, 2:30 PM")
 * @deprecated Use formatMessageTime from '@/lib/utils/date-formatter' instead
 * This function is kept for backward compatibility and re-exports from the new location
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted time string
 */
export { formatMessageTime } from './utils/date-formatter';

/**
 * Debounce function - delays execution until after wait time has passed
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds (default: 300)
 * @returns Debounced function
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
