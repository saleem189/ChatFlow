// ================================
// Class Name Helper Utilities
// ================================
// Tailwind CSS class name utilities

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with conflict resolution
 * Combines clsx and tailwind-merge for optimal class handling
 * 
 * @param inputs - Class names or conditional class objects
 * @returns Merged class string
 * 
 * @example
 * cn("px-2 py-1", "px-4") // "py-1 px-4" (px-2 overridden by px-4)
 * cn("text-red-500", { "text-blue-500": isActive }) // Conditional classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

