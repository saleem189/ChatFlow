// ================================
// Leave Room API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";

// Services are resolved asynchronously inside route handlers

interface RouteParams {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * POST /api/rooms/[roomId]/leave
 * Remove current user from room participants
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
    await roomService.leaveRoom(roomId, session.user.id);

    return NextResponse.json({ message: "Left room successfully" });
  } catch (error) {
    return handleError(error);
  }
}

