// ================================
// Date and Time Formatter Utilities
// ================================
// Centralized date/time formatting with multiple format options
// Replaces duplicate formatting logic across components

import { 
  format, 
  formatDistanceToNow, 
  isToday, 
  isYesterday, 
  isThisWeek, 
  isThisYear,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  type Locale,
} from 'date-fns';

export type TimeFormat = 'relative' | 'absolute' | 'compact' | 'full' | 'smart';

export interface FormatTimeOptions {
  format?: TimeFormat;
  includeTime?: boolean;
  relativeThreshold?: number; // Show relative if less than X days (default: 7)
  locale?: Locale; // For future i18n support
}

/**
 * Centralized time formatter with multiple format options
 * 
 * @param timestamp - ISO timestamp string or Date object
 * @param options - Formatting options
 * @returns Formatted time string
 * 
 * @example
 * formatTime('2024-01-15T10:30:00Z') // "2h ago"
 * formatTime('2024-01-15T10:30:00Z', { format: 'compact' }) // "10:30"
 * formatTime('2024-01-15T10:30:00Z', { format: 'full' }) // "Jan 15, 2024, 10:30 AM"
 */
export function formatTime(
  timestamp: string | Date,
  options: FormatTimeOptions = {}
): string {
  const {
    format: formatType = 'smart',
    includeTime = false,
    relativeThreshold = 7, // days
  } = options;

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // Validate date
  if (isNaN(date.getTime())) {
    console.warn('Invalid date provided to formatTime:', timestamp);
    return 'Invalid date';
  }

  const now = new Date();
  const daysDiff = differenceInDays(now, date);
  const hoursDiff = differenceInHours(now, date);
  const minsDiff = differenceInMinutes(now, date);

  // Smart format (default) - chooses best format automatically
  if (formatType === 'smart') {
    // Just now
    if (minsDiff < 1) {
      return 'Just now';
    }
    
    // Less than 1 hour - show minutes
    if (minsDiff < 60) {
      return `${minsDiff}m ago`;
    }
    
    // Less than 24 hours - show hours
    if (hoursDiff < 24) {
      return `${hoursDiff}h ago`;
    }
    
    // Yesterday
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    
    // Less than 7 days - show days
    if (daysDiff < 7) {
      return `${daysDiff}d ago`;
    }
    
    // Less than 1 year - show date without year
    if (isThisYear(date)) {
      return format(date, 'MMM d');
    }
    
    // Older than 1 year - show full date
    return format(date, 'MMM d, yyyy');
  }

  // Relative format - uses date-fns formatDistanceToNow
  if (formatType === 'relative') {
    if (daysDiff < relativeThreshold) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    // Fall back to absolute for older dates
    return format(date, includeTime ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy');
  }

  // Compact format - minimal space
  if (formatType === 'compact') {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    if (isThisWeek(date)) {
      return format(date, 'EEE'); // Mon, Tue, etc.
    }
    if (isThisYear(date)) {
      return format(date, 'MMM d');
    }
    return format(date, 'MMM d, yyyy');
  }

  // Full format - complete date and time
  if (formatType === 'full') {
    return format(
      date, 
      includeTime ? 'PPpp' : 'PP' // PP = full date, pp = time
    );
  }

  // Absolute format - always show date
  if (formatType === 'absolute') {
    if (isToday(date)) {
      return includeTime ? format(date, 'h:mm a') : 'Today';
    }
    if (isYesterday(date)) {
      return includeTime ? `Yesterday, ${format(date, 'h:mm a')}` : 'Yesterday';
    }
    return format(
      date,
      includeTime ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy'
    );
  }

  // Fallback
  return format(date, 'MMM d, yyyy');
}

/**
 * Format time for chat list (compact format)
 * Legacy function for backward compatibility
 * 
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted time string
 */
export function formatChatListTime(timestamp: string | Date): string {
  return formatTime(timestamp, { format: 'compact' });
}

/**
 * Format time for messages (smart relative format)
 * Legacy function for backward compatibility
 * 
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted time string
 */
export function formatMessageTime(timestamp: string | Date): string {
  return formatTime(timestamp, { format: 'smart' });
}

/**
 * Format time for detailed display (full format with time)
 * 
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted time string
 */
export function formatDetailedTime(timestamp: string | Date): string {
  return formatTime(timestamp, { format: 'full', includeTime: true });
}

