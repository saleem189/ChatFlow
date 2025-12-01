// ================================
// Room Members Management API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
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

    const { roomId } = params;
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

    const { roomId } = params;
    const body = await request.json();
    const { userIds } = body;

    const { added } = await roomService.addMembers(roomId, session.user.id, userIds);
    return NextResponse.json({
      message: `Added ${added.length} member(s)`,
      added,
    });
  } catch (error) {
    return handleError(error);
  }
}

