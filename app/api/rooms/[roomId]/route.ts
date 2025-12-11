// ================================
// Room Management API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";
import { validateRequest } from "@/lib/middleware/validate-request";
import { updateRoomSchema } from "@/lib/validations";

// Services are resolved asynchronously inside route handlers

interface RouteParams {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * PATCH /api/rooms/[roomId]
 * Update room (name, avatar, description) - Room Admin only
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

    // Get service from DI container (async)
    const roomService = await getService<RoomService>('roomService');

    const { roomId } = await params;
    
    // Validate request body
    const validation = await validateRequest(request, updateRoomSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { name, avatar, description } = validation.data;

    const room = await roomService.updateRoom(roomId, session.user.id, {
      name,
      description,
      avatar,
    });

    return NextResponse.json({ room });
  } catch (error) {
    return handleError(error);
  }
}

