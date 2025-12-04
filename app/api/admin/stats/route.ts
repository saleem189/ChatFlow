// ================================
// Admin Stats API
// ================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

// Services are resolved asynchronously inside route handlers

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Admin stats are dynamic
export const revalidate = 30; // Revalidate every 30 seconds

export async function GET(): Promise<NextResponse> {
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

    const stats = await adminService.getStats();
    // Add caching headers - stats can be cached for 30 seconds
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', CACHE_HEADERS.adminStats);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

