// ================================
// Message Time Component
// ================================
// Displays formatted message timestamps
// Now uses centralized TimeDisplay component

"use client";

import { TimeDisplay } from "@/components/shared/time-display";

interface MessageTimeProps {
  timestamp: string;
}

export function MessageTime({ timestamp }: MessageTimeProps) {
  return (
    <TimeDisplay 
      timestamp={timestamp} 
      format="smart"
      className="opacity-0"
      placeholder="--"
    />
  );
}

