// ================================
// Users API Routes
// ================================
// GET /api/users - Get all users (for adding to rooms)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { UserService } from "@/lib/services/user.service";

// Get services from DI container
const userService = getService<UserService>('userService');

/**
 * GET /api/users
 * Get all users for adding to chat rooms
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Get all users except current user
    const allUsers = await userService.getAllUsers();
    const users = allUsers
      .filter((user) => user.id !== session.user.id)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        lastSeen: user.lastSeen,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ users });
  } catch (error) {
    return handleError(error);
  }
}

