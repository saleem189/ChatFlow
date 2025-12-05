// ================================
// Custom Hooks Exports
// ================================

// Organized API hooks (recommended)
// Usage: import { useRooms, useSendMessage } from '@/hooks/api';
export * from './api';

export { useOnlineUsers } from './use-online-users';
export type { UseOnlineUsersOptions, UseOnlineUsersReturn } from './use-online-users';

export { useSocket } from './use-socket';
export type { UseSocketOptions, UseSocketReturn } from './use-socket';

// Deprecated: Use useQueryApi and useMutationApi instead
// @deprecated - Use useQueryApi for GET requests and useMutationApi for mutations
export { useApi, useApiPost, useApiPatch, useApiDelete } from './use-api';
export type { UseApiOptions, UseApiReturn } from './use-api';

// Preferred: React Query based hooks (better caching, deduplication, background refetching)
export { useQueryApi, useMutationApi, useOptimisticMutation } from './use-react-query';

export { useTyping } from './use-typing';
export type { UseTypingOptions, UseTypingReturn } from './use-typing';

export { useFileUpload } from './use-file-upload';
export type { UseFileUploadOptions, UseFileUploadReturn, FileUploadResult } from './use-file-upload';

export { useMessageOperations } from './use-message-operations';
export type { UseMessageOperationsOptions, UseMessageOperationsReturn } from './use-message-operations';

export { useOfflineQueue } from './use-offline-queue';
export type { QueuedAction, UseOfflineQueueOptions, UseOfflineQueueReturn } from './use-offline-queue';

export { useNetworkStatus } from './use-network-status';
export type { NetworkStatus, ConnectionSpeed, UseNetworkStatusOptions, UseNetworkStatusReturn } from './use-network-status';


