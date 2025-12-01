// ================================
// Message Search API Route
// ================================
// GET /api/messages/search?roomId=xxx&query=xxx - Search messages in a room

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";

// Get services from DI container
const messageService = getService<MessageService>('messageService');

/**
 * GET /api/messages/search
 * Search messages within a chat room
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!roomId || !query) {
      return handleError(new ValidationError('Room ID and query are required'));
    }

    const messages = await messageService.searchMessages(
      roomId,
      session.user.id,
      query,
      limit
    );

    // Transform messages to match expected format
    const transformedMessages = messages.map((message) => {
      const reactions: Record<string, Array<{ id: string; name: string; avatar: string | null }>> = {};
      
      message.reactions.forEach((reaction) => {
        if (!reactions[reaction.emoji]) {
          reactions[reaction.emoji] = [];
        }
        reactions[reaction.emoji].push({
          id: reaction.user.id,
          name: reaction.user.name,
          avatar: reaction.user.avatar,
        });
      });

      return {
        id: message.id,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        fileType: message.fileType,
        isEdited: message.isEdited,
        isDeleted: message.isDeleted,
        replyToId: message.replyToId,
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.content,
              senderName: message.replyTo.sender.name,
              senderAvatar: message.replyTo.sender.avatar,
            }
          : null,
        reactions,
        isRead: message.readReceipts.length > 0,
        createdAt: message.createdAt.toISOString(),
        senderId: message.senderId,
        senderName: message.sender.name,
        senderAvatar: message.sender.avatar,
        roomId: message.roomId,
      };
    });

    return NextResponse.json({
      messages: transformedMessages,
      count: transformedMessages.length,
    });
  } catch (error) {
    return handleError(error);
  }
}

