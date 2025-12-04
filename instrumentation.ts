import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    
    // Register shutdown handlers for graceful resource cleanup
    // Only in Node.js runtime, not Edge Runtime
    // Use dynamic import to prevent Edge Runtime from analyzing this code
    const { registerShutdownHandlers } = await import('./lib/shutdown-handlers');
    registerShutdownHandlers();
    
    // Initialize performance monitoring
    // Start reporting metrics every 5 minutes
    try {
      const { setupDI } = await import('@/lib/di/providers');
      setupDI();
      
      const { getService } = await import('@/lib/di');
      const { getPerformanceMonitor } = await import('@/lib/monitoring/performance-monitor');
      const logger = await getService<import('@/lib/logger/logger.interface').ILogger>('logger');
      const monitor = getPerformanceMonitor(logger);
      monitor.startReporting(5 * 60 * 1000); // Report every 5 minutes
    } catch (error) {
      // Performance monitoring is non-critical, don't fail startup
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
