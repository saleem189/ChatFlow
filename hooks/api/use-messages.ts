// ================================
// Message Query Hooks
// ================================
// Feature-specific React Query hooks for message operations

"use client";

import { useQueryApi, useMutationApi, useOptimisticMutation } from "@/hooks/use-react-query";
import type { Message, PaginatedMessages, MessagePayload } from "@/lib/types/message.types";

/**
 * Fetch messages for a room with pagination
 */
export function useMessages(
    roomId: string,
    options?: {
        enabled?: boolean;
        cursor?: string;
        limit?: number;
    }
) {
    const { cursor, limit = 50 } = options || {};
    const queryParams = new URLSearchParams();
    if (cursor) queryParams.set("cursor", cursor);
    queryParams.set("limit", String(limit));

    return useQueryApi<PaginatedMessages>(
        `/rooms/${roomId}/messages?${queryParams.toString()}`,
        {
            enabled: options?.enabled ?? !!roomId,
            staleTime: 10000, // 10 seconds
        }
    );
}

/**
 * Send a new message (with optimistic update support)
 */
export function useSendMessage(roomId: string, options?: {
    onSuccess?: (message: Message) => void;
    onError?: (error: Error) => void;
}) {
    return useMutationApi<MessagePayload, Message>(`/rooms/${roomId}/messages`, {
        method: "POST",
        invalidateQueries: [`/rooms/${roomId}/messages`],
        onSuccess: options?.onSuccess,
        showErrorToast: true,
    });
}

/**
 * Edit a message
 */
export function useEditMessage(roomId: string, messageId: string, options?: {
    onSuccess?: (message: Message) => void;
}) {
    return useMutationApi<{ content: string }, Message>(
        `/rooms/${roomId}/messages/${messageId}`,
        {
            method: "PATCH",
            invalidateQueries: [`/rooms/${roomId}/messages`],
            onSuccess: options?.onSuccess,
        }
    );
}

/**
 * Delete a message
 */
export function useDeleteMessage(roomId: string, messageId: string, options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<void, void>(
        `/rooms/${roomId}/messages/${messageId}`,
        {
            method: "DELETE",
            invalidateQueries: [`/rooms/${roomId}/messages`],
            onSuccess: options?.onSuccess,
        }
    );
}

/**
 * Add reaction to a message
 */
export function useAddReaction(roomId: string, messageId: string, options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<{ emoji: string }, void>(
        `/rooms/${roomId}/messages/${messageId}/reactions`,
        {
            method: "POST",
            invalidateQueries: [`/rooms/${roomId}/messages`],
            onSuccess: options?.onSuccess,
        }
    );
}

/**
 * Remove reaction from a message
 */
export function useRemoveReaction(roomId: string, messageId: string, options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<{ emoji: string }, void>(
        `/rooms/${roomId}/messages/${messageId}/reactions`,
        {
            method: "DELETE",
            invalidateQueries: [`/rooms/${roomId}/messages`],
            onSuccess: options?.onSuccess,
        }
    );
}

/**
 * Mark messages as read
 */
export function useMarkAsRead(roomId: string, options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<{ messageIds: string[] }, void>(
        `/rooms/${roomId}/messages/read`,
        {
            method: "POST",
            onSuccess: options?.onSuccess,
            showErrorToast: false, // Silent operation
        }
    );
}
