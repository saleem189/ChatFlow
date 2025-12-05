// ================================
// User Query Hooks
// ================================
// Feature-specific React Query hooks for user operations

"use client";

import { useQueryApi, useMutationApi } from "@/hooks/use-react-query";
import type { User, UserDisplay, UpdateUserProfileData } from "@/lib/types/user.types";

/**
 * Fetch current user profile
 */
export function useCurrentUser(options?: { enabled?: boolean }) {
    return useQueryApi<User>("/users/me", {
        enabled: options?.enabled ?? true,
        staleTime: 60000, // 1 minute
    });
}

/**
 * Fetch a user by ID
 */
export function useUser(userId: string, options?: { enabled?: boolean }) {
    return useQueryApi<User>(`/users/${userId}`, {
        enabled: options?.enabled ?? !!userId,
        staleTime: 60000, // 1 minute
    });
}

/**
 * Search users
 */
export function useSearchUsers(
    query: string,
    options?: { enabled?: boolean; limit?: number }
) {
    const { limit = 20 } = options || {};
    const queryParams = new URLSearchParams({
        q: query,
        limit: String(limit),
    });

    return useQueryApi<UserDisplay[]>(`/users/search?${queryParams.toString()}`, {
        enabled: options?.enabled ?? query.length >= 2,
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Update current user profile
 */
export function useUpdateProfile(options?: {
    onSuccess?: (user: User) => void;
}) {
    return useMutationApi<UpdateUserProfileData, User>("/users/me", {
        method: "PATCH",
        invalidateQueries: ["/users/me"],
        onSuccess: options?.onSuccess,
    });
}

/**
 * Update user avatar
 */
export function useUpdateAvatar(options?: {
    onSuccess?: (user: User) => void;
}) {
    return useMutationApi<{ avatar: string }, User>("/users/me/avatar", {
        method: "PATCH",
        invalidateQueries: ["/users/me"],
        onSuccess: options?.onSuccess,
    });
}

/**
 * Delete current user account
 */
export function useDeleteAccount(options?: {
    onSuccess?: () => void;
}) {
    return useMutationApi<void, void>("/users/me", {
        method: "DELETE",
        onSuccess: options?.onSuccess,
    });
}

/**
 * Fetch all users (admin only)
 */
export function useAllUsers(options?: { enabled?: boolean }) {
    return useQueryApi<User[]>("/admin/users", {
        enabled: options?.enabled ?? true,
        staleTime: 30000, // 30 seconds
    });
}
