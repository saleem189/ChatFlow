// ================================
// Message Actions Component (Edit/Delete)
// ================================

"use client";

import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageActionsProps {
  messageId: string;
  currentContent: string;
  isSent: boolean;
  isDeleted: boolean;
  onEdit?: (messageId: string, currentContent: string) => void;
  onDelete?: (messageId: string) => void;
  onUpdated?: () => void;
}

export function MessageActions({
  messageId,
  currentContent,
  isSent,
  isDeleted,
  onEdit,
  onDelete,
  onUpdated,
}: MessageActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isSent || isDeleted) return null;

  const handleDelete = async (deleteForEveryone: boolean) => {
    if (!confirm(deleteForEveryone ? "Delete this message for everyone?" : "Delete this message?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.delete(`/messages/${messageId}`, {
        body: JSON.stringify({ deleteForEveryone }),
      });

      onDelete?.(messageId);
      onUpdated?.();
    } catch (error) {
      console.error("Error deleting message:", error);
      // Error toast is handled by API client
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
            "hover:scale-110 active:scale-95",
            "bg-white/90 dark:bg-surface-800/90 backdrop-blur-sm",
            "shadow-md border border-surface-200 dark:border-surface-700",
            "hover:bg-white dark:hover:bg-surface-800",
            "text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
          )}
          title="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {onEdit && (
          <DropdownMenuItem
            onClick={() => onEdit(messageId, currentContent)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>Edit message</span>
          </DropdownMenuItem>
        )}
        {onEdit && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => handleDelete(false)}
          disabled={isDeleting}
          className="flex items-center gap-2.5 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete for me</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDelete(true)}
          disabled={isDeleting}
          className="flex items-center gap-2.5 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete for everyone</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

