// ================================
// Mention Suggestions Component
// ================================
// Autocomplete dropdown for @mentions

"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { MentionableUser } from "./types";

interface MentionSuggestionsProps {
    users: MentionableUser[];
    query?: string; // Optional - filtering may be done by hook
    selectedIndex: number;
    position?: { top: number; left: number }; // Optional - defaults to above input
    onSelect: (user: MentionableUser) => void;
    onClose: () => void;
}

export function MentionSuggestions({
    users,
    query = "",
    selectedIndex,
    position,
    onSelect,
    onClose,
}: MentionSuggestionsProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter users based on query (if query provided and users not pre-filtered)
    const filteredUsers = query
        ? users.filter(user =>
            user.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5)
        : users.slice(0, 5); // Assume pre-filtered

    // Scroll selected item into view
    useEffect(() => {
        if (containerRef.current) {
            const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (filteredUsers.length === 0) {
        return null;
    }

    // Position styles
    const positionStyles = position
        ? { bottom: `calc(100% + 8px)`, left: position.left }
        : { bottom: `calc(100% + 8px)`, left: 0 };

    return (
        <div
            ref={containerRef}
            className={cn(
                "absolute z-50 w-64 max-h-48 overflow-y-auto",
                "bg-white dark:bg-surface-900 rounded-xl shadow-xl",
                "border border-surface-200 dark:border-surface-700",
                "animate-scale-in"
            )}
            style={positionStyles}
        >
            <div className="p-1.5">
                <p className="text-xs text-surface-500 px-2 py-1 font-medium">
                    Mention someone
                </p>
                {filteredUsers.map((user, index) => (
                    <button
                        key={user.id}
                        onClick={() => onSelect(user)}
                        className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors",
                            index === selectedIndex
                                ? "bg-primary-100 dark:bg-primary-900/30"
                                : "hover:bg-surface-100 dark:hover:bg-surface-800"
                        )}
                    >
                        <div className="relative">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                                <AvatarFallback className="bg-gradient-to-br from-primary-400 to-accent-500 text-white text-xs">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            {user.isOnline && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-surface-900" />
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-surface-900 dark:text-white">
                                {user.name}
                            </p>
                            {user.email && (
                                <p className="text-xs text-surface-500 truncate">
                                    {user.email}
                                </p>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
