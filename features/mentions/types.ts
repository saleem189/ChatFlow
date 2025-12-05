// ================================
// Mentions Feature - Types
// ================================
// Types for @mention functionality in messages

/**
 * Represents a user that can be mentioned
 */
export interface MentionableUser {
    id: string;
    name: string;
    avatar?: string | null;
    email?: string;
    isOnline?: boolean;
}

/**
 * Represents a mention in a message
 */
export interface Mention {
    userId: string;
    userName: string;
    startIndex: number;
    endIndex: number;
}

/**
 * Mention suggestion state for autocomplete
 */
export interface MentionSuggestion {
    isOpen: boolean;
    query: string;
    position: { top: number; left: number };
    selectedIndex: number;
}

/**
 * Constants for mention detection
 */
export const MENTION_TRIGGER = '@';
export const MENTION_REGEX = /@(\w+)/g;
export const MENTION_DISPLAY_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse mentions from raw text (editing format)
 * Format: @[Username](userId)
 */
export function parseMentions(text: string): Mention[] {
    const mentions: Mention[] = [];
    let match;

    while ((match = MENTION_DISPLAY_REGEX.exec(text)) !== null) {
        mentions.push({
            userId: match[2],
            userName: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
        });
    }

    return mentions;
}

/**
 * Convert display mentions to plain text for display
 * @[Username](userId) -> @Username
 */
export function mentionsToDisplayText(text: string): string {
    return text.replace(MENTION_DISPLAY_REGEX, '@$1');
}

/**
 * Extract user IDs from mentions in text
 */
export function extractMentionedUserIds(text: string): string[] {
    const mentions = parseMentions(text);
    return mentions.map(m => m.userId);
}

/**
 * Insert a mention into text at cursor position
 */
export function insertMention(
    text: string,
    cursorPosition: number,
    user: MentionableUser,
    triggerStartPosition: number
): { newText: string; newCursorPosition: number } {
    const beforeTrigger = text.slice(0, triggerStartPosition);
    const afterCursor = text.slice(cursorPosition);
    const mentionText = `@[${user.name}](${user.id}) `;

    return {
        newText: beforeTrigger + mentionText + afterCursor,
        newCursorPosition: triggerStartPosition + mentionText.length,
    };
}

/**
 * Check if cursor is in a mention trigger context
 */
export function getMentionContext(
    text: string,
    cursorPosition: number
): { isInMention: boolean; query: string; triggerPosition: number } | null {
    // Look backwards from cursor to find @ trigger
    let i = cursorPosition - 1;
    let query = '';

    while (i >= 0) {
        const char = text[i];

        // Found the trigger
        if (char === '@') {
            // Check if it's at start or preceded by whitespace
            if (i === 0 || /\s/.test(text[i - 1])) {
                return {
                    isInMention: true,
                    query: query.split('').reverse().join(''),
                    triggerPosition: i,
                };
            }
            break;
        }

        // Break on whitespace or special chars (except alphanumeric)
        if (!/\w/.test(char)) {
            break;
        }

        query += char;
        i--;
    }

    return null;
}
