// ================================
// Browser Permissions Types
// ================================
// Type definitions for the centralized browser permissions system

/**
 * Supported browser permission names
 */
export type PermissionName = 
  | 'microphone'
  | 'camera'
  | 'notifications'
  | 'push'
  | 'screen-wake-lock'
  | 'persistent-storage'
  | 'clipboard-read'
  | 'clipboard-write';

/**
 * Permission state as returned by Permissions API
 */
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * Permission status information
 */
export interface PermissionStatus {
  state: PermissionState;
  name: PermissionName;
  supported: boolean;
  lastChecked?: Date;
  lastRequested?: Date;
}

/**
 * Options for requesting permissions
 */
export interface PermissionRequestOptions {
  remember?: boolean; // Save to localStorage (default: true)
  onGranted?: () => void;
  onDenied?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Options for usePermissions hook
 */
export interface UsePermissionOptions extends PermissionRequestOptions {
  checkInterval?: number; // Auto-check interval in ms (default: no auto-check)
  storageKey?: string; // Custom localStorage key
  requestOnMount?: boolean; // Request permission on mount if in 'prompt' state (default: false)
}

/**
 * Return type for usePermissions hook
 */
export interface UsePermissionReturn {
  status: PermissionStatus;
  isRequesting: boolean;
  request: () => Promise<void>;
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
  supported: boolean;
}

