// ================================
// Pinned Messages Panel Component
// ================================
// Displays list of pinned messages in a room

"use client";

import { useState } from "react";
import { Pin, X, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { formatMessageTime } from "@/lib/utils";
import type { PinnedMessage } from "./types";

interface PinnedMessagesPanelProps {
    pinnedMessages: PinnedMessage[];
    onUnpin: (messageId: string) => void;
    onJumpToMessage: (messageId: string) => void;
    canUnpin: boolean;
    isLoading?: boolean;
}

export function PinnedMessagesPanel({
    pinnedMessages,
    onUnpin,
    onJumpToMessage,
    canUnpin,
    isLoading = false,
}: PinnedMessagesPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (pinnedMessages.length === 0 && !isLoading) {
        return null;
    }

    const displayedMessages = isExpanded
        ? pinnedMessages
        : pinnedMessages.slice(0, 1);

    return (
        <div className={cn(
            "bg-amber-500/10 border-b border-amber-500/30",
            "transition-all duration-300"
        )}>
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-2",
                    "hover:bg-amber-500/20 transition-colors"
                )}
            >
                <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        {pinnedMessages.length} Pinned Message{pinnedMessages.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {pinnedMessages.length > 1 && (
                    isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-600" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-amber-600" />
                    )
                )}
            </button>

            {/* Messages List */}
            <div className={cn(
                "overflow-hidden transition-all duration-300",
                isExpanded ? "max-h-64 overflow-y-auto" : "max-h-20"
            )}>
                {displayedMessages.map((pin) => (
                    <div
                        key={pin.id}
                        className={cn(
                            "flex items-start gap-3 px-4 py-2",
                            "hover:bg-amber-500/10 transition-colors",
                            "border-t border-amber-500/20 first:border-t-0"
                        )}
                    >
                        {/* Avatar */}
                        <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={pin.message.senderAvatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs">
                                {getInitials(pin.message.senderName)}
                            </AvatarFallback>
                        </Avatar>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                                    {pin.message.senderName}
                                </span>
                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                    {formatMessageTime(pin.message.createdAt)}
                                </span>
                            </div>
                            <p className="text-sm text-amber-800 dark:text-amber-200 line-clamp-2">
                                {pin.message.content || (pin.message.fileUrl ? "📎 Attachment" : "")}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => onJumpToMessage(pin.messageId)}
                                className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center",
                                    "text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200",
                                    "hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                                )}
                                title="Jump to message"
                            >
                                <MessageSquare className="w-4 h-4" />
                            </button>
                            {canUnpin && (
                                <button
                                    onClick={() => onUnpin(pin.messageId)}
                                    className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center",
                                        "text-amber-600 hover:text-red-600 dark:text-amber-400 dark:hover:text-red-400",
                                        "hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                                    )}
                                    title="Unpin message"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
