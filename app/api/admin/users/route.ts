// ================================
// Admin Users API
// ================================
// GET - List all users
// PATCH - Update user
// DELETE - Delete user

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { validateRequest, validateQueryParams } from "@/lib/middleware/validate-request";
import { updateUserSchema, deleteUserSchema, getUsersQuerySchema } from "@/lib/validations";
import { rateLimit, RateLimitPresets } from "@/lib/middleware/rate-limit";

// Services are resolved asynchronously inside route handlers

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Admin users are dynamic
export const revalidate = 60; // Revalidate every 60 seconds

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validation = validateQueryParams(searchParams, getUsersQuerySchema);
    if (!validation.success) {
      return validation.response;
    }
    const { skip, take, search } = validation.data;

    const users = await adminService.getAllUsers({
      skip,
      take,
      search,
    });
    
    // Add caching headers - user list can be cached for 60 seconds
    const response = NextResponse.json({ users });
    response.headers.set('Cache-Control', CACHE_HEADERS.adminUsers);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/admin/users
 * Update a user
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

    // Validate request body
    const validation = await validateRequest(request, updateUserSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { userId, name, email, role, status } = validation.data;

    const user = await adminService.updateUser(userId, { name, email, role, status });
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user
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
    const validation = validateQueryParams(searchParams, deleteUserSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { userId } = validation.data;

    const result = await adminService.deleteUser(userId);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

