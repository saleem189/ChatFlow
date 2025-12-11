// ================================
// Participant List Panel Component
// ================================
// Shows all participants in the call with status indicators

"use client";

import { Users, X, Search, Crown, Hand, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";
import type { VideoCallParticipant } from "../types";

interface ParticipantListPanelProps {
  participants: VideoCallParticipant[];
  currentUserId: string;
  hostId?: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ParticipantListPanel({
  participants,
  currentUserId,
  hostId,
  isOpen,
  onClose,
  className,
}: ParticipantListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter participants by search query
  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: hand raised first, then host, then alphabetically
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    // Hand raised participants first
    if (a.handRaised && !b.handRaised) return -1;
    if (!a.handRaised && b.handRaised) return 1;
    
    // Host second
    if (a.userId === hostId && b.userId !== hostId) return -1;
    if (a.userId !== hostId && b.userId === hostId) return 1;
    
    // Alphabetically
    return a.name.localeCompare(b.name);
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className={cn("w-80 p-0", className)}>
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              People ({participants.length})
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Input */}
          {participants.length > 5 && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-2">
            {sortedParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No participants found
              </p>
            ) : (
              sortedParticipants.map((participant) => {
                const isCurrentUser = participant.userId === currentUserId;
                const isHost = participant.userId === hostId;

                return (
                  <div
                    key={participant.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      "hover:bg-accent",
                      isCurrentUser && "bg-primary/10"
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {participant.avatar && (
                        <AvatarImage src={participant.avatar} alt={participant.name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {participant.name}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-1">(You)</span>
                          )}
                        </p>
                        {isHost && (
                          <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" title="Host" />
                        )}
                        {participant.handRaised && (
                          <Hand className="w-4 h-4 text-yellow-500 flex-shrink-0 animate-pulse" title="Hand raised" />
                        )}
                      </div>

                      {/* Status Indicators */}
                      <div className="flex items-center gap-2 mt-1">
                        {/* Mic Status */}
                        {participant.isMuted ? (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                            <MicOff className="w-3 h-3" />
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-green-500/20 text-green-700 dark:text-green-400">
                            <Mic className="w-3 h-3" />
                          </Badge>
                        )}

                        {/* Video Status */}
                        {!participant.isVideoOn && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                            <VideoOff className="w-3 h-3" />
                          </Badge>
                        )}

                        {/* Screen Sharing */}
                        {participant.isScreenSharing && (
                          <Badge className="text-xs h-5">
                            Sharing
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

