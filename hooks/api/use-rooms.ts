// ================================
// Room Query Hooks
// ================================
// Feature-specific React Query hooks for room operations

"use client";

import { useQueryApi, useMutationApi } from "@/hooks/use-react-query";
import type { ChatRoom, CreateRoomRequest, RoomResponse } from "@/lib/types/room.types";

/**
 * Fetch all rooms for the current user
 */
export function useRooms(options?: { enabled?: boolean }) {
    return useQueryApi<RoomResponse[]>("/rooms", {
        enabled: options?.enabled ?? true,
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Fetch a single room by ID
 */
export function useRoom(roomId: string, options?: { enabled?: boolean }) {
    return useQueryApi<RoomResponse>(`/rooms/${roomId}`, {
        enabled: options?.enabled ?? !!roomId,
    });
}

/**
 * Create a new room
 */
export function useCreateRoom(options?: {
    onSuccess?: (room: RoomResponse) => void;
    onError?: (error: Error) => void;
}) {
    return useMutationApi<CreateRoomRequest, RoomResponse>("/rooms", {
        method: "POST",
        invalidateQueries: ["/rooms"],
        onSuccess: options?.onSuccess,
    });
}

/**
 * Update room details
 */
export function useUpdateRoom(roomId: string, options?: {
    onSuccess?: (room: RoomResponse) => void;
}) {
    return useMutationApi<Partial<ChatRoom>, RoomResponse>(`/rooms/${roomId}`, {
        method: "PATCH",
        invalidateQueries: ["/rooms", `/rooms/${roomId}`],
        onSuccess: options?.onSuccess,
    });
}

/**
 * Delete a room
 */
export function useDeleteRoom(roomId: string, options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<void, void>(`/rooms/${roomId}`, {
        method: "DELETE",
        invalidateQueries: ["/rooms"],
        onSuccess: options?.onSuccess,
    });
}

/**
 * Add participant to a room
 */
export function useAddParticipant(roomId: string, options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<{ userId: string }, void>(`/rooms/${roomId}/participants`, {
        method: "POST",
        invalidateQueries: [`/rooms/${roomId}`],
        onSuccess: options?.onSuccess,
    });
}

/**
 * Remove participant from a room
 */
export function useRemoveParticipant(roomId: string, options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<{ userId: string }, void>(`/rooms/${roomId}/participants`, {
        method: "DELETE",
        invalidateQueries: [`/rooms/${roomId}`],
        onSuccess: options?.onSuccess,
    });
}
