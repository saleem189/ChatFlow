// ================================
// String Helper Utilities
// ================================
// String manipulation and formatting functions

/**
 * Get initials from a name
 * @param name - Full name (e.g., "John Doe")
 * @returns Initials (e.g., "JD")
 * 
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Alice") // "AL"
 * getInitials("") // "??"
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
 * Truncate string to specified length
 * @param str - String to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add if truncated (default: "...")
 * @returns Truncated string
 */
export function truncate(str: string, length: number, suffix: string = "..."): string {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Capitalize first letter of string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to slug (URL-friendly)
 * @param str - String to convert
 * @returns Slug string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

