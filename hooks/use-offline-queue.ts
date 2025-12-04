// ================================
// useOfflineQueue Hook
// ================================
// Manages a queue of actions (messages) to be executed when connection is restored
// Automatically processes queued items when online

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./use-socket";
import { toast } from "sonner";

export interface QueuedAction {
  id: string;
  type: "send-message" | "edit-message" | "delete-message";
  payload: any;
  timestamp: number;
  retries?: number;
}

export interface UseOfflineQueueOptions {
  maxRetries?: number; // Max retry attempts per action (default: 3)
  retryDelay?: number; // Delay between retries in ms (default: 2000)
  onActionProcessed?: (action: QueuedAction, success: boolean) => void;
}

export interface UseOfflineQueueReturn {
  queueAction: (action: Omit<QueuedAction, "id" | "timestamp">) => void;
  queueLength: number;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
  isProcessing: boolean;
}

/**
 * Hook for managing offline action queue
 * 
 * @example
 * ```tsx
 * const { queueAction, queueLength } = useOfflineQueue();
 * 
 * // Queue a message when offline
 * if (!isConnected) {
 *   queueAction({
 *     type: "send-message",
 *     payload: { content: "Hello", roomId: "123" },
 *   });
 * }
 * ```
 */
export function useOfflineQueue(
  options: UseOfflineQueueOptions = {}
): UseOfflineQueueReturn {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    onActionProcessed,
  } = options;

  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { socket, isConnected } = useSocket({ emitUserConnect: false });
  const processingRef = useRef(false);
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Generate unique ID for queued action
   */
  const generateId = useCallback(() => {
    return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Add action to queue
   */
  const queueAction = useCallback(
    (action: Omit<QueuedAction, "id" | "timestamp">) => {
      const queuedAction: QueuedAction = {
        ...action,
        id: generateId(),
        timestamp: Date.now(),
        retries: 0,
      };

      setQueue((prev) => [...prev, queuedAction]);

      // Show notification
      toast.info("You're offline. This will be sent when you're back online.", {
        duration: 3000,
      });
    },
    [generateId]
  );

  /**
   * Process a single queued action
   */
  const processAction = useCallback(
    async (action: QueuedAction): Promise<boolean> => {
      try {
        // Import API client dynamically to avoid circular dependencies
        const { apiClient } = await import("@/lib/api-client");
        const { getSocket } = await import("@/lib/socket");

        switch (action.type) {
          case "send-message": {
            // Send message via API
            const response = await apiClient.post<{ message: any }>("/messages", {
              content: action.payload.content,
              roomId: action.payload.roomId,
              fileUrl: action.payload.fileUrl,
              fileName: action.payload.fileName,
              fileSize: action.payload.fileSize,
              fileType: action.payload.fileType,
              type: action.payload.type,
              replyToId: action.payload.replyToId,
            });

            // Emit via socket if available
            if (socket?.connected) {
              socket.emit("send-message", {
                ...action.payload,
                id: response.message.id,
                createdAt: response.message.createdAt,
              });
            }

            return true;
          }

          case "edit-message": {
            await apiClient.patch(`/messages/${action.payload.messageId}`, {
              content: action.payload.content,
            });

            // Emit via socket if available
            const socketInstance = getSocket();
            if (socketInstance?.connected) {
              socketInstance.emit("message-updated", {
                messageId: action.payload.messageId,
                content: action.payload.content,
                roomId: action.payload.roomId,
              });
            }

            return true;
          }

          case "delete-message": {
            await apiClient.delete(`/messages/${action.payload.messageId}`);

            // Emit via socket if available
            const socketInstance = getSocket();
            if (socketInstance?.connected) {
              socketInstance.emit("message-deleted", {
                messageId: action.payload.messageId,
                roomId: action.payload.roomId,
              });
            }

            return true;
          }

          default:
            console.warn("Unknown action type:", action.type);
            return false;
        }
      } catch (error) {
        console.error("Failed to process queued action:", error);
        return false;
      }
    },
    [socket]
  );

  /**
   * Process all queued actions
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0 || !isConnected) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    const actionsToProcess = [...queue];
    const successful: QueuedAction[] = [];
    const failed: QueuedAction[] = [];

    for (const action of actionsToProcess) {
      const success = await processAction(action);

      if (success) {
        successful.push(action);
        onActionProcessed?.(action, true);
      } else {
        // Increment retry count
        const updatedAction = {
          ...action,
          retries: (action.retries || 0) + 1,
        };

        if (updatedAction.retries! < maxRetries) {
          // Retry later
          failed.push(updatedAction);
          
          // Schedule retry
          const timeoutId = setTimeout(() => {
            retryTimeoutsRef.current.delete(action.id);
            processQueue();
          }, retryDelay * updatedAction.retries!);
          
          retryTimeoutsRef.current.set(action.id, timeoutId);
        } else {
          // Max retries exceeded
          failed.push(updatedAction);
          onActionProcessed?.(action, false);
          toast.error(`Failed to send after ${maxRetries} attempts. Please try again.`);
        }
      }

      // Small delay between actions to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update queue - remove successful, keep failed for retry
    setQueue((prev) => {
      const successfulIds = new Set(successful.map((a) => a.id));
      return prev.filter((a) => !successfulIds.has(a.id));
    });

    // Show notification if actions were processed
    if (successful.length > 0) {
      toast.success(`${successful.length} message(s) sent successfully`);
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [queue, isConnected, processAction, maxRetries, retryDelay, onActionProcessed]);

  /**
   * Clear all queued actions
   */
  const clearQueue = useCallback(() => {
    // Clear all retry timeouts
    retryTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    retryTimeoutsRef.current.clear();

    setQueue([]);
  }, []);

  /**
   * Auto-process queue when connection is restored
   */
  useEffect(() => {
    if (isConnected && queue.length > 0 && !processingRef.current) {
      // Small delay to ensure connection is fully established
      const timeoutId = setTimeout(() => {
        processQueue();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, queue.length, processQueue]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      retryTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      retryTimeoutsRef.current.clear();
    };
  }, []);

  return {
    queueAction,
    queueLength: queue.length,
    clearQueue,
    processQueue,
    isProcessing,
  };
}

