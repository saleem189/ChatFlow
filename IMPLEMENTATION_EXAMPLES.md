# Implementation Examples

This document provides practical code examples for implementing the recommended design patterns in the chat application.

## 📋 Table of Contents
1. [Repository Pattern Example](#repository-pattern-example)
2. [Service Layer Example](#service-layer-example)
3. [Custom Hook Example](#custom-hook-example)
4. [Error Handling Example](#error-handling-example)
5. [API Route Refactoring](#api-route-refactoring)

---

## 1. Repository Pattern Example

### Base Repository

```typescript
// lib/repositories/base.repository.ts
import { PrismaClient, Prisma } from '@prisma/client';

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected prisma: PrismaClient;
  protected model: string;

  constructor(prisma: PrismaClient, model: string) {
    this.prisma = prisma;
    this.model = model;
  }

  async findById(id: string): Promise<T | null> {
    return (this.prisma[this.model] as any).findUnique({
      where: { id },
    });
  }

  async findMany(where?: any, options?: { take?: number; skip?: number; orderBy?: any }): Promise<T[]> {
    return (this.prisma[this.model] as any).findMany({
      where,
      ...options,
    });
  }

  async create(data: CreateInput): Promise<T> {
    return (this.prisma[this.model] as any).create({
      data,
    });
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    return (this.prisma[this.model] as any).update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    return (this.prisma[this.model] as any).delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return (this.prisma[this.model] as any).count({
      where,
    });
  }
}
```

### Message Repository

```typescript
// lib/repositories/message.repository.ts
import { PrismaClient, Message, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: {
    sender: { select: { id: true; name: true; avatar: true } };
    replyTo: {
      include: {
        sender: { select: { id: true; name: true; avatar: true } };
      };
    };
    reactions: {
      include: {
        user: { select: { id: true; name: true; avatar: true } };
      };
    };
    readReceipts: true;
  };
}>;

export class MessageRepository extends BaseRepository<
  Message,
  Prisma.MessageCreateInput,
  Prisma.MessageUpdateInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'message');
  }

  async findByRoomId(
    roomId: string,
    options?: { limit?: number; cursor?: string; includeDeleted?: boolean }
  ): Promise<MessageWithRelations[]> {
    const { limit = 50, cursor, includeDeleted = false } = options || {};

    return this.prisma.message.findMany({
      where: {
        roomId,
        isDeleted: includeDeleted ? undefined : false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        readReceipts: true,
      },
    });
  }

  async search(roomId: string, query: string, limit: number = 20): Promise<MessageWithRelations[]> {
    return this.prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
        content: {
          search: query,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        readReceipts: true,
      },
    });
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      create: {
        messageId,
        userId,
      },
      update: {},
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
      create: {
        messageId,
        userId,
        emoji,
      },
      update: {},
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji,
      },
    });
  }
}
```

---

## 2. Service Layer Example

### Message Service

```typescript
// lib/services/message.service.ts
import { MessageRepository, MessageWithRelations } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { SocketService } from '@/lib/socket/socket.service';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { messageSchema } from '@/lib/validations';

export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository,
    private socketService: SocketService
  ) {}

  async sendMessage(
    userId: string,
    roomId: string,
    content: string,
    options?: {
      replyToId?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      type?: 'text' | 'image' | 'video' | 'file' | 'audio';
    }
  ): Promise<MessageWithRelations> {
    // 1. Validate input
    const validationResult = messageSchema.safeParse({
      content,
      roomId,
      fileUrl: options?.fileUrl,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
      fileType: options?.fileType,
      type: options?.type || 'text',
      replyToId: options?.replyToId,
    });

    if (!validationResult.success) {
      throw new ValidationError('Invalid message data', validationResult.error.errors);
    }

    // 2. Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('User is not a participant in this room');
    }

    // 3. Validate reply message if replying
    if (options?.replyToId) {
      const replyTo = await this.messageRepo.findById(options.replyToId);
      if (!replyTo) {
        throw new NotFoundError('Reply message not found');
      }
      if (replyTo.roomId !== roomId) {
        throw new ValidationError('Reply message must be in the same room');
      }
    }

    // 4. Determine message type
    const messageType = options?.type || 
      (options?.fileType?.startsWith('image/') ? 'image' :
       options?.fileType?.startsWith('video/') ? 'video' :
       options?.fileType?.startsWith('audio/') ? 'audio' :
       options?.fileUrl ? 'file' : 'text');

    // 5. Create message
    const message = await this.messageRepo.create({
      content: content || '',
      type: messageType,
      fileUrl: options?.fileUrl || null,
      fileName: options?.fileName || null,
      fileSize: options?.fileSize || null,
      fileType: options?.fileType || null,
      senderId: userId,
      roomId,
      replyToId: options?.replyToId || null,
    });

    // 6. Update room timestamp
    await this.roomRepo.update(roomId, { updatedAt: new Date() });

    // 7. Fetch full message with relations
    const fullMessage = await this.messageRepo.findById(message.id) as MessageWithRelations;

    // 8. Broadcast via socket
    await this.socketService.broadcastMessage(roomId, fullMessage);

    return fullMessage;
  }

  async getMessages(
    roomId: string,
    userId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ messages: MessageWithRelations[]; hasMore: boolean; nextCursor?: string }> {
    // 1. Check access
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    // 2. Fetch messages
    const messages = await this.messageRepo.findByRoomId(roomId, {
      limit: options?.limit || 50,
      cursor: options?.cursor,
    });

    // 3. Check if there are more messages
    const hasMore = messages.length > (options?.limit || 50);
    const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1]?.id : undefined;

    return {
      messages: messagesToReturn.reverse(), // Reverse to show oldest first
      hasMore,
      nextCursor,
    };
  }

  async searchMessages(
    roomId: string,
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<MessageWithRelations[]> {
    // 1. Check access
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    // 2. Validate query
    if (!query || query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    // 3. Search messages
    return this.messageRepo.search(roomId, query, limit);
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(message.roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    await this.messageRepo.markAsRead(messageId, userId);
  }

  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(message.roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    await this.messageRepo.addReaction(messageId, userId, emoji);

    // Broadcast reaction update
    await this.socketService.broadcastReactionUpdate(message.roomId, messageId);
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(message.roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    await this.messageRepo.removeReaction(messageId, userId, emoji);

    // Broadcast reaction update
    await this.socketService.broadcastReactionUpdate(message.roomId, messageId);
  }
}
```

---

## 3. Custom Hook Example

### useMessages Hook

```typescript
// hooks/use-messages.ts
import { useState, useEffect, useCallback } from 'react';
import { MessageWithRelations } from '@/lib/repositories/message.repository';
import { useSocket } from './use-socket';
import { toast } from 'sonner';

interface UseMessagesOptions {
  roomId: string;
  userId: string;
  initialMessages?: MessageWithRelations[];
  limit?: number;
}

interface UseMessagesReturn {
  messages: MessageWithRelations[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  sendMessage: (content: string, options?: { replyToId?: string; fileUrl?: string }) => Promise<void>;
  loadMore: () => Promise<void>;
  searchMessages: (query: string) => Promise<MessageWithRelations[]>;
  markAsRead: (messageId: string) => Promise<void>;
}

export function useMessages({
  roomId,
  userId,
  initialMessages = [],
  limit = 50,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<MessageWithRelations[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const socket = useSocket();

  // Load initial messages
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
      setCursor(initialMessages[0]?.id);
    }
  }, [initialMessages]);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleReceiveMessage = (message: MessageWithRelations) => {
      if (message.roomId === roomId) {
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    const handleMessageUpdated = ({ messageId, content }: { messageId: string; content: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content, isEdited: true } : msg
        )
      );
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('message-updated', handleMessageUpdated);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('message-updated', handleMessageUpdated);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [socket, roomId]);

  const sendMessage = useCallback(
    async (content: string, options?: { replyToId?: string; fileUrl?: string }) => {
      try {
        setError(null);
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            roomId,
            replyToId: options?.replyToId,
            fileUrl: options?.fileUrl,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to send message');
        }

        const { message } = await response.json();
        // Message will be added via socket event
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(error.message);
        throw error;
      }
    },
    [roomId]
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/messages?roomId=${roomId}&cursor=${cursor}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const { messages: newMessages, hasMore: more } = await response.json();
      setMessages((prev) => [...newMessages.reverse(), ...prev]);
      setHasMore(more);
      setCursor(newMessages[0]?.id);
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, cursor, limit, loading]);

  const searchMessages = useCallback(
    async (query: string): Promise<MessageWithRelations[]> => {
      try {
        setError(null);
        const response = await fetch(
          `/api/messages/search?roomId=${roomId}&query=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
          throw new Error('Failed to search messages');
        }

        const { messages } = await response.json();
        return messages;
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(error.message);
        return [];
      }
    },
    [roomId]
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        await fetch(`/api/messages/${messageId}/read`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('Failed to mark message as read:', err);
      }
    },
    []
  );

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    searchMessages,
    markAsRead,
  };
}
```

---

## 4. Error Handling Example

### Error Classes

```typescript
// lib/errors/base.error.ts
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract code: string;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// lib/errors/validation.error.ts
export class ValidationError extends AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
}

// lib/errors/not-found.error.ts
export class NotFoundError extends AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
}

// lib/errors/forbidden.error.ts
export class ForbiddenError extends AppError {
  statusCode = 403;
  code = 'FORBIDDEN';
}

// lib/errors/unauthorized.error.ts
export class UnauthorizedError extends AppError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
}

// lib/errors/error-handler.ts
import { NextResponse } from 'next/server';
import { AppError } from './base.error';

export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}
```

---

## 5. API Route Refactoring

### Before (Current)

```typescript
// app/api/messages/route.ts (Current)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = messageSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Business logic mixed here...
    const participant = await prisma.roomParticipant.findUnique({...});
    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const message = await prisma.message.create({...});
    // More business logic...
    
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### After (Refactored)

```typescript
// app/api/messages/route.ts (Refactored)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MessageService } from '@/lib/services/message.service';
import { MessageRepository } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { SocketService } from '@/lib/socket/socket.service';
import { handleError } from '@/lib/errors/error-handler';
import { UnauthorizedError } from '@/lib/errors/unauthorized.error';
import prisma from '@/lib/prisma';

// Initialize services (in production, use DI container)
const messageRepo = new MessageRepository(prisma);
const roomRepo = new RoomRepository(prisma);
const socketService = new SocketService(); // Assuming this exists
const messageService = new MessageService(messageRepo, roomRepo, socketService);

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { content, roomId, replyToId, fileUrl, fileName, fileSize, fileType, type } = body;

    // 3. Delegate to service
    const message = await messageService.sendMessage(session.user.id, roomId, content, {
      replyToId,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      type,
    });

    // 4. Return response
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!roomId) {
      return handleError(new ValidationError('Room ID is required'));
    }

    const result = await messageService.getMessages(session.user.id, roomId, {
      limit,
      cursor: cursor || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
```

---

## 🎯 Next Steps

1. Start with **Error Handling** - It's the foundation
2. Implement **Base Repository** - Reusable across all entities
3. Create **Message Repository** - First concrete implementation
4. Build **Message Service** - Extract business logic
5. Refactor **API Routes** - Make them thin
6. Create **Custom Hooks** - Improve React components

---

**Note**: These examples are simplified. In production, you should:
- Use dependency injection for services
- Add proper logging
- Implement caching where appropriate
- Add comprehensive error handling
- Write unit and integration tests

