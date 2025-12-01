// ================================
// Connection Status Banner
// ================================
// Displays network connection status (offline/slow) to users

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { cn } from "@/lib/utils";

/**
 * Connection Status Banner Component
 * 
 * Shows a banner at the top of the chat when:
 * - User is offline
 * - User has slow connection
 * 
 * @example
 * ```tsx
 * <ConnectionStatusBanner />
 * ```
 */
export function ConnectionStatusBanner() {
  const { isOnline, isSlowConnection, connectionSpeed, status } = useNetworkStatus({
    slowThreshold: 1.5, // 1.5 Mbps
    slowRttThreshold: 1000, // 1000ms
  });

  // Don't show anything if online and fast
  if (isOnline && !isSlowConnection) {
    return null;
  }

  const isOffline = !isOnline || connectionSpeed === "offline";
  const isSlow = isSlowConnection && isOnline;

  return (
    <AnimatePresence>
      {(isOffline || isSlow) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50 px-4 py-2.5 text-sm font-medium",
            "flex items-center justify-center gap-2",
            "shadow-lg",
            isOffline
              ? "bg-red-500 text-white dark:bg-red-600"
              : "bg-yellow-500 text-white dark:bg-yellow-600"
          )}
        >
          {isOffline ? (
            <>
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>You're offline. Messages will be sent when you're back online.</span>
            </>
          ) : isSlow ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                Slow connection detected
                {status.downlink && ` (${status.downlink.toFixed(1)} Mbps)`}
                {status.rtt && ` • ${status.rtt}ms latency`}
                . Messages may take longer to send.
              </span>
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact Connection Status Indicator
 * 
 * Small indicator that can be placed in the header/sidebar
 * 
 * @example
 * ```tsx
 * <ConnectionStatusIndicator />
 * ```
 */
export function ConnectionStatusIndicator() {
  const { isOnline, isSlowConnection, connectionSpeed } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null;
  }

  const isOffline = !isOnline || connectionSpeed === "offline";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
        isOffline
          ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
      )}
      title={
        isOffline
          ? "You're offline. Messages will be queued."
          : "Slow connection detected. Messages may take longer to send."
      }
    >
      {isOffline ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>Slow</span>
        </>
      )}
    </div>
  );
}

