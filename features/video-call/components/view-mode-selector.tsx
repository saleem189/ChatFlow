// ================================
// View Mode Selector Component
// ================================
// Toggle between Gallery and Speaker view

"use client";

import { Grid3x3, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ViewMode = "gallery" | "speaker";

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeSelector({ value, onChange, className }: ViewModeSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ViewMode)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="gallery">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            Gallery View
          </div>
        </SelectItem>
        <SelectItem value="speaker">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Speaker View
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

