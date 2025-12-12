// ================================
// Memory Profiling Utilities
// ================================
// Track and monitor memory usage patterns

import { trackPerformanceMetric } from "./performance-monitor";

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryProfile {
  snapshots: MemorySnapshot[];
  startTime: number;
  endTime?: number;
  peakHeapUsed: number;
  averageHeapUsed: number;
  memoryGrowth: number;
}

class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private startTime: number = 0;
  private isProfileActive: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start memory profiling
   */
  start(intervalMs: number = 1000): void {
    if (typeof process === "undefined" || !process.memoryUsage) {
      console.warn("Memory profiling is only available in Node.js environment");
      return;
    }

    if (this.isProfileActive) {
      console.warn("Memory profiling is already active");
      return;
    }

    this.snapshots = [];
    this.startTime = Date.now();
    this.isProfileActive = true;

    // Take initial snapshot
    this.takeSnapshot();

    // Schedule periodic snapshots
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    console.log(`Memory profiling started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop memory profiling and return results
   */
  stop(): MemoryProfile | null {
    if (!this.isProfileActive) {
      console.warn("Memory profiling is not active");
      return null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Take final snapshot
    this.takeSnapshot();

    this.isProfileActive = false;
    const endTime = Date.now();

    // Calculate metrics
    const heapUsedValues = this.snapshots.map((s) => s.heapUsed);
    const peakHeapUsed = Math.max(...heapUsedValues);
    const averageHeapUsed =
      heapUsedValues.reduce((sum, val) => sum + val, 0) / heapUsedValues.length;
    const memoryGrowth =
      heapUsedValues[heapUsedValues.length - 1] - heapUsedValues[0];

    const profile: MemoryProfile = {
      snapshots: this.snapshots,
      startTime: this.startTime,
      endTime,
      peakHeapUsed,
      averageHeapUsed,
      memoryGrowth,
    };

    // Track metrics
    trackPerformanceMetric({
      name: "memory_profile_peak_heap",
      type: "custom",
      value: peakHeapUsed,
      unit: "bytes",
      tags: {
        duration: endTime - this.startTime,
      },
    });

    trackPerformanceMetric({
      name: "memory_profile_growth",
      type: "custom",
      value: memoryGrowth,
      unit: "bytes",
      tags: {
        duration: endTime - this.startTime,
      },
    });

    console.log("Memory profiling stopped:", {
      duration: `${((endTime - this.startTime) / 1000).toFixed(2)}s`,
      peakHeapUsed: `${(peakHeapUsed / 1024 / 1024).toFixed(2)} MB`,
      averageHeapUsed: `${(averageHeapUsed / 1024 / 1024).toFixed(2)} MB`,
      memoryGrowth: `${(memoryGrowth / 1024 / 1024).toFixed(2)} MB`,
      snapshotCount: this.snapshots.length,
    });

    return profile;
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    if (typeof process === "undefined" || !process.memoryUsage) {
      return;
    }

    const usage = process.memoryUsage();
    
    this.snapshots.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers || 0,
    });
  }

  /**
   * Get current snapshot count
   */
  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  /**
   * Check if profiling is active
   */
  isActive(): boolean {
    return this.isProfileActive;
  }
}

// Singleton instance
export const memoryProfiler = new MemoryProfiler();

/**
 * Profile memory usage of an async function
 */
export async function profileMemory<T>(
  fn: () => Promise<T>,
  options: { intervalMs?: number; label?: string } = {}
): Promise<{ result: T; profile: MemoryProfile }> {
  const { intervalMs = 100, label = "function" } = options;

  memoryProfiler.start(intervalMs);

  try {
    const result = await fn();
    const profile = memoryProfiler.stop();

    if (!profile) {
      throw new Error("Failed to create memory profile");
    }

    return { result, profile };
  } catch (error) {
    memoryProfiler.stop();
    throw error;
  }
}

/**
 * Check current memory usage
 */
export function getCurrentMemoryUsage(): {
  heapUsed: string;
  heapTotal: string;
  external: string;
  rss: string;
} | null {
  if (typeof process === "undefined" || !process.memoryUsage) {
    return null;
  }

  const usage = process.memoryUsage();
  
  return {
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
  };
}

/**
 * Check for potential memory leaks
 */
export function detectMemoryLeak(
  profile: MemoryProfile,
  options: {
    growthThreshold?: number; // MB
    growthRateThreshold?: number; // MB per second
  } = {}
): {
  isLeak: boolean;
  growthMB: number;
  growthRateMBPerSecond: number;
  recommendation: string;
} {
  const { growthThreshold = 50, growthRateThreshold = 1 } = options;

  const growthMB = profile.memoryGrowth / 1024 / 1024;
  const durationSeconds = ((profile.endTime || Date.now()) - profile.startTime) / 1000;
  const growthRateMBPerSecond = growthMB / durationSeconds;

  const isLeak =
    growthMB > growthThreshold || growthRateMBPerSecond > growthRateThreshold;

  let recommendation = "Memory usage is normal.";
  
  if (isLeak) {
    if (growthMB > growthThreshold) {
      recommendation = `Memory grew by ${growthMB.toFixed(2)} MB, which exceeds the threshold of ${growthThreshold} MB. Check for unclosed connections, unreleased event listeners, or cached data.`;
    } else {
      recommendation = `Memory growth rate is ${growthRateMBPerSecond.toFixed(2)} MB/s, which exceeds the threshold of ${growthRateThreshold} MB/s. Check for rapid object creation or circular references.`;
    }
  }

  return {
    isLeak,
    growthMB,
    growthRateMBPerSecond,
    recommendation,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Export profile data to JSON
 */
export function exportProfile(profile: MemoryProfile): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Save profile to file (Node.js only)
 */
export async function saveProfileToFile(
  profile: MemoryProfile,
  filename: string
): Promise<void> {
  if (typeof process === "undefined") {
    throw new Error("File operations are only available in Node.js");
  }

  const fs = await import("fs/promises");
  const path = await import("path");
  
  const profilesDir = path.join(process.cwd(), "memory-profiles");
  
  try {
    await fs.mkdir(profilesDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const filepath = path.join(profilesDir, filename);
  await fs.writeFile(filepath, exportProfile(profile), "utf-8");
  
  console.log(`Memory profile saved to: ${filepath}`);
}

