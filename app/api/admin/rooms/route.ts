// ================================
// Admin Rooms API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";

/**
 * DELETE /api/admin/rooms
 * Delete a chat room
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    // Get service from DI container (async)
    const adminService = await getService<AdminService>('adminService');

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const result = await adminService.deleteRoom(roomId || '');
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

