// ================================
// Call Quality Indicator Component
// ================================
// Displays network quality, latency, and bandwidth info

"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type QualityLevel = "excellent" | "good" | "fair" | "poor" | "disconnected";

interface CallQualityIndicatorProps {
  className?: string;
}

export function CallQualityIndicator({ className }: CallQualityIndicatorProps) {
  const [quality, setQuality] = useState<QualityLevel>("good");
  const [latency, setLatency] = useState<number>(0);
  const [packetLoss, setPacketLoss] = useState<number>(0);

  // Simulate quality monitoring (in real implementation, get from WebRTC stats)
  useEffect(() => {
    const checkQuality = () => {
      // In real implementation, get stats from RTCPeerConnection.getStats()
      // For now, simulate with navigator.connection (if available)
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        const effectiveType = connection?.effectiveType;
        
        // Simulate latency based on connection type
        let simulatedLatency = 50;
        let simulatedPacketLoss = 0;
        let qualityLevel: QualityLevel = "good";

        switch (effectiveType) {
          case "4g":
            simulatedLatency = Math.random() * 50 + 20; // 20-70ms
            simulatedPacketLoss = Math.random() * 0.5;
            qualityLevel = "excellent";
            break;
          case "3g":
            simulatedLatency = Math.random() * 100 + 50; // 50-150ms
            simulatedPacketLoss = Math.random() * 2;
            qualityLevel = "good";
            break;
          case "2g":
            simulatedLatency = Math.random() * 200 + 100; // 100-300ms
            simulatedPacketLoss = Math.random() * 5;
            qualityLevel = "fair";
            break;
          case "slow-2g":
            simulatedLatency = Math.random() * 400 + 200; // 200-600ms
            simulatedPacketLoss = Math.random() * 10;
            qualityLevel = "poor";
            break;
          default:
            simulatedLatency = Math.random() * 100 + 30; // 30-130ms
            simulatedPacketLoss = Math.random() * 1;
            qualityLevel = "good";
        }

        setLatency(Math.round(simulatedLatency));
        setPacketLoss(Math.round(simulatedPacketLoss * 10) / 10);
        setQuality(qualityLevel);
      } else {
        // Fallback when navigator.connection is not available
        setLatency(Math.round(Math.random() * 50 + 30));
        setPacketLoss(Math.round(Math.random() * 10) / 10);
        setQuality("good");
      }
    };

    // Check quality every 2 seconds
    checkQuality();
    const interval = setInterval(checkQuality, 2000);

    return () => clearInterval(interval);
  }, []);

  const getQualityColor = (level: QualityLevel): string => {
    switch (level) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-green-500";
      case "fair":
        return "bg-amber-500";
      case "poor":
        return "bg-destructive";
      case "disconnected":
        return "bg-muted";
    }
  };

  const getQualityIcon = (level: QualityLevel) => {
    if (level === "disconnected") {
      return <WifiOff className="w-3 h-3" />;
    }
    return <Wifi className="w-3 h-3" />;
  };

  const getQualityLabel = (level: QualityLevel): string => {
    switch (level) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "fair":
        return "Fair";
      case "poor":
        return "Poor";
      case "disconnected":
        return "Disconnected";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 cursor-help",
              className
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                getQualityColor(quality)
              )}
            />
            <span className="text-xs font-medium">
              {getQualityLabel(quality)}
            </span>
            {getQualityIcon(quality)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3 h-3" />
            <span className="font-medium">Network Stats</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Latency: {latency}ms
          </div>
          <div className="text-xs text-muted-foreground">
            Packet Loss: {packetLoss}%
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

