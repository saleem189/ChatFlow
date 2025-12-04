# Centralized Browser Permissions System

## Design Overview

A unified, modular system for managing all browser permissions (microphone, camera, notifications, push, screen sharing, etc.) with consistent UX patterns and cross-browser compatibility.

## Architecture

```
lib/
  permissions/
    index.ts              # Main export
    browser-permissions.ts # Core service
    types.ts              # Type definitions
    hooks/
      use-permissions.ts  # React hook
      use-microphone.ts   # Microphone-specific hook
      use-camera.ts       # Camera-specific hook
      use-notifications.ts# Notifications hook (enhanced)
    utils/
      permission-checker.ts
      permission-storage.ts
```

## Core Implementation

### 1. Type Definitions

```typescript
// lib/permissions/types.ts

export type PermissionName = 
  | 'microphone'
  | 'camera'
  | 'notifications'
  | 'push'
  | 'screen-wake-lock'
  | 'persistent-storage'
  | 'clipboard-read'
  | 'clipboard-write';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface PermissionStatus {
  state: PermissionState;
  name: PermissionName;
  supported: boolean;
  lastChecked?: Date;
  lastRequested?: Date;
}

export interface PermissionRequestOptions {
  requestOnMount?: boolean;
  rememberDecision?: boolean;
  onGranted?: () => void;
  onDenied?: () => void;
  onError?: (error: Error) => void;
}

export interface UsePermissionOptions extends PermissionRequestOptions {
  checkInterval?: number; // Auto-check interval in ms
  storageKey?: string;    // Custom localStorage key
}
```

### 2. Core Permission Service

```typescript
// lib/permissions/browser-permissions.ts

import type { PermissionName, PermissionState, PermissionStatus } from './types';

class BrowserPermissionsService {
  private listeners = new Map<PermissionName, Set<(status: PermissionStatus) => void>>();
  private statusCache = new Map<PermissionName, PermissionStatus>();
  private checkIntervals = new Map<PermissionName, NodeJS.Timeout>();

  /**
   * Check if permission is supported
   */
  isSupported(name: PermissionName): boolean {
    if (typeof window === 'undefined') return false;

    switch (name) {
      case 'microphone':
      case 'camera':
        return !!navigator?.mediaDevices?.getUserMedia;
      case 'notifications':
        return 'Notification' in window;
      case 'push':
        return 'serviceWorker' in navigator && 'PushManager' in window;
      case 'screen-wake-lock':
        return 'wakeLock' in navigator;
      case 'persistent-storage':
        return 'storage' in navigator && 'persistent' in navigator.storage;
      case 'clipboard-read':
      case 'clipboard-write':
        return 'clipboard' in navigator;
      default:
        return false;
    }
  }

  /**
   * Check permission status using Permissions API
   */
  async checkStatus(name: PermissionName): Promise<PermissionStatus> {
    // Check cache first
    const cached = this.statusCache.get(name);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const supported = this.isSupported(name);
    let state: PermissionState = 'unknown';

    if (!supported) {
      state = 'denied';
    } else {
      try {
        // Try Permissions API first
        if (navigator.permissions?.query) {
          const result = await navigator.permissions.query({ 
            name: name as PermissionName 
          });
          state = result.state as PermissionState;
          
          // Listen for changes
          result.onchange = () => {
            this.updateStatus(name, result.state as PermissionState);
          };
        } else {
          // Fallback: Check localStorage or try to request
          state = this.getFallbackStatus(name);
        }
      } catch (error) {
        // Permissions API might not support this permission name
        state = this.getFallbackStatus(name);
      }
    }

    const status: PermissionStatus = {
      state,
      name,
      supported,
      lastChecked: new Date(),
    };

    this.statusCache.set(name, status);
    return status;
  }

  /**
   * Request permission
   */
  async request(
    name: PermissionName,
    options?: { remember?: boolean }
  ): Promise<PermissionStatus> {
    if (!this.isSupported(name)) {
      throw new Error(`Permission ${name} is not supported in this browser`);
    }

    let state: PermissionState = 'unknown';

    try {
      switch (name) {
        case 'microphone':
        case 'camera':
          state = await this.requestMediaPermission(name);
          break;
        case 'notifications':
          state = await this.requestNotificationPermission();
          break;
        case 'push':
          // Push requires notification permission first
          const notifStatus = await this.request('notifications');
          if (notifStatus.state === 'granted') {
            state = await this.requestPushPermission();
          } else {
            state = 'denied';
          }
          break;
        default:
          throw new Error(`Request method not implemented for ${name}`);
      }

      const status: PermissionStatus = {
        state,
        name,
        supported: true,
        lastChecked: new Date(),
        lastRequested: new Date(),
      };

      // Remember decision if requested
      if (options?.remember) {
        this.saveToStorage(name, state);
      }

      this.updateStatus(name, state);
      return status;
    } catch (error) {
      const status: PermissionStatus = {
        state: 'denied',
        name,
        supported: true,
        lastChecked: new Date(),
        lastRequested: new Date(),
      };
      this.updateStatus(name, 'denied');
      throw error;
    }
  }

  /**
   * Request media permission (microphone/camera)
   */
  private async requestMediaPermission(
    name: 'microphone' | 'camera'
  ): Promise<PermissionState> {
    try {
      const constraints: MediaStreamConstraints = {
        [name]: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop tracks immediately (we just needed permission)
      stream.getTracks().forEach(track => track.stop());
      
      return 'granted';
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          return 'denied';
        }
      }
      throw error;
    }
  }

  /**
   * Request notification permission
   */
  private async requestNotificationPermission(): Promise<PermissionState> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const result = await Notification.requestPermission();
    return result as PermissionState;
  }

  /**
   * Request push notification permission
   */
  private async requestPushPermission(): Promise<PermissionState> {
    // This requires service worker registration
    // Implementation depends on your push setup
    return 'prompt'; // Placeholder
  }

  /**
   * Get fallback status from localStorage
   */
  private getFallbackStatus(name: PermissionName): PermissionState {
    if (typeof window === 'undefined') return 'unknown';
    
    const stored = localStorage.getItem(`permission:${name}`);
    if (stored === 'granted') return 'granted';
    if (stored === 'denied') return 'denied';
    return 'prompt';
  }

  /**
   * Save permission state to localStorage
   */
  private saveToStorage(name: PermissionName, state: PermissionState): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`permission:${name}`, state);
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(name: PermissionName, state: PermissionState): void {
    const status = this.statusCache.get(name);
    if (status) {
      status.state = state;
      status.lastChecked = new Date();
      this.notifyListeners(name, status);
    }
  }

  /**
   * Notify all listeners for a permission
   */
  private notifyListeners(name: PermissionName, status: PermissionStatus): void {
    const listeners = this.listeners.get(name);
    if (listeners) {
      listeners.forEach(listener => listener(status));
    }
  }

  /**
   * Subscribe to permission changes
   */
  subscribe(
    name: PermissionName,
    callback: (status: PermissionStatus) => void
  ): () => void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }
    this.listeners.get(name)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(name);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Start auto-checking permission status
   */
  startAutoCheck(name: PermissionName, interval: number = 60000): void {
    if (this.checkIntervals.has(name)) {
      this.stopAutoCheck(name);
    }

    const intervalId = setInterval(() => {
      this.checkStatus(name);
    }, interval);

    this.checkIntervals.set(name, intervalId);
  }

  /**
   * Stop auto-checking
   */
  stopAutoCheck(name: PermissionName): void {
    const intervalId = this.checkIntervals.get(name);
    if (intervalId) {
      clearInterval(intervalId);
      this.checkIntervals.delete(name);
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(status: PermissionStatus): boolean {
    if (!status.lastChecked) return false;
    const age = Date.now() - status.lastChecked.getTime();
    return age < 60000; // Cache valid for 1 minute
  }
}

// Singleton instance
export const browserPermissions = new BrowserPermissionsService();
```

### 3. React Hook

```typescript
// lib/permissions/hooks/use-permissions.ts

"use client";

import { useState, useEffect, useCallback } from 'react';
import { browserPermissions } from '../browser-permissions';
import type { PermissionName, PermissionStatus, UsePermissionOptions } from '../types';

export function usePermissions(
  name: PermissionName,
  options: UsePermissionOptions = {}
) {
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

  // Check initial status
  useEffect(() => {
    browserPermissions.checkStatus(name).then(setStatus);
  }, [name]);

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = browserPermissions.subscribe(name, setStatus);
    return unsubscribe;
  }, [name]);

  // Auto-check interval
  useEffect(() => {
    if (checkInterval) {
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
      });
      setStatus(newStatus);

      if (newStatus.state === 'granted') {
        onGranted?.();
      } else {
        onDenied?.();
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsRequesting(false);
    }
  }, [name, rememberDecision, onGranted, onDenied, onError]);

  // Request on mount if specified
  useEffect(() => {
    if (requestOnMount && status.state === 'prompt') {
      request();
    }
  }, [requestOnMount, status.state, request]);

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
```

### 4. Specialized Hooks

```typescript
// lib/permissions/hooks/use-microphone.ts

"use client";

import { usePermissions } from './use-permissions';
import type { UsePermissionOptions } from '../types';

export function useMicrophone(options?: UsePermissionOptions) {
  return usePermissions('microphone', {
    ...options,
    // Microphone-specific defaults
    rememberDecision: true,
  });
}
```

### 5. Usage Examples

```typescript
// components/chat/voice-recorder.tsx
import { useMicrophone } from '@/lib/permissions/hooks/use-microphone';

export function VoiceRecorder({ onRecordingComplete }: Props) {
  const { 
    status, 
    request, 
    isGranted, 
    isRequesting 
  } = useMicrophone({
    onGranted: () => console.log('Microphone granted'),
    onDenied: () => toast.error('Microphone permission denied'),
  });

  const startRecording = async () => {
    if (!isGranted) {
      await request();
      return;
    }

    // Start recording...
  };

  return (
    <button 
      onClick={startRecording}
      disabled={!isGranted && isRequesting}
    >
      <Mic />
    </button>
  );
}
```

```typescript
// hooks/use-push-notifications.ts (refactored)
import { usePermissions } from '@/lib/permissions/hooks/use-permissions';

export function usePushNotifications() {
  const notifications = usePermissions('notifications');
  const push = usePermissions('push', {
    requestOnMount: false,
  });

  const subscribe = async () => {
    // Request notifications first
    if (!notifications.isGranted) {
      await notifications.request();
    }

    if (notifications.isGranted) {
      // Then request push
      await push.request();
      // ... rest of push subscription logic
    }
  };

  return {
    permission: notifications.status.state,
    isSubscribed: push.isGranted,
    subscribe,
    unsubscribe: async () => {
      // Unsubscribe logic
    },
  };
}
```

## Benefits

- ✅ **Centralized:** All permission logic in one place
- ✅ **Consistent:** Same UX patterns across all permissions
- ✅ **Type-safe:** Full TypeScript support
- ✅ **Reactive:** Auto-updates when permissions change
- ✅ **Cross-browser:** Handles browser differences
- ✅ **Testable:** Easy to mock and test
- ✅ **Extensible:** Easy to add new permissions

## Migration Guide

1. Install the permissions system
2. Replace `usePushNotifications` hook
3. Replace `VoiceRecorder` permission logic
4. Add camera permission support (if needed)
5. Add other permissions as needed

## Testing

```typescript
// __tests__/lib/permissions/browser-permissions.test.ts
describe('BrowserPermissionsService', () => {
  it('should check microphone permission', async () => {
    const status = await browserPermissions.checkStatus('microphone');
    expect(status.supported).toBe(true);
  });

  it('should request permission', async () => {
    const status = await browserPermissions.request('microphone');
    expect(['granted', 'denied']).toContain(status.state);
  });
});
```

