// ================================
// usePermissions Hook
// ================================
// React hook for managing browser permissions
// Provides reactive permission state and request functionality

"use client";

import { useState, useEffect, useCallback } from 'react';
import { browserPermissions } from '../browser-permissions';
import type { PermissionName, PermissionStatus, UsePermissionOptions, UsePermissionReturn } from '../types';

/**
 * Hook for managing browser permissions
 * 
 * @example
 * ```tsx
 * const { status, request, isGranted, isRequesting } = usePermissions('microphone', {
 *   onGranted: () => toast.success('Microphone access granted'),
 *   onDenied: () => toast.error('Microphone access denied'),
 * });
 * 
 * <button onClick={request} disabled={!isGranted && isRequesting}>
 *   {isGranted ? 'Recording' : 'Request Permission'}
 * </button>
 * ```
 */
export function usePermissions(
  name: PermissionName,
  options: UsePermissionOptions = {}
): UsePermissionReturn {
  const {
    requestOnMount = false,
    rememberDecision = true,
    checkInterval,
    onGranted,
    onDenied,
    onError,
  } = options;

  const [status, setStatus] = useState<PermissionStatus>({
    state: 'unknown',
    name,
    supported: false,
  });
  const [isRequesting, setIsRequesting] = useState(false);

  // Check initial status on mount
  useEffect(() => {
    browserPermissions.checkStatus(name).then(setStatus);
  }, [name]);

  // Subscribe to permission changes
  useEffect(() => {
    const unsubscribe = browserPermissions.subscribe(name, setStatus);
    return unsubscribe;
  }, [name]);

  // Auto-check interval if specified
  useEffect(() => {
    if (checkInterval && checkInterval > 0) {
      browserPermissions.startAutoCheck(name, checkInterval);
      return () => browserPermissions.stopAutoCheck(name);
    }
  }, [name, checkInterval]);

  // Request permission
  const request = useCallback(async () => {
    setIsRequesting(true);
    try {
      const newStatus = await browserPermissions.request(name, {
        remember: rememberDecision,
        onGranted,
        onDenied,
        onError,
      });
      setStatus(newStatus);
    } catch (error) {
      // Error already handled by onError callback
      const errorStatus: PermissionStatus = {
        state: 'denied',
        name,
        supported: browserPermissions.isSupported(name),
        lastChecked: new Date(),
        lastRequested: new Date(),
      };
      setStatus(errorStatus);
    } finally {
      setIsRequesting(false);
    }
  }, [name, rememberDecision, onGranted, onDenied, onError]);

  // Request on mount if specified and status is 'prompt'
  useEffect(() => {
    if (requestOnMount && status.state === 'prompt' && !isRequesting) {
      request();
    }
  }, [requestOnMount, status.state, isRequesting, request]);

  return {
    status,
    isRequesting,
    request,
    isGranted: status.state === 'granted',
    isDenied: status.state === 'denied',
    isPrompt: status.state === 'prompt',
    supported: status.supported,
  };
}

