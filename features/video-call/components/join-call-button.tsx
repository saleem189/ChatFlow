// ================================
// Join Call Button Component
// ================================
// Button to join an active group call

"use client";

import { Phone, Video, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVideoCallContext } from "./video-call-provider";
import type { CallType } from "../hooks/use-video-call";

interface JoinCallButtonProps {
  callId: string;
  roomId: string;
  callType: CallType;
  participantCount: number;
  className?: string;
}

export function JoinCallButton({
  callId,
  roomId,
  callType,
  participantCount,
  className,
}: JoinCallButtonProps) {
  const { joinCall, callStatus } = useVideoCallContext();

  const isJoining = callStatus === "initiating";

  const handleJoin = () => {
    joinCall(callId, roomId, callType);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center animate-pulse">
          {callType === "video" ? (
            <Video className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Phone className="w-5 h-5 text-primary-foreground" />
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {callType === "video" ? "Video" : "Audio"} Call in Progress
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </Badge>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        </div>
      </div>

      <Button
        onClick={handleJoin}
        disabled={isJoining}
        className="bg-primary hover:bg-primary/90 shadow-lg"
      >
        {isJoining ? (
          <>Joining...</>
        ) : (
          <>
            <Phone className="w-4 h-4 mr-2" />
            Join Call
          </>
        )}
      </Button>
    </div>
  );
}

