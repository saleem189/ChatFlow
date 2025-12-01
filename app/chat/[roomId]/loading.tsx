// ================================
// Chat Room Loading State
// ================================
// Shows a skeleton while chat room data is loading

import { Loader2 } from "lucide-react";

export default function ChatRoomLoading() {
  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            <div className="h-3 w-20 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-9 h-9 rounded-lg bg-surface-200 dark:bg-surface-700 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Messages Loading */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Loading messages...
          </p>
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="px-4 py-3 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800">
        <div className="flex items-end gap-2">
          <div className="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700 animate-pulse" />
          <div className="flex-1 h-12 rounded-2xl bg-surface-200 dark:bg-surface-700 animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

