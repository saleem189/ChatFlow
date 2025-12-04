// ================================
// useOptimistic Messages Hook
// ================================
// React 19 useOptimistic hook for message sending
// Provides automatic rollback on error and optimistic updates

"use client";

import { useOptimistic, useTransition } from "react";
import { useCallback } from "react";
import type { Message } from "@/lib/types/message.types";
import { createOptimisticMessage } from "@/lib/utils/message-helpers";
import { logger } from "@/lib/logger";

/**
 * Optimistic message action
 */
export interface OptimisticMessageAction {
  type: "add" | "update" | "remove";
  message: Message;
  tempId?: string; // For tracking optimistic messages
}

/**
 * Reducer for optimistic messages
 */
function optimisticReducer(
  currentMessages: Message[],
  action: OptimisticMessageAction
): Message[] {
  switch (action.type) {
    case "add":
      // Add optimistic message at the end
      return [...currentMessages, action.message];
    
    case "update":
      // Update message by ID
      return currentMessages.map((msg) =>
        msg.id === action.message.id ? action.message : msg
      );
    
    case "remove":
      // Remove message by ID
      return currentMessages.filter((msg) => msg.id !== action.message.id);
    
    default:
      return currentMessages;
  }
}

/**
 * Hook options
 */
export interface UseOptimisticMessagesOptions {
  initialMessages: Message[];
  onSend: (message: Message) => Promise<Message>; // Returns the real message from API
  onError?: (error: unknown, optimisticMessage: Message) => void;
}

/**
 * Hook return type
 */
export interface UseOptimisticMessagesReturn {
  optimisticMessages: Message[];
  sendMessage: (
    content: string,
    fileData?: {
      url: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    },
    replyTo?: {
      id: string;
      content: string;
      senderName: string;
      senderAvatar?: string | null;
    } | null,
    options?: {
      senderId: string;
      senderName: string;
      roomId: string;
      recipientOnline?: boolean;
    }
  ) => Promise<void>;
  isPending: boolean;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
}

/**
 * useOptimistic hook for messages
 * 
 * Provides optimistic updates with automatic rollback on error
 * 
 * @example
 * ```tsx
 * const { optimisticMessages, sendMessage, isPending } = useOptimisticMessages({
 *   initialMessages: messages,
 *   onSend: async (optimisticMsg) => {
 *     const realMessage = await apiClient.post('/messages', optimisticMsg);
 *     return realMessage;
 *   },
 * });
 * ```
 */
export function useOptimisticMessages(
  options: UseOptimisticMessagesOptions
): UseOptimisticMessagesReturn {
  const { initialMessages, onSend, onError } = options;
  const [isPending, startTransition] = useTransition();

  // useOptimistic hook - manages optimistic state
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    initialMessages,
    optimisticReducer
  );

  /**
   * Send message with optimistic update
   */
  const sendMessage = useCallback(
    async (
      content: string,
      fileData?: {
        url: string;
        fileName: string;
        fileSize: number;
        fileType: string;
      },
      replyTo?: {
        id: string;
        content: string;
        senderName: string;
        senderAvatar?: string | null;
      } | null,
      options?: {
        senderId: string;
        senderName: string;
        roomId: string;
        recipientOnline?: boolean;
      }
    ): Promise<void> => {
      if (!options) {
        logger.error("sendMessage: Missing required options");
        return;
      }

      const { senderId, senderName, roomId, recipientOnline = false } = options;

      // Create optimistic message
      const optimisticMessage = createOptimisticMessage(
        content,
        roomId,
        senderId,
        senderName,
        fileData,
        replyTo,
        recipientOnline
      );

      // Add optimistic message immediately (React will handle rollback on error)
      startTransition(() => {
        addOptimisticMessage({
          type: "add",
          message: optimisticMessage,
          tempId: optimisticMessage.id,
        });
      });

      try {
        // Send to server
        const realMessage = await onSend(optimisticMessage);

        // Replace optimistic message with real one
        startTransition(() => {
          addOptimisticMessage({
            type: "update",
            message: {
              ...realMessage,
              status: "sent" as const,
            },
            tempId: optimisticMessage.id,
          });
        });
      } catch (error) {
        // Error occurred - React will automatically rollback the optimistic update
        logger.error("Failed to send message", error);

        // Remove the failed optimistic message
        startTransition(() => {
          addOptimisticMessage({
            type: "remove",
            message: optimisticMessage,
            tempId: optimisticMessage.id,
          });
        });

        // Call error handler
        onError?.(error, optimisticMessage);
        
        // Re-throw so caller can handle it
        throw error;
      }
    },
    [onSend, onError, addOptimisticMessage]
  );

  /**
   * Update message optimistically
   */
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      const message = optimisticMessages.find((msg) => msg.id === messageId);
      if (!message) {
        logger.warn(`Message ${messageId} not found for update`);
        return;
      }

      startTransition(() => {
        addOptimisticMessage({
          type: "update",
          message: { ...message, ...updates },
        });
      });
    },
    [optimisticMessages, addOptimisticMessage]
  );

  /**
   * Remove message optimistically
   */
  const removeMessage = useCallback(
    (messageId: string) => {
      const message = optimisticMessages.find((msg) => msg.id === messageId);
      if (!message) {
        logger.warn(`Message ${messageId} not found for removal`);
        return;
      }

      startTransition(() => {
        addOptimisticMessage({
          type: "remove",
          message,
        });
      });
    },
    [optimisticMessages, addOptimisticMessage]
  );

  return {
    optimisticMessages,
    sendMessage,
    isPending,
    updateMessage,
    removeMessage,
  };
}

