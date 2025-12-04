/**
 * Performance Metrics API
 * GET /api/metrics - Returns current performance metrics (admin only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { getService } from '@/lib/di';
import { getPerformanceMonitor } from '@/lib/monitoring/performance-monitor';
import type { ILogger } from '@/lib/logger/logger.interface';

export const dynamic = 'force-dynamic';

/**
 * GET /api/metrics
 * Get current performance metrics (admin only)
 */
export async function GET() {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Authorization - admin only
    if (session.user.role !== 'ADMIN') {
      return handleError(new ForbiddenError('Admin access required'));
    }

    // Get services
    const logger = await getService<ILogger>('logger');
    const monitor = getPerformanceMonitor(logger);

    // Get metrics
    const metrics = monitor.getMetrics();

    // Format response
    const response = {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsedMB: (metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
        externalMB: (metrics.memoryUsage.external / 1024 / 1024).toFixed(2),
      },
      api: Array.from(metrics.apiResponseTime.entries()).map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : 0,
        minTime: times.length > 0 ? Math.min(...times).toFixed(2) : 0,
        maxTime: times.length > 0 ? Math.max(...times).toFixed(2) : 0,
        count: times.length,
      })),
      cache: Array.from(metrics.cacheHitRate.entries()).map(([key, stats]) => ({
        key,
        hitRate: stats.hits + stats.misses > 0
          ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
          : 0,
        hits: stats.hits,
        misses: stats.misses,
        total: stats.hits + stats.misses,
      })),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

