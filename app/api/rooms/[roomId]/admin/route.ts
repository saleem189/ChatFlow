// ================================
// Room Admin Management API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";

// Services are resolved asynchronously inside route handlers

interface RouteParams {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * POST /api/rooms/[roomId]/admin
 * Assign or remove ROOM admin role (participant.role)
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
    const body = await request.json();
    const { userId, isAdmin } = body;

    if (!userId || typeof isAdmin !== "boolean") {
      return handleError(new ValidationError('userId and isAdmin are required'));
    }

    await roomService.updateParticipantRole(roomId, session.user.id, userId, isAdmin);

    return NextResponse.json({
      message: isAdmin ? "Admin assigned" : "Admin removed",
    });
  } catch (error) {
    return handleError(error);
  }
}

