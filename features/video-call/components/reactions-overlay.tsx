// ================================
// Reactions Overlay Component
// ================================
// Manages and displays all floating reactions

"use client";

import { useState, useCallback } from "react";
import { FloatingEmoji } from "./floating-emoji";

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

interface ReactionsOverlayProps {
  reactions: Reaction[];
  onReactionComplete: (id: string) => void;
}

export function ReactionsOverlay({ reactions, onReactionComplete }: ReactionsOverlayProps) {
  // Generate start position for each reaction (spread across bottom)
  const getStartPosition = useCallback((index: number, total: number) => {
    // Spread reactions across 40-60% of screen width (center area)
    const minX = 40;
    const maxX = 60;
    const range = maxX - minX;
    
    if (total === 1) return 50; // Center if only one
    
    return minX + (range / (total - 1)) * index;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {reactions.map((reaction, index) => (
        <FloatingEmoji
          key={reaction.id}
          emoji={reaction.emoji}
          id={reaction.id}
          onComplete={onReactionComplete}
          startX={getStartPosition(index, reactions.length)}
        />
      ))}
    </div>
  );
}

