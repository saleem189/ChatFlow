// ================================
// Reactions Picker Component
// ================================
// Emoji picker for quick reactions during calls

"use client";

import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ReactionsPickerProps {
  onReaction: (emoji: string) => void;
  className?: string;
}

// Industry-standard quick reactions (Zoom, Teams, Meet)
const QUICK_REACTIONS = [
  { emoji: "👍", label: "Thumbs Up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "😮", label: "Surprised" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "👋", label: "Wave" },
];

export function ReactionsPicker({ onReaction, className }: ReactionsPickerProps) {
  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn("w-12 h-12 rounded-full", className)}
              >
                <Smile className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>Send reaction</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className="w-auto p-2"
        align="end"
        sideOffset={8}
      >
        <div className="grid grid-cols-4 gap-1">
          {QUICK_REACTIONS.map(({ emoji, label }) => (
            <Button
              key={emoji}
              variant="ghost"
              size="icon"
              className="w-12 h-12 text-2xl hover:bg-accent hover:scale-110 transition-transform"
              onClick={() => onReaction(emoji)}
              title={label}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

