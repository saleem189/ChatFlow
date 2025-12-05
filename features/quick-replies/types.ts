// ================================
// Quick Reply Templates Feature - Types
// ================================
// Types for canned responses / quick replies

/**
 * Quick reply template
 */
export interface QuickReplyTemplate {
    id: string;
    label: string;
    content: string;
    shortcut?: string; // Optional keyboard shortcut like "/thanks"
    category?: string;
    isGlobal: boolean; // Available to all users or user-specific
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Category for organizing templates
 */
export interface TemplateCategory {
    id: string;
    name: string;
    icon?: string;
    order: number;
}

/**
 * Default templates for quick responses
 */
export const DEFAULT_QUICK_REPLIES: Omit<QuickReplyTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        label: "Thanks!",
        content: "Thank you! I appreciate it. 🙏",
        shortcut: "/thanks",
        category: "Gratitude",
        isGlobal: true,
    },
    {
        label: "Be right back",
        content: "I'll be right back, give me a moment!",
        shortcut: "/brb",
        category: "Status",
        isGlobal: true,
    },
    {
        label: "On my way",
        content: "I'm on my way! Be there soon. 🚗",
        shortcut: "/omw",
        category: "Status",
        isGlobal: true,
    },
    {
        label: "Sounds good",
        content: "Sounds good to me! 👍",
        shortcut: "/ok",
        category: "Agreement",
        isGlobal: true,
    },
    {
        label: "Let me check",
        content: "Let me check and get back to you on that.",
        shortcut: "/check",
        category: "Work",
        isGlobal: true,
    },
    {
        label: "Good morning",
        content: "Good morning! ☀️ Hope you have a great day!",
        shortcut: "/gm",
        category: "Greetings",
        isGlobal: true,
    },
    {
        label: "Good night",
        content: "Good night! 🌙 Talk to you tomorrow!",
        shortcut: "/gn",
        category: "Greetings",
        isGlobal: true,
    },
];

/**
 * Get template by shortcut
 */
export function getTemplateByShortcut(
    shortcut: string,
    templates: QuickReplyTemplate[]
): QuickReplyTemplate | undefined {
    return templates.find(t => t.shortcut === shortcut.toLowerCase());
}

/**
 * Check if text starts with a template shortcut
 */
export function detectShortcut(text: string): string | null {
    const match = text.match(/^\/(\w+)$/);
    return match ? `/${match[1]}` : null;
}
