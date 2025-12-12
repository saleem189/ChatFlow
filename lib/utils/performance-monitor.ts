// ================================
// Performance Monitoring Utilities
// ================================
// Custom performance tracking with Sentry integration

import * as Sentry from "@sentry/nextjs";

/**
 * Performance metric types
 */
export type PerformanceMetricType =
  | "api_request"
  | "database_query"
  | "websocket_event"
  | "file_upload"
  | "validation"
  | "rate_limit_check"
  | "custom";

interface PerformanceMetricData {
  name: string;
  type: PerformanceMetricType;
  value: number;
  unit: "ms" | "bytes" | "count";
  tags?: Record<string, string | number | boolean>;
  data?: Record<string, unknown>;
}

/**
 * Track custom performance metric
 */
export function trackPerformanceMetric(metric: PerformanceMetricData): void {
  try {
    // Send to Sentry as custom measurement
    Sentry.metrics.distribution(metric.name, metric.value, {
      unit: metric.unit,
      tags: metric.tags as Record<string, string>,
    });

    // Also log for development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Performance] ${metric.name}:`, {
        value: `${metric.value}${metric.unit}`,
        type: metric.type,
        ...metric.tags,
      });
    }
  } catch (error) {
    // Don't let performance monitoring break the app
    console.error("Failed to track performance metric:", error);
  }
}

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(
  name: string,
  type: PerformanceMetricType,
  fn: () => Promise<T> | T,
  tags?: Record<string, string | number | boolean>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    trackPerformanceMetric({
      name,
      type,
      value: duration,
      unit: "ms",
      tags: {
        ...tags,
        success: true,
      },
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    trackPerformanceMetric({
      name,
      type,
      value: duration,
      unit: "ms",
      tags: {
        ...tags,
        success: false,
      },
    });

    throw error;
  }
}

/**
 * Track API request performance
 */
export function trackApiPerformance(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
): void {
  trackPerformanceMetric({
    name: "api_request_duration",
    type: "api_request",
    value: duration,
    unit: "ms",
    tags: {
      endpoint,
      method,
      status_code: statusCode,
      success: statusCode >= 200 && statusCode < 300,
    },
  });
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(
  operation: string,
  model: string,
  duration: number,
  recordCount?: number
): void {
  trackPerformanceMetric({
    name: "database_query_duration",
    type: "database_query",
    value: duration,
    unit: "ms",
    tags: {
      operation,
      model,
      ...(recordCount !== undefined && { record_count: recordCount }),
    },
  });
}

/**
 * Track WebSocket event performance
 */
export function trackWebSocketEvent(
  event: string,
  duration: number,
  success: boolean = true
): void {
  trackPerformanceMetric({
    name: "websocket_event_duration",
    type: "websocket_event",
    value: duration,
    unit: "ms",
    tags: {
      event,
      success,
    },
  });
}

/**
 * Track file upload performance
 */
export function trackFileUpload(
  fileType: string,
  fileSize: number,
  duration: number,
  success: boolean = true
): void {
  trackPerformanceMetric({
    name: "file_upload_duration",
    type: "file_upload",
    value: duration,
    unit: "ms",
    tags: {
      file_type: fileType,
      file_size: fileSize,
      success,
    },
  });

  // Also track file size separately
  trackPerformanceMetric({
    name: "file_upload_size",
    type: "file_upload",
    value: fileSize,
    unit: "bytes",
    tags: {
      file_type: fileType,
      success,
    },
  });
}

/**
 * Track validation performance
 */
export function trackValidation(
  schema: string,
  duration: number,
  success: boolean = true
): void {
  trackPerformanceMetric({
    name: "validation_duration",
    type: "validation",
    value: duration,
    unit: "ms",
    tags: {
      schema,
      success,
    },
  });
}

/**
 * Track rate limit check performance
 */
export function trackRateLimitCheck(
  endpoint: string,
  duration: number,
  limited: boolean = false
): void {
  trackPerformanceMetric({
    name: "rate_limit_check_duration",
    type: "rate_limit_check",
    value: duration,
    unit: "ms",
    tags: {
      endpoint,
      limited,
    },
  });
}

/**
 * Performance timer class for manual tracking
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private type: PerformanceMetricType;
  private tags: Record<string, string | number | boolean>;

  constructor(
    name: string,
    type: PerformanceMetricType,
    tags?: Record<string, string | number | boolean>
  ) {
    this.name = name;
    this.type = type;
    this.tags = tags || {};
    this.startTime = performance.now();
  }

  /**
   * Stop timer and track metric
   */
  stop(additionalTags?: Record<string, string | number | boolean>): number {
    const duration = performance.now() - this.startTime;

    trackPerformanceMetric({
      name: this.name,
      type: this.type,
      value: duration,
      unit: "ms",
      tags: {
        ...this.tags,
        ...additionalTags,
      },
    });

    return duration;
  }

  /**
   * Get elapsed time without stopping timer
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Track memory usage (Node.js only)
 */
export function trackMemoryUsage(): void {
  if (typeof process === "undefined" || !process.memoryUsage) {
    return;
  }

  try {
    const usage = process.memoryUsage();

    trackPerformanceMetric({
      name: "memory_heap_used",
      type: "custom",
      value: usage.heapUsed,
      unit: "bytes",
      tags: {
        type: "heap_used",
      },
    });

    trackPerformanceMetric({
      name: "memory_heap_total",
      type: "custom",
      value: usage.heapTotal,
      unit: "bytes",
      tags: {
        type: "heap_total",
      },
    });

    trackPerformanceMetric({
      name: "memory_external",
      type: "custom",
      value: usage.external,
      unit: "bytes",
      tags: {
        type: "external",
      },
    });
  } catch (error) {
    console.error("Failed to track memory usage:", error);
  }
}

/**
 * Start periodic memory monitoring (call in server initialization)
 */
export function startMemoryMonitoring(intervalMs: number = 60000): NodeJS.Timeout | null {
  if (typeof process === "undefined") {
    return null;
  }

  return setInterval(() => {
    trackMemoryUsage();
  }, intervalMs);
}

/**
 * Track Web Vitals (client-side only)
 */
export function trackWebVitals(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Track Core Web Vitals using PerformanceObserver
  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      trackPerformanceMetric({
        name: "web_vital_lcp",
        type: "custom",
        value: lastEntry.startTime,
        unit: "ms",
        tags: {
          vital: "lcp",
        },
      });
    });
    lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: PerformanceEntry) => {
        const fidEntry = entry as PerformanceEventTiming;
        const fid = fidEntry.processingStart - fidEntry.startTime;
        
        trackPerformanceMetric({
          name: "web_vital_fid",
          type: "custom",
          value: fid,
          unit: "ms",
          tags: {
            vital: "fid",
          },
        });
      });
    });
    fidObserver.observe({ entryTypes: ["first-input"] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const layoutShift = entry as LayoutShift;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      });

      trackPerformanceMetric({
        name: "web_vital_cls",
        type: "custom",
        value: clsValue * 1000, // Convert to ms for consistency
        unit: "ms",
        tags: {
          vital: "cls",
        },
      });
    });
    clsObserver.observe({ entryTypes: ["layout-shift"] });
  } catch (error) {
    console.error("Failed to track web vitals:", error);
  }
}

// TypeScript type for layout shift
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// TypeScript type for event timing
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

