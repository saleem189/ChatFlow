// ================================
// Chat Room Not Found Page
// ================================
// Shows when a chat room doesn't exist or user doesn't have access

import Link from "next/link";
import { MessageCircleOff, ArrowLeft } from "lucide-react";

export default function ChatRoomNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface-100/50 dark:bg-surface-900/50">
      <div className="text-center max-w-md px-6 animate-fade-in">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <MessageCircleOff className="w-10 h-10 text-red-500" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">
          Chat Not Found
        </h2>

        {/* Description */}
        <p className="text-surface-600 dark:text-surface-400 mb-6">
          This chat room doesn&apos;t exist or you don&apos;t have permission to
          access it.
        </p>

        {/* Back Button */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Chats
        </Link>
      </div>
    </div>
  );
}

