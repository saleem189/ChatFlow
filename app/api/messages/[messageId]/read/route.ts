// ================================
// Mark Message as Read API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";
import { MessageRepository } from "@/lib/repositories/message.repository";

// Services are resolved asynchronously inside route handlers

interface RouteParams {
  params: Promise<{
    messageId: string;
  }>;
}

/**
 * POST /api/messages/[messageId]/read
 * Mark a message as read by the current user
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Get services from DI container (async)
    const messageService = await getService<MessageService>('messageService');
    const messageRepo = await getService<MessageRepository>('messageRepository');

    const { messageId } = await params;
    
    // Check if it's own message (don't mark as read)
    const message = await messageRepo.findById(messageId);
    if (message && message.senderId === session.user.id) {
      return NextResponse.json({ message: "Cannot mark own message as read" });
    }

    await messageService.markAsRead(messageId, session.user.id);
    return NextResponse.json({ message: "Message marked as read" });
  } catch (error: unknown) {
    // Handle Prisma unique constraint errors gracefully
    // This can happen due to race conditions when multiple requests try to mark the same message as read
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError?.code === 'P2002' || prismaError?.meta?.target?.includes('messageId')) {
      // Message is already marked as read - this is not an error
      return NextResponse.json({ message: "Message already marked as read" }, { status: 200 });
    }
    return handleError(error);
  }
}

/**
 * GET /api/messages/[messageId]/read
 * Get read receipts for a message
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Get service from DI container (async)
    const messageService = await getService<MessageService>('messageService');

    const { messageId } = await params;
    const readReceipts = await messageService.getReadReceipts(messageId, session.user.id);

    return NextResponse.json({ readReceipts });
  } catch (error) {
    return handleError(error);
  }
}

