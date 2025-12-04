// ================================
// Browser Permissions System
// ================================
// Centralized exports for browser permissions

export { browserPermissions } from './browser-permissions';
export type {
  PermissionName,
  PermissionState,
  PermissionStatus,
  PermissionRequestOptions,
  UsePermissionOptions,
  UsePermissionReturn,
} from './types';

// Hooks
export { usePermissions } from './hooks/use-permissions';
export { useMicrophone } from './hooks/use-microphone';
export { useCamera } from './hooks/use-camera';
export { useNotifications } from './hooks/use-notifications';

