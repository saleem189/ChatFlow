// ================================
// Pinned Messages Feature - Types
// ================================
// Types and utilities for message pinning

/**
 * Represents a pinned message
 */
export interface PinnedMessage {
    id: string;
    messageId: string;
    roomId: string;
    pinnedBy: {
        id: string;
        name: string;
        avatar?: string | null;
    };
    pinnedAt: string;
    message: {
        id: string;
        content: string;
        senderName: string;
        senderAvatar?: string | null;
        createdAt: string;
        fileUrl?: string | null;
        fileType?: string | null;
    };
}

/**
 * API response for pinned messages
 */
export interface PinnedMessagesResponse {
    pinnedMessages: PinnedMessage[];
    count: number;
}

/**
 * Pin/unpin action payload
 */
export interface PinMessagePayload {
    messageId: string;
    roomId: string;
}

/**
 * Constants
 */
export const MAX_PINS_PER_ROOM = 50;
