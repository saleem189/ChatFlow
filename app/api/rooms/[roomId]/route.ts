// ================================
// Room Management API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";

// Get services from DI container
const roomService = getService<RoomService>('roomService');

interface RouteParams {
  params: {
    roomId: string;
  };
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

    const { roomId } = params;
    const body = await request.json();
    const { name, avatar, description } = body;

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

