// ================================
// Message Edit/Delete API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";

// Get services from DI container
const messageService = getService<MessageService>('messageService');

interface RouteParams {
  params: {
    messageId: string;
  };
}

/**
 * PATCH /api/messages/[messageId]
 * Edit a message
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { messageId } = params;
    const { content } = await request.json();

    const updatedMessage = await messageService.editMessage(
      messageId,
      session.user.id,
      content
    );

    // Transform to match expected format
    const transformed = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      type: updatedMessage.type,
      isEdited: updatedMessage.isEdited,
      updatedAt: updatedMessage.updatedAt.toISOString(),
    };

    return NextResponse.json({ message: transformed });
  } catch (error) {
    return handleError(error);
  }
}
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: {
        id: updatedMessage.id,
        content: updatedMessage.content,
        type: updatedMessage.type,
        isEdited: updatedMessage.isEdited,
        createdAt: updatedMessage.createdAt.toISOString(),
        updatedAt: updatedMessage.updatedAt.toISOString(),
        senderId: updatedMessage.senderId,
        senderName: updatedMessage.sender.name,
        senderAvatar: updatedMessage.sender.avatar,
        roomId: updatedMessage.roomId,
      },
    });
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/[messageId]
 * Delete a message
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { messageId } = params;
    // Note: deleteForEveryone logic can be added to service if needed
    await messageService.deleteMessage(messageId, session.user.id);

    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}

    if (!isSender && !isRoomAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own messages or be a room admin" },
        { status: 403 }
      );
    }

    // Soft delete (mark as deleted)
    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: deleteForEveryone ? "[This message was deleted]" : message.content,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: {
        id: deletedMessage.id,
        isDeleted: deletedMessage.isDeleted,
      },
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}

