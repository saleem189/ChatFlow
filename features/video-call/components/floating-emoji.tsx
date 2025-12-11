// ================================
// Floating Emoji Component
// ================================
// Individual animated emoji that floats up the screen

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingEmojiProps {
  emoji: string;
  id: string;
  onComplete: (id: string) => void;
  startX?: number; // Starting X position (percentage)
}

export function FloatingEmoji({ emoji, id, onComplete, startX = 50 }: FloatingEmojiProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-remove after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete(id);
    }, 4000); // 4 seconds total (3s animation + 1s fade)

    return () => clearTimeout(timer);
  }, [id, onComplete]);

  // Random horizontal drift (-20 to +20 pixels)
  const driftX = Math.random() * 40 - 20;

  return (
    <div
      className={cn(
        "absolute bottom-0 pointer-events-none z-50 text-5xl",
        "transition-all duration-[3000ms] ease-out",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{
        left: `${startX}%`,
        transform: isVisible
          ? `translateY(-80vh) translateX(${driftX}px) scale(1.2)`
          : `translateY(0) translateX(0) scale(1)`,
        animation: "float-wiggle 3s ease-in-out",
      }}
    >
      {emoji}
      <style jsx>{`
        @keyframes float-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}

