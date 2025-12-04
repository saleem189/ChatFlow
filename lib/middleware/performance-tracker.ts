/**
 * Performance Tracking Middleware
 * Tracks API response times and logs slow requests
 */

import type { NextRequest } from 'next/server';
import { getPerformanceMonitor } from '@/lib/monitoring/performance-monitor';
import type { ILogger } from '@/lib/logger/logger.interface';

export async function trackPerformance(
  request: NextRequest,
  handler: () => Promise<Response>,
  logger: ILogger
): Promise<Response> {
  const startTime = Date.now();
  const endpoint = request.nextUrl.pathname;

  try {
    const response = await handler();
    const duration = Date.now() - startTime;

    // Track performance
    const monitor = getPerformanceMonitor(logger);
    monitor.trackApiResponse(endpoint, duration);

    // Add performance header
    response.headers.set('X-Response-Time', `${duration}ms`);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const monitor = getPerformanceMonitor(logger);
    monitor.trackApiResponse(endpoint, duration);
    throw error;
  }
}

