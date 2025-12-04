// ================================
// useCamera Hook
// ================================
// Specialized hook for camera permissions
// Convenience wrapper around usePermissions

"use client";

import { usePermissions } from './use-permissions';
import type { UsePermissionOptions } from '../types';

/**
 * Hook for managing camera permissions
 * 
 * @example
 * ```tsx
 * const { isGranted, request, isRequesting } = useCamera({
 *   onGranted: () => console.log('Camera granted'),
 * });
 * ```
 */
export function useCamera(options?: UsePermissionOptions) {
  return usePermissions('camera', {
    ...options,
    // Camera-specific defaults
    rememberDecision: true,
  });
}

