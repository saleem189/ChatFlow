// ================================
// useMentions Hook
// ================================
// Hook for managing @mentions in text input

"use client";

import { useState, useCallback, useMemo } from "react";
import type { MentionableUser } from "./types";
import { getMentionContext, insertMention } from "./types";

interface UseMentionsOptions {
    users: MentionableUser[];
    onMentionInsert?: (userId: string) => void;
}

interface UseMentionsReturn {
    // State
    isOpen: boolean;
    query: string;
    selectedIndex: number;
    filteredUsers: MentionableUser[];
    triggerPosition: number | null;

    // Actions
    handleTextChange: (text: string, cursorPosition: number) => void;
    handleKeyDown: (e: React.KeyboardEvent, text: string, cursorPosition: number) => {
        preventDefault: boolean;
        newText?: string;
        newCursorPosition?: number
    };
    selectUser: (user: MentionableUser, text: string, cursorPosition: number) => {
        newText: string;
        newCursorPosition: number;
    };
    close: () => void;
}

export function useMentions({ users, onMentionInsert }: UseMentionsOptions): UseMentionsReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [triggerPosition, setTriggerPosition] = useState<number | null>(null);

    // Filter users based on query
    const filteredUsers = useMemo(() => {
        if (!query) return users.slice(0, 5);
        return users
            .filter(user => user.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
    }, [users, query]);

    // Handle text changes to detect @ trigger
    const handleTextChange = useCallback((text: string, cursorPosition: number) => {
        const context = getMentionContext(text, cursorPosition);

        if (context && context.isInMention) {
            setIsOpen(true);
            setQuery(context.query);
            setTriggerPosition(context.triggerPosition);
            setSelectedIndex(0);
        } else {
            setIsOpen(false);
            setQuery("");
            setTriggerPosition(null);
        }
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((
        e: React.KeyboardEvent,
        text: string,
        cursorPosition: number
    ): { preventDefault: boolean; newText?: string; newCursorPosition?: number } => {
        if (!isOpen) {
            return { preventDefault: false };
        }

        switch (e.key) {
            case "ArrowDown":
                setSelectedIndex(prev =>
                    prev < filteredUsers.length - 1 ? prev + 1 : 0
                );
                return { preventDefault: true };

            case "ArrowUp":
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredUsers.length - 1
                );
                return { preventDefault: true };

            case "Enter":
            case "Tab":
                if (filteredUsers[selectedIndex] && triggerPosition !== null) {
                    const result = insertMention(
                        text,
                        cursorPosition,
                        filteredUsers[selectedIndex],
                        triggerPosition
                    );
                    setIsOpen(false);
                    setQuery("");
                    setTriggerPosition(null);
                    onMentionInsert?.(filteredUsers[selectedIndex].id);
                    return {
                        preventDefault: true,
                        newText: result.newText,
                        newCursorPosition: result.newCursorPosition,
                    };
                }
                return { preventDefault: true };

            case "Escape":
                setIsOpen(false);
                return { preventDefault: true };

            default:
                return { preventDefault: false };
        }
    }, [isOpen, filteredUsers, selectedIndex, triggerPosition, onMentionInsert]);

    // Select a user from the list
    const selectUser = useCallback((
        user: MentionableUser,
        text: string,
        cursorPosition: number
    ): { newText: string; newCursorPosition: number } => {
        if (triggerPosition === null) {
            return { newText: text, newCursorPosition: cursorPosition };
        }

        const result = insertMention(text, cursorPosition, user, triggerPosition);
        setIsOpen(false);
        setQuery("");
        setTriggerPosition(null);
        onMentionInsert?.(user.id);

        return result;
    }, [triggerPosition, onMentionInsert]);

    // Close the suggestions
    const close = useCallback(() => {
        setIsOpen(false);
        setQuery("");
        setTriggerPosition(null);
    }, []);

    return {
        isOpen,
        query,
        selectedIndex,
        filteredUsers,
        triggerPosition,
        handleTextChange,
        handleKeyDown,
        selectUser,
        close,
    };
}
