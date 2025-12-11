// ================================
// Room Members Management API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";
import { validateRequest } from "@/lib/middleware/validate-request";
import { addRoomMembersSchema } from "@/lib/validations";

// Services are resolved asynchronously inside route handlers

interface RouteParams {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * DELETE /api/rooms/[roomId]/members
 * Remove a member from room - Room Admin only
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

    // Get service from DI container (async)
    const roomService = await getService<RoomService>('roomService');

    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return handleError(new ValidationError('userId is required'));
    }

    await roomService.removeMember(roomId, session.user.id, userId);
    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/rooms/[roomId]/members
 * Add members to room - Room Admin only
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

    // Get service from DI container (async)
    const roomService = await getService<RoomService>('roomService');

    const { roomId } = await params;
    
    // Validate request body
    const validation = await validateRequest(request, addRoomMembersSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { userIds } = validation.data;

    const { added } = await roomService.addMembers(roomId, session.user.id, userIds);
    return NextResponse.json({
      message: `Added ${added.length} member(s)`,
      added,
    });
  } catch (error) {
    return handleError(error);
  }
}

