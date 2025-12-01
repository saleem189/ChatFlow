// ================================
// Centralized Online Users Hook
// ================================
// Single source of truth for online users tracking across the application

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "./use-socket";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface UseOnlineUsersOptions {
  /**
   * Whether to automatically connect the current user
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * Whether to emit user-connect on mount
   * @default true
   */
  emitUserConnect?: boolean;
}

interface UseOnlineUsersReturn {
  /**
   * Set of online user IDs
   */
  onlineUserIds: Set<string>;
  
  /**
   * Array of online user IDs (for easier iteration)
   */
  onlineUserIdsArray: string[];
  
  /**
   * Count of online users
   */
  onlineCount: number;
  
  /**
   * Whether the socket is connected
   */
  isConnected: boolean;
  
  /**
   * Socket instance (for advanced usage)
   */
  socket: ReturnType<typeof useSocket>['socket'] | null;
  
  /**
   * Manually refresh the online users list
   */
  refresh: () => void;
}

/**
 * Centralized hook for tracking online users
 * 
 * @example
 * ```tsx
 * const { onlineCount, onlineUserIds } = useOnlineUsers();
 * 
 * // Check if a specific user is online
 * const isUserOnline = onlineUserIds.has(userId);
 * ```
 */
export function useOnlineUsers(
  options: UseOnlineUsersOptions = {}
): UseOnlineUsersReturn {
  const {
    autoConnect = true,
    emitUserConnect = true,
  } = options;

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const hasRequestedOnlineUsers = useRef(false);
  
  // Use centralized socket hook
  const { socket, isConnected } = useSocket({
    autoConnect,
    emitUserConnect,
  });

  useEffect(() => {
    if (!socket) return;

    // Get initial online users list when connected (only once per connection)
    if (isConnected && !hasRequestedOnlineUsers.current) {
      socket.emit("get-online-users");
      hasRequestedOnlineUsers.current = true;
    }

    // Reset flag when disconnected
    if (!isConnected) {
      hasRequestedOnlineUsers.current = false;
    }

    // Listen for online users list
    const handleOnlineUsers = (userIds: string[]) => {
      setOnlineUserIds(new Set(userIds));
    };

    // Listen for user coming online
    const handleUserOnline = (userId: string) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    };

    // Listen for user going offline
    const handleUserOffline = (userId: string) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on("online-users", handleOnlineUsers);
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);

    return () => {
      socket.off("online-users", handleOnlineUsers);
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
    };
  }, [socket, isConnected]);

  const refresh = useCallback(() => {
    if (socket?.connected) {
      socket.emit("get-online-users");
    }
  }, [socket]);

  return {
    onlineUserIds,
    onlineUserIdsArray: Array.from(onlineUserIds),
    onlineCount: onlineUserIds.size,
    isConnected,
    socket,
    refresh,
  };
}

