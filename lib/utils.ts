import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get initials from a name
 * @param name - Full name (e.g., "John Doe")
 * @returns Initials (e.g., "JD")
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) {
    return "??"
  }

  const parts = name.trim().split(/\s+/)
  
  if (parts.length === 1) {
    // Single name - return first 2 characters
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  // Multiple names - return first letter of first and last name
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Format time for chat list (e.g., "2h ago", "Yesterday", "Jan 15")
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 */
export function formatChatListTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return "Just now"
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays === 1) {
    return "Yesterday"
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}

/**
 * Format time for message display (e.g., "2m ago", "1h ago", "Yesterday", "Jan 15, 2:30 PM")
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // Less than 1 minute
  if (diffMins < 1) {
    return "Just now"
  }
  
  // Less than 1 hour - show minutes
  if (diffMins < 60) {
    return `${diffMins}m ago`
  }
  
  // Less than 24 hours - show hours
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  
  // Yesterday
  if (diffDays === 1) {
    return "Yesterday"
  }
  
  // Less than 7 days - show days
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  
  // Less than 1 year - show date without year
  if (diffDays < 365) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  
  // Older than 1 year - show full date
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/**
 * Debounce function - delays execution until after wait time has passed
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds (default: 300)
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
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
