// ================================
// Admin Rooms API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";
import { validateQueryParams } from "@/lib/middleware/validate-request";
import { deleteRoomSchema } from "@/lib/validations";
import { rateLimit, RateLimitPresets } from "@/lib/middleware/rate-limit";

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

    // Apply rate limiting for sensitive DELETE operations
    const limitResult = await rateLimit(request, RateLimitPresets.strict);
    if (!limitResult.success) {
      return limitResult.response;
    }

    // Get service from DI container (async)
    const adminService = await getService<AdminService>('adminService');

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = validateQueryParams(searchParams, deleteRoomSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { roomId } = validation.data;

    const result = await adminService.deleteRoom(roomId);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

