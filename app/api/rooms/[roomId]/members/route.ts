// ================================
// Room Members Management API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";
import { validateRequest, validateQueryParams } from "@/lib/middleware/validate-request";
import { addRoomMembersSchema, removeMemberSchema } from "@/lib/validations";
import { rateLimit, RateLimitPresets } from "@/lib/middleware/rate-limit";

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

    // Apply rate limiting for member removal
    const limitResult = await rateLimit(request, RateLimitPresets.admin);
    if (!limitResult.success) {
      return limitResult.response;
    }

    // Get service from DI container (async)
    const roomService = await getService<RoomService>('roomService');

    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = validateQueryParams(searchParams, removeMemberSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { userId } = validation.data;

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

