// ================================
// Admin Performance Metrics API
// ================================
// GET - Retrieve performance metrics for admin dashboard

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getCurrentMemoryUsage } from "@/lib/utils/memory-profiler";

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Performance metrics are real-time
export const revalidate = 0; // Don't cache

/**
 * GET /api/admin/performance
 * Get current performance metrics
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    // Get memory metrics
    const memory = getCurrentMemoryUsage();

    // Mock metrics (in production, these would come from your monitoring system)
    // You would typically integrate with your actual metrics collection system
    const metrics = {
      memory,
      apiMetrics: {
        totalRequests: Math.floor(Math.random() * 10000) + 5000,
        averageResponseTime: Math.floor(Math.random() * 150) + 50,
        errorRate: Math.random() * 2,
      },
      dbMetrics: {
        totalQueries: Math.floor(Math.random() * 50000) + 10000,
        averageQueryTime: Math.floor(Math.random() * 100) + 20,
        slowQueries: Math.floor(Math.random() * 15),
      },
      websocketMetrics: {
        activeConnections: Math.floor(Math.random() * 100) + 10,
        messagesPerMinute: Math.floor(Math.random() * 500) + 100,
        averageLatency: Math.floor(Math.random() * 80) + 20,
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    return handleError(error);
  }
}

