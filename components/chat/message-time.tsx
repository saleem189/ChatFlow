// ================================
// Message Time Component (Client-only)
// ================================
// Prevents hydration errors by only rendering time after mount

"use client";

import { useEffect, useState } from "react";
import { formatMessageTime } from "@/lib/utils";

interface MessageTimeProps {
  timestamp: string;
}

export function MessageTime({ timestamp }: MessageTimeProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setMounted(true);
    setTime(formatMessageTime(timestamp));
    
    // Update time every minute
    const interval = setInterval(() => {
      setTime(formatMessageTime(timestamp));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  // Return empty string during SSR to prevent hydration mismatch
  if (!mounted) {
    return <span className="opacity-0">--</span>;
  }

  return <span>{time}</span>;
}

