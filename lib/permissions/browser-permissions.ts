// ================================
// Browser Permissions Service
// ================================
// Centralized service for managing all browser permissions
// Provides consistent API for microphone, camera, notifications, push, etc.

import type { PermissionName, PermissionState, PermissionStatus, PermissionRequestOptions } from './types';

/**
 * Storage key prefix for permission state
 */
const STORAGE_PREFIX = 'permission:';

/**
 * Cache validity duration (1 minute)
 */
const CACHE_VALIDITY_MS = 60000;

/**
 * Browser Permissions Service
 * Singleton service for managing browser permissions
 */
class BrowserPermissionsService {
  private listeners = new Map<PermissionName, Set<(status: PermissionStatus) => void>>();
  private statusCache = new Map<PermissionName, PermissionStatus>();
  private checkIntervals = new Map<PermissionName, NodeJS.Timeout>();

  /**
   * Check if permission is supported in current browser
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
   * Caches results for performance
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
        // Try Permissions API first (most accurate)
        if (navigator.permissions?.query) {
          try {
            // Type assertion needed because Permissions API has limited support
            const result = await navigator.permissions.query({ 
              name: name as any 
            });
            state = result.state as PermissionState;
            
            // Listen for changes
            result.onchange = () => {
              this.updateStatus(name, result.state as PermissionState);
            };
          } catch (permError) {
            // Permissions API might not support this permission name
            // Fall back to localStorage or other methods
            state = this.getFallbackStatus(name);
          }
        } else {
          // Permissions API not available, use fallback
          state = this.getFallbackStatus(name);
        }
      } catch (error) {
        // Error checking permission, use fallback
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
   * Request permission from user
   */
  async request(
    name: PermissionName,
    options: PermissionRequestOptions = {}
  ): Promise<PermissionStatus> {
    const { remember = true } = options;

    if (!this.isSupported(name)) {
      const error = new Error(`Permission ${name} is not supported in this browser`);
      options.onError?.(error);
      throw error;
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
          const notifStatus = await this.request('notifications', { remember: false });
          if (notifStatus.state === 'granted') {
            state = await this.requestPushPermission();
          } else {
            state = 'denied';
          }
          break;
        
        case 'screen-wake-lock':
          state = await this.requestWakeLockPermission();
          break;
        
        case 'persistent-storage':
          state = await this.requestPersistentStoragePermission();
          break;
        
        case 'clipboard-read':
        case 'clipboard-write':
          // Clipboard permissions are handled differently
          state = 'prompt'; // Will be requested on actual use
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
      if (remember) {
        this.saveToStorage(name, state);
      }

      this.updateStatus(name, state);

      // Call callbacks
      if (state === 'granted') {
        options.onGranted?.();
      } else if (state === 'denied') {
        options.onDenied?.();
      }

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
      options.onError?.(error instanceof Error ? error : new Error('Unknown error'));
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
        [name]: {
          echoCancellation: name === 'microphone',
          noiseSuppression: name === 'microphone',
          autoGainControl: name === 'microphone',
        },
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
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          // Device not found, but permission might be granted
          return 'granted';
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
   * Note: This requires service worker registration
   * The actual subscription should be handled by the calling code
   */
  private async requestPushPermission(): Promise<PermissionState> {
    // Push permission is granted if we can access PushManager
    // The actual subscription is handled elsewhere
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.pushManager) {
          return 'granted';
        }
      } catch {
        return 'denied';
      }
    }
    return 'denied';
  }

  /**
   * Request screen wake lock permission
   */
  private async requestWakeLockPermission(): Promise<PermissionState> {
    if (!('wakeLock' in navigator)) {
      return 'denied';
    }

    try {
      // Wake lock doesn't require explicit permission, but we can test it
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      if (wakeLock) {
        wakeLock.release(); // Release immediately, we just needed permission
        return 'granted';
      }
      return 'denied';
    } catch {
      return 'denied';
    }
  }

  /**
   * Request persistent storage permission
   */
  private async requestPersistentStoragePermission(): Promise<PermissionState> {
    if (!('storage' in navigator && 'persistent' in navigator.storage)) {
      return 'denied';
    }

    try {
      const isPersistent = await navigator.storage.persist();
      return isPersistent ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  /**
   * Get fallback status from localStorage
   */
  private getFallbackStatus(name: PermissionName): PermissionState {
    if (typeof window === 'undefined') return 'unknown';
    
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
    if (stored === 'granted') return 'granted';
    if (stored === 'denied') return 'denied';
    return 'prompt';
  }

  /**
   * Save permission state to localStorage
   */
  private saveToStorage(name: PermissionName, state: PermissionState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${name}`, state);
    } catch (error) {
      // localStorage might be disabled or full
      console.warn('Failed to save permission state to localStorage:', error);
    }
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
    } else {
      // Create new status if not cached
      const newStatus: PermissionStatus = {
        state,
        name,
        supported: this.isSupported(name),
        lastChecked: new Date(),
      };
      this.statusCache.set(name, newStatus);
      this.notifyListeners(name, newStatus);
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
   * Returns unsubscribe function
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
        if (listeners.size === 0) {
          this.listeners.delete(name);
        }
      }
    };
  }

  /**
   * Start auto-checking permission status at interval
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
   * Stop auto-checking permission status
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
    return age < CACHE_VALIDITY_MS;
  }

  /**
   * Clear cache for a permission
   */
  clearCache(name: PermissionName): void {
    this.statusCache.delete(name);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.statusCache.clear();
  }
}

// Singleton instance
export const browserPermissions = new BrowserPermissionsService();

