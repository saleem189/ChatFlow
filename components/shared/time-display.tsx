// ================================
// Time Display Component
// ================================
// Reusable component for displaying formatted timestamps
// Prevents hydration errors and provides consistent formatting

"use client";

import { useEffect, useState } from "react";
import { formatTime, FormatTimeOptions } from "@/lib/utils/date-formatter";

interface TimeDisplayProps {
  timestamp: string | Date;
  format?: FormatTimeOptions['format'];
  includeTime?: boolean;
  className?: string;
  updateInterval?: number; // Update every N ms (default: 60000 for 1 minute)
  showPlaceholder?: boolean;
  placeholder?: string;
}

/**
 * TimeDisplay Component
 * 
 * Displays formatted timestamps with automatic updates and hydration-safe rendering
 * 
 * @example
 * <TimeDisplay timestamp="2024-01-15T10:30:00Z" format="relative" />
 * <TimeDisplay timestamp={date} format="compact" updateInterval={30000} />
 */
export function TimeDisplay({
  timestamp,
  format = 'smart',
  includeTime = false,
  className,
  updateInterval = 60000, // 1 minute default
  showPlaceholder = true,
  placeholder = "--",
}: TimeDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setMounted(true);
    setTime(formatTime(timestamp, { format, includeTime }));

    // Update time at specified interval
    const interval = setInterval(() => {
      setTime(formatTime(timestamp, { format, includeTime }));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [timestamp, format, includeTime, updateInterval]);

  // Prevent hydration mismatch by showing placeholder during SSR
  if (!mounted && showPlaceholder) {
    return <span className={className || "opacity-0"}>{placeholder}</span>;
  }

  return <span className={className}>{time}</span>;
}

