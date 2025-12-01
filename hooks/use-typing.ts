// ================================
// useTyping Hook
// ================================
// Centralized hook for typing indicator management
// Handles typing start/stop events via socket

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSocket } from "./use-socket";
import { useUserStore } from "@/lib/store";

export interface UseTypingOptions {
  roomId: string;
  enabled?: boolean; // Enable/disable typing (default: true)
}

export interface UseTypingReturn {
  startTyping: () => void;
  stopTyping: () => void;
  isTyping: boolean; // Current typing state
}

/**
 * Hook for managing typing indicators
 * 
 * @example
 * ```tsx
 * const { startTyping, stopTyping } = useTyping({ roomId });
 * 
 * // In input handler
 * const handleInput = (e) => {
 *   startTyping();
 *   // ... handle input
 * };
 * ```
 */
export function useTyping({ roomId, enabled = true }: UseTypingOptions): UseTypingReturn {
  const { socket, isConnected } = useSocket({ emitUserConnect: false });
  const currentUser = useUserStore((state) => state.user);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    if (!enabled || !socket || !isConnected || !currentUser) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Only emit if not already typing
    if (!isTyping) {
      socket.emit("typing", {
        roomId,
        userId: currentUser.id,
        userName: currentUser.name,
      });
      setIsTyping(true);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [enabled, socket, isConnected, currentUser, roomId, isTyping]);

  const stopTyping = useCallback(() => {
    if (!socket || !isConnected || !currentUser) return;

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Only emit if currently typing
    if (isTyping) {
      socket.emit("stop-typing", {
        roomId,
        userId: currentUser.id,
      });
      setIsTyping(false);
    }
  }, [socket, isConnected, currentUser, roomId, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  return {
    startTyping,
    stopTyping,
    isTyping,
  };
}

