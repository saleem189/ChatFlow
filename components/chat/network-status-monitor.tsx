// ================================
// Network Status Monitor
// ================================
// Monitors network status and shows toast notifications
// No UI component, just triggers toasts

"use client";

import { useEffect } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";

/**
 * Network Status Monitor Component
 * 
 * Monitors network connection and shows toast notifications when status changes.
 * This component has no visual UI - it only triggers toasts.
 * 
 * @example
 * ```tsx
 * <NetworkStatusMonitor />
 * ```
 */
export function NetworkStatusMonitor() {
  // Just use the hook - it handles toast notifications internally
  useNetworkStatus({
    slowThreshold: 1.5, // 1.5 Mbps
    slowRttThreshold: 1000, // 1000ms
  });

  // Component doesn't render anything
  return null;
}

