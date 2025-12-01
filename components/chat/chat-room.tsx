// ================================
// Chat Room Component
// ================================
// Main chat room with messages, input, and real-time updates

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Hash,
  Users,
  Phone,
  Video,
  Info,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  Reply,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn, getInitials, debounce } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { RoomMenu } from "./room-menu";
import { RoomSettingsModal } from "./room-settings-modal";
import { RoomMembersPanel } from "./room-members-panel";
import { MessageTime } from "./message-time";
import { FileAttachment } from "./file-attachment";
import { MessageReactions } from "./message-reactions";
import { ReadReceipts } from "./read-receipts";
import { MessageActions } from "./message-actions";
import { MessageEditModal } from "./message-edit-modal";
import { LinkPreview } from "./link-preview";
import { getSocket, type MessagePayload } from "@/lib/socket";
import { getFirstUrl } from "@/lib/url-detector";
import { parseFormattedText, renderFormattedText } from "@/lib/text-formatter";
import { apiClient } from "@/lib/api-client";
import { useMessagesStore, useUserStore } from "@/lib/store";
import { useTyping, useMessageOperations } from "@/hooks";
import { logger } from "@/lib/logger";
import { createMessageFromPayload } from "@/lib/utils/message-helpers";

interface Message {
  id: string;
  content: string;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string | null;
  status?: "sending" | "sent" | "failed";
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
    senderAvatar?: string | null;
  } | null;
  reactions?: Record<string, Array<{ id: string; name: string; avatar: string | null }>>;
  isRead?: boolean;
  isDelivered?: boolean;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  roomId: string;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  status: string;
  lastSeen?: string;
  role?: string; // "admin" or "member" in RoomParticipant
  isOwner?: boolean;
}

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  participants: Participant[];
  initialMessages: Message[];
  roomOwnerId?: string;
  roomData?: {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    isGroup: boolean;
  };
}

export function ChatRoom({
  roomId,
  roomName,
  isGroup,
  participants,
  initialMessages,
  roomOwnerId,
  roomData,
}: ChatRoomProps) {
  // Get current user from store
  const currentUser = useUserStore((state) => state.user);
  
  // Use selector that ensures reactivity - always return array reference
  const messages = useMessagesStore((state) => {
    const roomMessages = state.messagesByRoom[roomId];
    // Return the actual array reference (or undefined) - Zustand will track this
    return roomMessages;
  });
  const { 
    setMessages, 
    addMessage, 
    updateMessage, 
    removeMessage,
    getMessages
  } = useMessagesStore();
  
  // Use specialized hooks
  const { startTyping, stopTyping } = useTyping({ roomId, enabled: !!currentUser });
  const { sendMessage, editMessage, deleteMessage, retryMessage } = useMessageOperations({
    roomId,
    participants,
    onReplyCleared: () => setReplyingTo(null),
  });
  
  const displayMessages = messages ?? initialMessages;
  
  // Debug: Log when messages change
  useEffect(() => {
    logger.log("🔄 [RENDER] Display messages updated:", {
      roomId,
      storeMessagesCount: messages?.length || 0,
      displayMessagesCount: displayMessages.length,
      hasStoreMessages: !!messages,
      storeMessageIds: messages?.map(m => m.id) || [],
      displayMessageIds: displayMessages.map(m => m.id)
    });
  }, [messages, displayMessages, roomId]);
  
  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [displayMessages.length, roomId]);
  
  useEffect(() => {
    if (initialMessages.length > 0 && !messages) {
      setMessages(roomId, initialMessages);
    }
  }, [roomId, initialMessages, messages, setMessages]);
  
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentRoomRef = useRef<string | null>(null);
  const onlineUsersRef = useRef<Set<string>>(new Set());
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
  }, [roomId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!currentUser) return;
    
    const unreadMessages = displayMessages.filter(
      (msg) => msg.senderId !== currentUser.id && !msg.isRead && !msg.isDeleted
    );

    if (unreadMessages.length > 0) {
      // Only mark messages with real IDs as read (not temp IDs)
      const messagesWithRealIds = unreadMessages.filter((msg) => {
        const isRealId = msg.id && !msg.id.startsWith("msg_") && !msg.id.startsWith("temp_");
        return isRealId;
      });
      
      messagesWithRealIds.forEach((msg) => {
        apiClient.post(`/messages/${msg.id}/read`, {}, {
          showErrorToast: false, // Don't show toast for read receipts
        }).catch((error: any) => {
          // Silently ignore 404 errors (temp IDs don't exist in DB yet)
          // Check both status code and error message
          const is404 = error?.status === 404 || 
                     error?.message?.includes("404") ||
                     error?.message?.includes("Message not found") ||
                     error?.message?.includes("not found") ||
                     String(error || '').includes("404") ||
                     String(error || '').includes("Message not found");
          
          if (!is404) {
            logger.error("Error marking message as read:", error);
          }
        });
      });

      // Update all unread messages (including temp IDs) as read in the UI
      unreadMessages.forEach((msg) => {
        updateMessage(roomId, msg.id, { isRead: true, isDelivered: true });
      });
    }
  }, [messages, currentUser?.id, roomId, updateMessage]);

  // Memoize handlers to prevent useEffect from re-running unnecessarily
  const handleReceiveMessageRef = useRef<(message: MessagePayload) => void>();
  // Track messages being processed to prevent duplicates
  const processingMessagesRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();
    
    // Ensure socket is connected
    const ensureConnected = () => {
      if (!socket.connected) {
        logger.warn("Socket not connected, attempting to connect...");
        socket.connect();
      }
    };
    
    ensureConnected();
    
    logger.log("🔌 Setting up socket listeners for room:", roomId, "Socket connected:", socket.connected, "Socket ID:", socket.id);
    
    // Verify socket connection status
    const checkConnection = () => {
      if (!socket.connected) {
        logger.error("❌ Socket is NOT connected! Messages won't be received in real-time.");
      } else {
        logger.log("✅ Socket is connected and ready");
      }
    };
    
    // Check immediately and on connect
    checkConnection();
    
    const previousRoomId = currentRoomRef.current;
    if (previousRoomId && previousRoomId !== roomId) {
      socket.emit("leave-room", previousRoomId);
      logger.log("Left previous room:", previousRoomId);
    }
    
    currentRoomRef.current = roomId;
    
    // Join room immediately when socket connects
    const joinRoomWhenConnected = () => {
      if (socket.connected) {
        logger.log("✅ Joining room:", roomId, "Socket ID:", socket.id);
        socket.emit("join-room", roomId);
        socket.emit("get-online-users");
      } else {
        logger.warn("⚠️ Socket not connected, waiting for connection before joining room...");
      }
    };
    
    const handleConnect = () => {
      logger.log("✅ Socket connected, ID:", socket.id);
      checkConnection();
      // Join room as soon as socket connects
      joinRoomWhenConnected();
    };
    
    // Join room immediately if already connected, otherwise wait for connect event
    if (socket.connected) {
      joinRoomWhenConnected();
    }
    
    // Listen for connect events (both initial and reconnects)
    socket.on("connect", handleConnect);
    socket.on("online-users", (userIds: string[]) => {
      const onlineSet = new Set(userIds);
      setOnlineUsers(onlineSet);
      onlineUsersRef.current = onlineSet; // Update ref for use in handlers
      
      // Mark pending messages as delivered if recipient is now online
      const recipientIds = participants
        .filter((p) => p.id !== currentUser.id)
        .map((p) => p.id);
      
      const currentMessages = getMessages(roomId);
      currentMessages.forEach((msg) => {
        if (
          msg.senderId === currentUser.id &&
          !msg.isDelivered &&
          !msg.isRead &&
          recipientIds.some((id) => userIds.includes(id))
        ) {
          updateMessage(roomId, msg.id, { isDelivered: true });
        }
      });
    });
    
    socket.on("user-online", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        onlineUsersRef.current = next; // Update ref
        return next;
      });
      
      // Mark pending messages as delivered if this user is the recipient
      const recipientIds = participants
        .filter((p) => p.id !== currentUser.id)
        .map((p) => p.id);
      
      if (recipientIds.includes(userId)) {
        const currentMessages = getMessages(roomId);
        currentMessages.forEach((msg) => {
          if (
            msg.senderId === currentUser.id &&
            !msg.isDelivered &&
            !msg.isRead
          ) {
            updateMessage(roomId, msg.id, { isDelivered: true });
          }
        });
      }
    });
    
    socket.on("user-offline", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        onlineUsersRef.current = next; // Update ref
        return next;
      });
    });

    const clearTypingTimeout = (userId: string) => {
      const timeout = typingTimeoutsRef.current.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutsRef.current.delete(userId);
      }
    };

    const setTypingTimeout = (userId: string, callback: () => void) => {
      clearTypingTimeout(userId);
      const timeout = setTimeout(callback, 5000);
      typingTimeoutsRef.current.set(userId, timeout);
    };

    const handleReceiveMessage = (message: MessagePayload) => {
      // Log client receive to message flow logger (via API call)
      if (currentUser?.id) {
        fetch('/api/debug/log-message-receive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: message.id,
            roomId: message.roomId,
            senderId: message.senderId,
            receiverId: currentUser.id,
            socketId: getSocket().id,
          }),
        }).catch(() => {
          // Ignore errors in logging
        });
      }
      
      logger.log("🔔 Received socket message:", { 
        roomId: message.roomId, 
        currentRoomId: roomId,
        senderId: message.senderId,
        currentUserId: currentUser.id,
        messageId: message.id,
        content: message.content?.substring(0, 50)
      });
      
      // Only process messages for current room
      if (message.roomId !== roomId) {
        logger.log("⚠️ Message for different room, ignoring");
        return;
      }
      
      // Prevent duplicate processing - check if this message is already being processed
      const messageKey = `${message.id}_${message.roomId}`;
      if (processingMessagesRef.current.has(messageKey)) {
        logger.log("⚠️ Message already being processed, skipping duplicate:", message.id);
        return;
      }
      
      // Mark as processing
      processingMessagesRef.current.add(messageKey);
      
      // Clean up after processing (with a delay to catch rapid duplicates)
      setTimeout(() => {
        processingMessagesRef.current.delete(messageKey);
      }, 1000);
      
      // Handle sender's own messages from API broadcast
      // When API broadcasts, it includes the sender, so we receive our own messages
      // We should update the optimistic message with the real ID if it's a new message
      if (message.senderId === currentUser.id) {
        const existingMessages = getMessages(roomId);
        // Check if this is a real ID (from API) that should replace an optimistic message
        // Real IDs from database are longer and don't start with "msg_" or "temp_"
        const isRealId = message.id && !message.id.startsWith("msg_") && !message.id.startsWith("temp_");
        
        if (isRealId) {
          // This is a real message from API broadcast - find and update optimistic message
          const optimisticMsg = existingMessages.find((msg) => {
            // Match by content, sender, and timestamp (within 5 seconds)
            if (msg.senderId !== currentUser.id) return false;
            if (msg.content !== message.content) return false;
            if (msg.id === message.id) return false; // Already has real ID
            if (msg.status !== "sending" && msg.status !== "sent") return false;
            
            const timeDiff = Math.abs(
              new Date(msg.createdAt).getTime() - 
              new Date(message.createdAt || new Date().toISOString()).getTime()
            );
            return timeDiff < 5000; // 5 seconds
          });
          
          if (optimisticMsg) {
            // Replace optimistic message with real message
            logger.log("🔄 Updating optimistic message with real ID:", optimisticMsg.id, "->", message.id);
            updateMessage(roomId, optimisticMsg.id, {
              ...createMessageFromPayload(message, false),
              status: "sent" as const,
            });
            return;
          }
          
          // Check if message with real ID already exists
          const existingByRealId = existingMessages.find((msg) => msg.id === message.id);
          if (existingByRealId) {
            // Already exists, just ensure it's marked as sent
            logger.log("✅ Message with real ID already exists:", message.id);
            return;
          }
        }
        
        // If it's a temp ID or we can't match it, ignore it (optimistic message will be updated by API response)
        logger.log("⚠️ Received own message via socket (temp ID or unmatched):", message.id);
        return;
      }
      
      // This is a message from another user - add it immediately
      const recipientIds = participants
        .filter((p) => p.id !== currentUser.id)
        .map((p) => p.id);
      const recipientOnline = recipientIds.some((id) => onlineUsersRef.current.has(id));

      const newMessage = createMessageFromPayload(message, recipientOnline);
      
      // Check if message already exists (shouldn't happen, but be safe)
      const existingMessages = getMessages(roomId);
      const existingIndex = existingMessages.findIndex((msg) => msg.id === newMessage.id);
      
      if (existingIndex === -1) {
        logger.log("✅ Adding new message from other user:", {
          messageId: newMessage.id,
          content: newMessage.content?.substring(0, 50),
          roomId,
          senderId: newMessage.senderId,
          currentMessagesCount: existingMessages.length
        });
        
        // Add message to store
        addMessage(roomId, newMessage);
        
        // Verify it was added
        const afterAdd = getMessages(roomId);
        logger.log("📊 Store after add:", {
          beforeCount: existingMessages.length,
          afterCount: afterAdd.length,
          messageAdded: afterAdd.some(m => m.id === newMessage.id)
        });
        
        // Mark as delivered since we received it
        socket.emit("message-delivered", {
          messageId: newMessage.id,
          roomId: roomId,
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        logger.log("⚠️ Message already exists, updating:", newMessage.id);
        const existing = existingMessages[existingIndex];
        if (!existing.replyTo && newMessage.replyTo) {
          updateMessage(roomId, newMessage.id, {
            replyTo: newMessage.replyTo,
            replyToId: newMessage.replyToId,
          });
        }
      }
      
      // Mark message as read and clear typing indicator
      // Only mark as read if it's a real ID (not temp ID) - temp IDs don't exist in DB yet
      const isRealId = newMessage.id && !newMessage.id.startsWith("msg_") && !newMessage.id.startsWith("temp_");
      if (isRealId) {
        apiClient.post(`/messages/${newMessage.id}/read`, {}, {
          showErrorToast: false,
        }).then(() => {
          socket.emit("message-read", {
            messageId: newMessage.id,
            userId: currentUser.id,
            roomId: roomId,
          });
        }).catch((error: any) => {
          // Silently ignore 404 errors (temp IDs don't exist in DB yet)
          // Check both status code and error message
          const is404 = error?.status === 404 || 
                     error?.message?.includes("404") ||
                     error?.message?.includes("Message not found") ||
                     error?.message?.includes("not found") ||
                     String(error || '').includes("404") ||
                     String(error || '').includes("Message not found");
          
          if (!is404) {
            logger.error("Error marking message as read:", error);
          }
        });
      } else {
        // For temp IDs, wait for the real ID from API broadcast, then mark as read
        // No need to log - this is expected behavior
      }

      clearTypingTimeout(message.senderId);
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(message.senderId);
        return next;
      });
    };

    const handleUserTyping = ({
      roomId: typingRoomId,
      userId,
      userName,
    }: {
      roomId: string;
      userId: string;
      userName: string;
    }) => {
      if (typingRoomId === roomId && userId !== currentUser.id) {
        setTypingUsers((prev) => new Map(prev).set(userId, userName));
        setTypingTimeout(userId, () => {
          logger.log("Auto-clearing stuck typing indicator for user:", userId);
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        });
      }
    };

    const handleUserStopTyping = ({
      roomId: typingRoomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      if (typingRoomId === roomId) {
        clearTypingTimeout(userId);
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    // Handle message updated (edit)
    const handleMessageUpdated = ({ messageId, content, updatedAt }: { messageId: string; content: string; updatedAt: string }) => {
      updateMessage(roomId, messageId, { content, isEdited: true });
    };

    // Handle message deleted
    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      updateMessage(roomId, messageId, { 
        isDeleted: true, 
        content: "[This message was deleted]" 
      });
    };

    const handleReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: Record<string, Array<{ id: string; name: string; avatar: string | null }>> }) => {
      updateMessage(roomId, messageId, { reactions });
    };

    const handleMessageReadUpdate = ({ messageId, userId, roomId: eventRoomId }: { messageId: string; userId: string; roomId: string; readAt: string }) => {
      if (eventRoomId !== roomId) return;
      
      // Update message read status
      const currentMessages = getMessages(roomId);
      const message = currentMessages.find((msg) => msg.id === messageId);
      
      if (message && message.senderId === currentUser.id) {
        // This is our message that was read by someone else
        // Update isRead status
        updateMessage(roomId, messageId, { isRead: true });
      }
    };

    const handleMessageDeliveredUpdate = ({ messageId, roomId: eventRoomId }: { messageId: string; roomId: string }) => {
      if (eventRoomId !== roomId) return;
      
      // Update message delivery status
      const currentMessages = getMessages(roomId);
      const message = currentMessages.find((msg) => msg.id === messageId);
      
      if (message && message.senderId === currentUser.id && !message.isDelivered) {
        // This is our message that was delivered
        updateMessage(roomId, messageId, { isDelivered: true });
      }
    };

    // Wrap handleReceiveMessage with debug logging
    const wrappedHandleReceiveMessage = (message: MessagePayload) => {
      logger.log("🎯 [SOCKET EVENT] receive-message handler CALLED:", {
        messageId: message.id,
        roomId: message.roomId,
        currentRoomId: roomId,
        senderId: message.senderId,
        currentUserId: currentUser.id,
        socketId: socket.id,
        socketConnected: socket.connected,
        content: message.content?.substring(0, 50)
      });
      handleReceiveMessage(message);
    };
    
    logger.log("🔌 Registering socket listeners for room:", roomId, "Socket ID:", socket.id);
    
    // CRITICAL: Remove any existing listeners first to avoid duplicates
    socket.removeAllListeners("receive-message");
    
    // Register the handler
    socket.on("receive-message", wrappedHandleReceiveMessage);
    
    // Verify handler is registered (Socket.io doesn't have listenerCount, so we just log)
    logger.log(`✅ Handler registered for receive-message event`);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("message-updated", handleMessageUpdated);
    socket.on("message-deleted", handleMessageDeleted);
    socket.on("reaction-updated", handleReactionUpdated);
    socket.on("message-read-update", handleMessageReadUpdate);
    socket.on("message-delivered-update", handleMessageDeliveredUpdate);
    
    // Verify listener is registered
    logger.log("✅ Socket listeners registered. Socket connected:", socket.connected, "Socket ID:", socket.id);
    
    // Test: Manually check if we're in the room (can't directly check, but we can verify socket is connected)
    if (socket.connected) {
      logger.log("✅ Socket is connected and ready to receive messages");
    } else {
      logger.error("❌ Socket is NOT connected! Messages won't be received.");
    }

    // Cleanup
    return () => {
      logger.log("🧹 Cleaning up socket listeners for room:", roomId);
      socket.emit("leave-room", roomId);
      socket.off("connect", handleConnect);
      // Remove receive-message handler - use removeAllListeners to be sure
      socket.removeAllListeners("receive-message");
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("message-updated", handleMessageUpdated);
      socket.off("message-deleted", handleMessageDeleted);
      socket.off("reaction-updated", handleReactionUpdated);
      socket.off("message-read-update", handleMessageReadUpdate);
      socket.off("message-delivered-update", handleMessageDeliveredUpdate);
      
      // Clear processing messages set
      processingMessagesRef.current.clear();
      
      // Cleanup typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
    };
  }, [roomId, currentUser?.id]); // FIXED: Removed participants, getMessages, updateMessage, addMessage from dependencies

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Early return after ALL hooks are called
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const currentParticipant = participants.find((p) => p.id === currentUser.id);
  const isRoomAdmin = 
    roomOwnerId === currentUser.id || // Owner is always admin
    currentParticipant?.role === "admin" || // Participant with admin role
    currentParticipant?.isOwner; // Explicit owner flag

  const handleSendMessage = async (
    content: string,
    fileData?: {
      url: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    }
  ) => {
    await sendMessage(
      content,
      fileData,
      replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderName: replyingTo.senderName,
        senderAvatar: replyingTo.senderAvatar || null,
      } : null
    );
  };

  // Handle message edit
  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessage({ id: messageId, content: currentContent });
  };

  // Handle reply to message
  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message);
    // Scroll to message input
    setTimeout(() => {
      document.querySelector('textarea')?.focus();
    }, 100);
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message,
    });
  };

  // Long-press handler for mobile
  const createLongPressHandlers = (message: Message) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isLongPress = false;

    const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
      isLongPress = false;
      timeoutId = setTimeout(() => {
        isLongPress = true;
        handleReplyToMessage(message);
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500);
    };

    const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return {
      onTouchStart: handleStart,
      onTouchEnd: handleEnd,
      onMouseDown: handleStart,
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
    };
  };

  // Handle retry failed message (wrapped to use hook)
  const handleRetryMessage = async (message: Message) => {
    await retryMessage(message);
  };

  // Handle message save after edit (wrapped to use hook)
  const handleSaveEdit = async (messageId: string, newContent: string) => {
    await editMessage(messageId, newContent);
    setEditingMessage(null);
  };

  // Handle message delete (wrapped to use hook)
  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const handleTyping = (isTyping: boolean) => {
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Get online participants
  const onlineParticipants = participants.filter(
    (p) => p.id !== currentUser.id && p.status === "online"
  );

  const groupedMessages = displayMessages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3">
          {/* Room Avatar */}
          <Avatar className={cn(
            "w-10 h-10",
            isGroup
              ? "bg-gradient-to-br from-accent-400 to-pink-500"
              : "bg-gradient-to-br from-primary-400 to-blue-500"
          )}>
            <AvatarImage src={roomData?.avatar || undefined} alt={roomName} />
            <AvatarFallback className={cn(
              "text-white font-semibold",
              isGroup
                ? "bg-gradient-to-br from-accent-400 to-pink-500"
                : "bg-gradient-to-br from-primary-400 to-blue-500"
            )}>
              {isGroup ? <Hash className="w-5 h-5" /> : getInitials(roomName)}
            </AvatarFallback>
          </Avatar>

          {/* Room Info */}
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-white">
              {roomName}
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {isGroup
                ? `${participants.length} members`
                : onlineParticipants.length > 0
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
              showSearch
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            )}
            title="Search messages"
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => toast.info("Voice call feature - Coming soon!")}
            className="w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            title="Voice call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => toast.info("Video call feature - Coming soon!")}
            className="w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            title="Video call"
          >
            <Video className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
              showInfo
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            )}
          >
            <Info className="w-5 h-5" />
          </button>
          <RoomMenu 
            roomId={roomId} 
            isGroup={isGroup}
            isRoomAdmin={isRoomAdmin}
            onViewMembers={() => setShowInfo(true)}
            onRoomSettings={() => setShowSettings(true)}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          {/* Messages grouped by date */}
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <Separator className="flex-1" />
                <div className="px-3 py-1 rounded-full bg-surface-200/50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400 font-medium">
                  {date === new Date().toLocaleDateString()
                    ? "Today"
                    : date ===
                      new Date(
                        Date.now() - 86400000
                      ).toLocaleDateString()
                    ? "Yesterday"
                    : date}
                </div>
                <Separator className="flex-1" />
              </div>

              {/* Messages */}
              <div className="space-y-1.5">
                {dateMessages.map((message, index) => {
                  const isSent = message.senderId === currentUser.id;
                  const showAvatar =
                    !isSent &&
                    (index === 0 ||
                      dateMessages[index - 1]?.senderId !== message.senderId);
                  const showName = isGroup && !isSent && showAvatar;
                  const isConsecutive = index > 0 && dateMessages[index - 1]?.senderId === message.senderId;
                  const spacing = isConsecutive ? "mt-0.5" : "mt-3";

                  return (
                    <motion.div
                      key={message.id}
                      data-message-id={message.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        duration: 0.2,
                        ease: "easeOut"
                      }}
                      className={cn(
                        "flex items-end gap-2.5",
                        isSent ? "justify-end" : "justify-start",
                        spacing
                      )}
                    >
                      {/* Avatar (for received messages) */}
                    {!isSent && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="w-8 h-8 bg-gradient-to-br from-primary-400 to-blue-500">
                            <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName} />
                            <AvatarFallback className="bg-gradient-to-br from-primary-400 to-blue-500 text-white text-xs font-semibold">
                              {getInitials(message.senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                      {/* Message Bubble */}
                      <div className={cn("max-w-[70%] flex flex-col", isSent ? "items-end order-1" : "items-start")}>
                        {/* Sender name (for group chats) */}
                        {showName && (
                          <p className="text-xs text-surface-500 dark:text-surface-400 mb-1.5 ml-1 font-medium">
                            {message.senderName}
                          </p>
                        )}

                        {/* Bubble Container */}
                        <div 
                          className="relative group"
                          onContextMenu={(e) => handleContextMenu(e, message)}
                          {...createLongPressHandlers(message)}
                        >
                          {/* Bubble */}
                          <div
                            className={cn(
                              "relative rounded-2xl transition-all duration-200",
                              // Make relative for absolute positioning of timestamp on images/videos
                              message.fileUrl && (message.fileType?.startsWith("image/") || message.fileType?.startsWith("video/"))
                                ? "p-1.5"
                                : message.fileType?.startsWith("audio/")
                                ? "p-2"
                                : "px-4 py-2.5",
                              isSent
                                ? "bg-primary-600 text-white rounded-br-md shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/35"
                                : "bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-bl-md border border-surface-200 dark:border-surface-700 shadow-md hover:shadow-lg hover:border-surface-300 dark:hover:border-surface-600"
                            )}
                          >
                          {/* Reply Button - Show on hover */}
                          {!message.isDeleted && (
                            <button
                              onClick={() => handleReplyToMessage(message)}
                              className={cn(
                                "absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10",
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                "bg-white/90 dark:bg-surface-800/90 backdrop-blur-sm",
                                "shadow-md border border-surface-200 dark:border-surface-700",
                                "hover:bg-white dark:hover:bg-surface-800",
                                "text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400",
                                "hover:scale-110 active:scale-95"
                              )}
                              title="Reply"
                            >
                              <Reply className="w-4 h-4" />
                            </button>
                          )}

                          {/* Message Actions (Edit/Delete) - Show on hover */}
                          {isSent && !message.isDeleted && (
                            <div className={cn(
                              "absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                            )}>
                              <MessageActions
                                messageId={message.id}
                                currentContent={message.content}
                                isSent={isSent}
                                isDeleted={message.isDeleted || false}
                                onEdit={handleEditMessage}
                                onDelete={handleDeleteMessage}
                                onUpdated={() => {
                                  // Refetch messages or update state
                                  window.location.reload();
                                }}
                              />
                            </div>
                          )}

                          {/* Reply Preview */}
                          {message.replyTo && (
                            <div className={cn(
                              "mb-2.5 pl-3 pr-2 py-1.5 border-l-4 rounded-r-md cursor-pointer hover:opacity-90 transition-opacity",
                              isSent
                                ? "border-primary-200 bg-primary-500/20 backdrop-blur-sm"
                                : "border-primary-400 dark:border-primary-500 bg-surface-100 dark:bg-surface-800/70"
                            )}
                            onClick={() => {
                              // Scroll to original message
                              const originalMessage = document.querySelector(`[data-message-id="${message.replyTo?.id}"]`);
                              if (originalMessage) {
                                originalMessage.scrollIntoView({ behavior: "smooth", block: "center" });
                                originalMessage.classList.add("ring-2", "ring-primary-500", "ring-offset-2");
                                setTimeout(() => {
                                  originalMessage.classList.remove("ring-2", "ring-primary-500", "ring-offset-2");
                                }, 2000);
                              }
                            }}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Reply className={cn(
                                  "w-3 h-3",
                                  isSent ? "text-primary-100" : "text-primary-600 dark:text-primary-400"
                                )} />
                                <p className={cn(
                                  "text-xs font-semibold",
                                  isSent ? "text-primary-100" : "text-primary-700 dark:text-primary-300"
                                )}>
                                  {message.replyTo.senderName}
                                </p>
                              </div>
                              <p className={cn(
                                "text-xs line-clamp-2 leading-tight",
                                isSent ? "text-primary-50/90" : "text-surface-700 dark:text-surface-300"
                              )}>
                                {message.replyTo.content || "Media"}
                              </p>
                            </div>
                          )}

                          {/* File Attachment */}
                          {message.fileUrl && (
                            <div className={cn(
                              message.fileType?.startsWith("image/") || message.fileType?.startsWith("video/") || message.fileType?.startsWith("audio/")
                                ? "mb-0"
                                : "mb-2"
                            )}>
                              <FileAttachment
                                fileUrl={message.fileUrl}
                                fileName={message.fileName || "File"}
                                fileSize={message.fileSize || 0}
                                fileType={message.fileType || "application/octet-stream"}
                                isSent={isSent}
                              />
                            </div>
                          )}

                          {/* Message Content */}
                          {!message.isDeleted && message.content && message.content.trim().length > 0 && (
                            <div className={cn(
                              message.fileUrl && (message.fileType?.startsWith("image/") || message.fileType?.startsWith("video/") || message.fileType?.startsWith("audio/"))
                                ? "px-3 pb-2 pt-1.5"
                                : message.replyTo ? "mt-0" : ""
                            )}>
                              <div className={cn(
                                "text-sm leading-relaxed whitespace-pre-wrap break-words"
                              )}>
                                {renderFormattedText(
                                  parseFormattedText(message.content),
                                  isSent ? "text-white" : "text-surface-900 dark:text-white"
                                )}
                                {message.isEdited && (
                                  <span className={cn(
                                    "text-[10px] ml-1.5 italic opacity-75",
                                    isSent ? "text-primary-100" : "text-surface-500 dark:text-surface-400"
                                  )}>
                                    (edited)
                                  </span>
                                )}
                              </div>
                              
                              {/* Link Preview */}
                              {getFirstUrl(message.content) && (
                                <LinkPreview
                                  url={getFirstUrl(message.content)!}
                                  isSent={isSent}
                                />
                              )}
                            </div>
                          )}

                          {/* Deleted Message */}
                          {message.isDeleted && (
                            <p className={cn(
                              "text-sm italic opacity-70",
                              isSent ? "text-primary-100" : "text-surface-500 dark:text-surface-400"
                            )}>
                              This message was deleted
                            </p>
                          )}

                          {/* Timestamp and Read Receipt - Inside bubble for text, overlay for media */}
                          <div className={cn(
                            "flex items-center gap-1.5",
                            message.fileUrl && (message.fileType?.startsWith("image/") || message.fileType?.startsWith("video/"))
                              ? "absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white"
                              : "mt-1.5"
                          )}>
                            <p
                              className={cn(
                                "text-[10px] font-medium",
                                !message.fileUrl || (!message.fileType?.startsWith("image/") && !message.fileType?.startsWith("video/") && !message.fileType?.startsWith("audio/"))
                                  ? isSent
                                    ? "text-primary-100/90"
                                    : "text-surface-500 dark:text-surface-400"
                                  : "text-white/90"
                              )}
                            >
                              <MessageTime timestamp={message.createdAt} />
                            </p>
                            {isSent && (
                              <ReadReceipts
                                isSent={isSent}
                                isRead={message.isRead || false}
                                isDelivered={message.isDelivered || false}
                              />
                            )}
                          </div>
                        </div>
                        </div>

                        {/* Message Reactions - Positioned below bubble */}
                        {!message.isDeleted && (
                          <div className={cn(
                            "mt-1.5",
                            isSent ? "flex justify-end" : "flex justify-start"
                          )}>
                            <MessageReactions
                              messageId={message.id}
                              roomId={roomId}
                              reactions={message.reactions || {}}
                              currentUserId={currentUser.id}
                              isSent={isSent}
                              onReactionChange={async () => {
                                // Fetch updated reactions
                                try {
                                  const data = await apiClient.get<{ reactions: any }>(`/messages/${message.id}/reactions`, {
                                    showErrorToast: false, // Don't show toast for reactions
                                  });
                                  updateMessage(roomId, message.id, { reactions: data.reactions });
                                } catch (error) {
                                  logger.error("Error fetching reactions:", error);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <TypingIndicator users={Array.from(typingUsers.values())} />
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="w-72 border-l border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-y-auto">
            <div className="p-4">
              {/* Room Info */}
              <div className="text-center mb-6">
                <div
                  className={cn(
                    "w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold",
                    isGroup
                      ? "bg-gradient-to-br from-accent-400 to-pink-500"
                      : "bg-gradient-to-br from-primary-400 to-blue-500"
                  )}
                >
                  {isGroup ? <Hash className="w-10 h-10" /> : getInitials(roomName)}
                </div>
                <h3 className="font-semibold text-lg text-surface-900 dark:text-white">
                  {roomName}
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {isGroup ? "Group Chat" : "Direct Message"}
                </p>
              </div>

              {/* Room Settings Button (Room Admins only) */}
              {isRoomAdmin && isGroup && roomData && (
                <div className="mb-4">
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="default"
                    size="sm"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Room Settings
                  </Button>
                </div>
              )}

              {/* Members Panel */}
              <RoomMembersPanel
                roomId={roomId}
                participants={participants}
                currentUserId={currentUser.id}
                isRoomAdmin={isRoomAdmin || false}
                isGroup={isGroup}
                onUpdate={() => {
                  // Refresh the page to get updated data
                  window.location.reload();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage} 
        onTyping={handleTyping}
        replyTo={replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
        } : null}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-surface-800 rounded-lg shadow-xl border border-surface-200 dark:border-surface-700 py-1 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleReplyToMessage(contextMenu.message);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>
          {contextMenu.message.senderId === currentUser.id && !contextMenu.message.isDeleted && (
            <>
              <button
                onClick={() => {
                  handleEditMessage(contextMenu.message.id, contextMenu.message.content);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  handleDeleteMessage(contextMenu.message.id);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Search Dialog */}
      {showSearch && (
        <CommandDialog open={showSearch} onOpenChange={setShowSearch}>
          <CommandInput placeholder="Search messages..." value={searchQuery} onValueChange={setSearchQuery} />
          <CommandList>
            <CommandEmpty>No messages found.</CommandEmpty>
            <CommandGroup heading="Messages">
              {messages
                .filter((msg) => 
                  !msg.isDeleted && 
                  msg.content.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((msg) => (
                  <CommandItem
                    key={msg.id}
                    onSelect={() => {
                      // Scroll to message
                      const element = document.querySelector(`[data-message-id="${msg.id}"]`);
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "center" });
                        element.classList.add("ring-2", "ring-primary-500");
                        setTimeout(() => {
                          element.classList.remove("ring-2", "ring-primary-500");
                        }, 2000);
                      }
                      setShowSearch(false);
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{msg.senderName}</span>
                        <span className="text-xs text-surface-500">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-400 truncate">
                        {msg.content}
                      </p>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      )}

      {/* Room Settings Modal */}
      {roomData && (
        <RoomSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          room={roomData}
          onUpdate={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Message Edit Modal */}
      {editingMessage && (
        <MessageEditModal
          isOpen={!!editingMessage}
          onClose={() => setEditingMessage(null)}
          messageId={editingMessage.id}
          currentContent={editingMessage.content}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

