// ================================
// useMicrophone Hook
// ================================
// Specialized hook for microphone permissions
// Convenience wrapper around usePermissions

"use client";

import { usePermissions } from './use-permissions';
import type { UsePermissionOptions } from '../types';

/**
 * Hook for managing microphone permissions
 * 
 * @example
 * ```tsx
 * const { isGranted, request, isRequesting } = useMicrophone({
 *   onGranted: () => console.log('Microphone granted'),
 * });
 * ```
 */
export function useMicrophone(options?: UsePermissionOptions) {
  return usePermissions('microphone', {
    ...options,
    // Microphone-specific defaults
    rememberDecision: true,
  });
}

