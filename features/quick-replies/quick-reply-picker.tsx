// ================================
// Quick Reply Picker Component
// ================================
// Dropdown for selecting quick reply templates

"use client";

import { useState, useMemo } from "react";
import { Zap, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuickReplyTemplate } from "./types";

interface QuickReplyPickerProps {
    templates: QuickReplyTemplate[];
    onSelect: (template: QuickReplyTemplate) => void;
    onCreateNew?: () => void;
}

export function QuickReplyPicker({
    templates,
    onSelect,
    onCreateNew,
}: QuickReplyPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter templates by search query
    const filteredTemplates = useMemo(() => {
        if (!searchQuery) return templates;
        const query = searchQuery.toLowerCase();
        return templates.filter(t =>
            t.label.toLowerCase().includes(query) ||
            t.content.toLowerCase().includes(query) ||
            t.shortcut?.toLowerCase().includes(query)
        );
    }, [templates, searchQuery]);

    // Group by category
    const groupedTemplates = useMemo(() => {
        const groups: Record<string, QuickReplyTemplate[]> = {};
        filteredTemplates.forEach(t => {
            const category = t.category || "Other";
            if (!groups[category]) groups[category] = [];
            groups[category].push(t);
        });
        return groups;
    }, [filteredTemplates]);

    const handleSelect = (template: QuickReplyTemplate) => {
        onSelect(template);
        setIsOpen(false);
        setSearchQuery("");
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    isOpen
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                        : "hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                )}
                title="Quick replies"
            >
                <Zap className="w-5 h-5" />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={cn(
                        "absolute bottom-full right-0 mb-2 w-80",
                        "bg-white dark:bg-surface-900 rounded-2xl shadow-2xl",
                        "border border-surface-200 dark:border-surface-800",
                        "z-50 animate-scale-in overflow-hidden"
                    )}>
                        {/* Search */}
                        <div className="p-3 border-b border-surface-200 dark:border-surface-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search templates..."
                                    className={cn(
                                        "w-full pl-9 pr-4 py-2 rounded-lg text-sm",
                                        "bg-surface-100 dark:bg-surface-800",
                                        "border-0 focus:ring-2 focus:ring-primary-500/20",
                                        "placeholder:text-surface-400"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Templates List */}
                        <div className="max-h-64 overflow-y-auto p-2">
                            {Object.entries(groupedTemplates).map(([category, items]) => (
                                <div key={category} className="mb-3 last:mb-0">
                                    <p className="text-xs font-semibold text-surface-500 px-2 py-1">
                                        {category}
                                    </p>
                                    {items.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => handleSelect(template)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg",
                                                "hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-sm font-medium text-surface-900 dark:text-white">
                                                    {template.label}
                                                </span>
                                                {template.shortcut && (
                                                    <span className="text-xs text-surface-400 font-mono">
                                                        {template.shortcut}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-surface-500 line-clamp-1">
                                                {template.content}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            ))}

                            {filteredTemplates.length === 0 && (
                                <p className="text-center text-sm text-surface-500 py-4">
                                    No templates found
                                </p>
                            )}
                        </div>

                        {/* Create New Button */}
                        {onCreateNew && (
                            <div className="p-2 border-t border-surface-200 dark:border-surface-800">
                                <button
                                    onClick={() => {
                                        onCreateNew();
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-2 rounded-lg",
                                        "text-sm font-medium text-primary-600 dark:text-primary-400",
                                        "hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                    )}
                                >
                                    <Plus className="w-4 h-4" />
                                    Create New Template
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
