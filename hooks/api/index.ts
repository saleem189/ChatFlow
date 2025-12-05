// ================================
// API Hooks Barrel Export
// ================================
// Organized feature-specific React Query hooks
// Usage: import { useRooms, useSendMessage } from '@/hooks/api';

// Room hooks
export {
    useRooms,
    useRoom,
    useCreateRoom,
    useUpdateRoom,
    useDeleteRoom,
    useAddParticipant,
    useRemoveParticipant,
} from './use-rooms';

// Message hooks
export {
    useMessages,
    useSendMessage,
    useEditMessage,
    useDeleteMessage,
    useAddReaction,
    useRemoveReaction,
    useMarkAsRead,
} from './use-messages';

// User hooks
export {
    useCurrentUser,
    useUser,
    useSearchUsers,
    useUpdateProfile,
    useUpdateAvatar,
    useDeleteAccount,
    useAllUsers,
} from './use-users';
