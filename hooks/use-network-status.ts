// ================================
// useNetworkStatus Hook
// ================================
// Monitors network connection status and speed
// Provides real-time feedback about online/offline and connection quality
// Shows toast notifications when connection status changes

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export type ConnectionSpeed = "fast" | "slow" | "offline" | "unknown";

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionSpeed: ConnectionSpeed;
  effectiveType?: string; // 4g, 3g, 2g, slow-2g
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
}

interface UseNetworkStatusOptions {
  /**
   * Threshold for slow connection (downlink in Mbps)
   * @default 1.5
   */
  slowThreshold?: number;
  
  /**
   * Threshold for slow RTT (round-trip time in ms)
   * @default 1000
   */
  slowRttThreshold?: number;
  
  /**
   * Polling interval for checking connection (ms)
   * @default 5000
   */
  pollInterval?: number;
}

interface UseNetworkStatusReturn {
  status: NetworkStatus;
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionSpeed: ConnectionSpeed;
}

/**
 * Hook for monitoring network connection status and speed
 * 
 * @example
 * ```tsx
 * const { isOnline, isSlowConnection, connectionSpeed } = useNetworkStatus();
 * 
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): UseNetworkStatusReturn {
  const {
    slowThreshold = 1.5, // 1.5 Mbps
    slowRttThreshold = 1000, // 1000ms
    pollInterval = 5000, // 5 seconds
  } = options;

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionSpeed: "unknown",
  });

  // Track previous status to detect changes
  const prevStatusRef = useRef<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionSpeed: "unknown",
  });

  /**
   * Update network status from Connection API
   */
  const updateNetworkStatus = useCallback(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    // Check basic online status
    const isOnline = navigator.onLine;

    // Get connection info if available (Chrome, Edge, Opera)
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    let networkStatus: NetworkStatus = {
      isOnline,
      isSlowConnection: false,
      connectionSpeed: isOnline ? "fast" : "offline",
    };

    if (!isOnline) {
      networkStatus.connectionSpeed = "offline";
      setStatus(networkStatus);
      return;
    }

    // If Connection API is available, get detailed info
    if (connection) {
      const downlink = connection.downlink; // Mbps
      const rtt = connection.rtt; // ms
      const effectiveType = connection.effectiveType; // 4g, 3g, 2g, slow-2g

      networkStatus.downlink = downlink;
      networkStatus.rtt = rtt;
      networkStatus.effectiveType = effectiveType;

      // Determine if connection is slow
      const isSlow = 
        downlink < slowThreshold || 
        rtt > slowRttThreshold ||
        effectiveType === "2g" ||
        effectiveType === "slow-2g";

      networkStatus.isSlowConnection = isSlow;
      networkStatus.connectionSpeed = isSlow ? "slow" : "fast";
      
      // Show toast if connection became slow
      if (!prevStatusRef.current.isSlowConnection && networkStatus.isSlowConnection) {
        const speedInfo = downlink ? ` (${downlink.toFixed(1)} Mbps)` : "";
        const latencyInfo = rtt ? ` • ${rtt}ms latency` : "";
        toast.warning(`Slow connection detected${speedInfo}${latencyInfo}. Messages may take longer to send.`, {
          duration: 5000,
        });
      }
      
      // Show toast if connection improved from slow to fast
      if (prevStatusRef.current.isSlowConnection && !networkStatus.isSlowConnection) {
        toast.success("Connection improved. Messages should send normally now.", {
          duration: 3000,
        });
      }
    } else {
      // Connection API not available, use basic online status
      networkStatus.connectionSpeed = "fast";
      
      // Show toast if came back online
      if (!prevStatusRef.current.isOnline && networkStatus.isOnline) {
        toast.success("You're back online! Queued messages are being sent.", {
          duration: 4000,
        });
      }
    }

    setStatus(networkStatus);
    prevStatusRef.current = networkStatus;
  }, [slowThreshold, slowRttThreshold]);

  /**
   * Listen to online/offline events
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Initial check
    updateNetworkStatus();

    // Listen to online/offline events
    const handleOnline = () => {
      // Show toast when coming back online
      if (!prevStatusRef.current.isOnline) {
        toast.success("You're back online! Queued messages are being sent.", {
          duration: 4000,
        });
      }
      updateNetworkStatus();
    };

    const handleOffline = () => {
      const offlineStatus = {
        isOnline: false,
        isSlowConnection: false,
        connectionSpeed: "offline" as ConnectionSpeed,
      };
      
      // Show toast when going offline
      if (prevStatusRef.current.isOnline) {
        toast.warning("You're offline. Messages will be sent when you're back online.", {
          duration: 5000,
        });
      }
      
      setStatus(offlineStatus);
      prevStatusRef.current = offlineStatus;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen to connection changes (if Connection API available)
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    // Poll for updates (fallback if Connection API not available)
    const pollIntervalId = setInterval(updateNetworkStatus, pollInterval);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      if (connection) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
      
      clearInterval(pollIntervalId);
    };
  }, [updateNetworkStatus, pollInterval]);

  return {
    status,
    isOnline: status.isOnline,
    isSlowConnection: status.isSlowConnection,
    connectionSpeed: status.connectionSpeed,
  };
}

