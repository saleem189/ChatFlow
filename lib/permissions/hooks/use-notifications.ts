// ================================
// useNotifications Hook
// ================================
// Specialized hook for notification permissions
// Convenience wrapper around usePermissions

"use client";

import { usePermissions } from './use-permissions';
import type { UsePermissionOptions } from '../types';

/**
 * Hook for managing notification permissions
 * 
 * @example
 * ```tsx
 * const { isGranted, request, isRequesting } = useNotifications({
 *   onGranted: () => console.log('Notifications granted'),
 * });
 * ```
 */
export function useNotifications(options?: UsePermissionOptions) {
  return usePermissions('notifications', {
    ...options,
    // Notification-specific defaults
    rememberDecision: true,
  });
}

