// ================================
// Performance Monitoring
// ================================
// Tracks API response times, database query performance, and resource usage

import 'server-only';

import type { ILogger } from '@/lib/logger/logger.interface';

export interface PerformanceMetrics {
  apiResponseTime: Map<string, number[]>;
  dbQueryTime: Map<string, number[]>;
  cacheHitRate: Map<string, { hits: number; misses: number }>;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  activeConnections: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private logger: ILogger;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.metrics = {
      apiResponseTime: new Map(),
      dbQueryTime: new Map(),
      cacheHitRate: new Map(),
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      },
      activeConnections: 0,
    };
  }

  /**
   * Track API response time
   */
  trackApiResponse(endpoint: string, duration: number): void {
    if (!this.metrics.apiResponseTime.has(endpoint)) {
      this.metrics.apiResponseTime.set(endpoint, []);
    }
    const times = this.metrics.apiResponseTime.get(endpoint)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Log slow requests
    if (duration > 1000) {
      this.logger.warn(`Slow API request: ${endpoint} took ${duration}ms`, {
        component: 'PerformanceMonitor',
        endpoint,
        duration,
      });
    }
  }

  /**
   * Track database query time
   */
  trackDbQuery(query: string, duration: number): void {
    if (!this.metrics.dbQueryTime.has(query)) {
      this.metrics.dbQueryTime.set(query, []);
    }
    const times = this.metrics.dbQueryTime.get(query)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Log slow queries
    if (duration > 500) {
      this.logger.warn(`Slow database query: ${query} took ${duration}ms`, {
        component: 'PerformanceMonitor',
        query,
        duration,
      });
    }
  }

  /**
   * Track cache hit/miss
   */
  trackCacheAccess(key: string, hit: boolean): void {
    if (!this.metrics.cacheHitRate.has(key)) {
      this.metrics.cacheHitRate.set(key, { hits: 0, misses: 0 });
    }
    const stats = this.metrics.cacheHitRate.get(key)!;
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    };

    return { ...this.metrics };
  }

  /**
   * Get average response time for an endpoint
   */
  getAverageResponseTime(endpoint: string): number {
    const times = this.metrics.apiResponseTime.get(endpoint);
    if (!times || times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Get cache hit rate for a key pattern
   */
  getCacheHitRate(key: string): number {
    const stats = this.metrics.cacheHitRate.get(key);
    if (!stats) return 0;
    const total = stats.hits + stats.misses;
    if (total === 0) return 0;
    return (stats.hits / total) * 100;
  }

  /**
   * Start periodic metrics reporting
   */
  startReporting(intervalMs: number = 60000): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.reportMetrics();
    }, intervalMs);
  }

  /**
   * Stop periodic reporting
   */
  stopReporting(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Report current metrics
   */
  private reportMetrics(): void {
    const metrics = this.getMetrics();
    const memUsageMB = {
      heapUsed: (metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotal: (metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
    };

    this.logger.info('Performance metrics', {
      component: 'PerformanceMonitor',
      memory: {
        heapUsedMB: memUsageMB.heapUsed,
        heapTotalMB: memUsageMB.heapTotal,
      },
      apiEndpoints: Array.from(metrics.apiResponseTime.entries()).map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : 0,
        count: times.length,
      })),
      cacheStats: Array.from(metrics.cacheHitRate.entries()).map(([key, stats]) => ({
        key,
        hitRate: ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2),
        hits: stats.hits,
        misses: stats.misses,
      })),
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopReporting();
    this.metrics.apiResponseTime.clear();
    this.metrics.dbQueryTime.clear();
    this.metrics.cacheHitRate.clear();
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(logger: ILogger): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor(logger);
  }
  return performanceMonitorInstance;
}

