// ================================
// Read Receipts Component
// ================================

"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadReceiptsProps {
  isSent: boolean;
  isRead: boolean;
  isDelivered?: boolean;
}

export function ReadReceipts({
  isSent,
  isRead,
  isDelivered = false,
}: ReadReceiptsProps) {
  if (!isSent) return null;

  return (
    <div className="flex items-center ml-0.5">
      {isRead ? (
        // Two blue ticks - Message read
        <CheckCheck
          className={cn(
            "w-3.5 h-3.5",
            "text-blue-500 dark:text-blue-400",
            "drop-shadow-sm"
          )}
          strokeWidth={2.5}
        />
      ) : isDelivered ? (
        // Two gray ticks - Message delivered (recipient online)
        <CheckCheck
          className={cn(
            "w-3.5 h-3.5",
            "text-white/70 dark:text-white/60"
          )}
          strokeWidth={2.5}
        />
      ) : (
        // One gray tick - Message sent (recipient offline)
        <Check
          className={cn(
            "w-3.5 h-3.5",
            "text-white/60 dark:text-white/50"
          )}
          strokeWidth={2.5}
        />
      )}
    </div>
  );
}

