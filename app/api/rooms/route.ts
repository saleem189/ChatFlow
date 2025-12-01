// ================================
// Chat Rooms API Routes
// ================================
// GET /api/rooms - Get user's chat rooms
// POST /api/rooms - Create a new chat room or start DM

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError, NotFoundError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";
import { UserRepository } from "@/lib/repositories/user.repository";

// Get services from DI container
const roomService = getService<RoomService>('roomService');
const userRepo = getService<UserRepository>('userRepository');

/**
 * GET /api/rooms
 * Get all chat rooms for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const rooms = await roomService.getUserRooms(session.user.id);
    return NextResponse.json({ rooms });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/rooms
 * Create a new chat room or find/create DM
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Verify user exists
    const currentUser = await userRepo.findById(session.user.id);
    if (!currentUser) {
      return handleError(new NotFoundError('User not found in database. Please log out and log back in.'));
    }

    const body = await request.json();
    const { name, description, isGroup = false, participantIds = [] } = body;

    // Validate participantIds
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return handleError(new ValidationError('Select at least one participant'));
    }

    // Filter valid participant IDs
    const validParticipantIds = participantIds.filter(
      (id: string) => id && typeof id === "string" && id.trim().length > 0
    );

    if (validParticipantIds.length === 0) {
      return handleError(new ValidationError('Invalid participant IDs'));
    }

    // For DMs (1-on-1 chat)
    if (!isGroup && validParticipantIds.length === 1) {
      const { room, existing } = await roomService.createOrFindDM(
        session.user.id,
        validParticipantIds[0]
      );

      return NextResponse.json({
        room: {
          id: room.id,
          name: room.name,
          isGroup: false,
          participants: room.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            status: p.user.status || 'offline',
          })),
        },
        existing,
      }, { status: existing ? 200 : 201 });
    }

    // For Group chats
    const room = await roomService.createGroup(
      session.user.id,
      name,
      validParticipantIds,
      description
    );

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        isGroup: true,
        participants: room.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar,
          status: p.user.status || 'offline',
        })),
      },
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
