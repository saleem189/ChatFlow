// ================================
// Speaker View Component
// ================================
// Large tile for active speaker, small tiles for others

"use client";

import { cn } from "@/lib/utils";
import { ParticipantVideo } from "./participant-video";
import type { VideoCallParticipant } from "../types";

interface SpeakerViewProps {
  participants: VideoCallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  currentUserId: string;
  activeSpeakerId?: string;
  className?: string;
}

export function SpeakerView({
  participants,
  localStream,
  remoteStreams,
  currentUserId,
  activeSpeakerId,
  className,
}: SpeakerViewProps) {
  // Determine active speaker (fallback to first participant)
  const activeSpeaker =
    participants.find((p) => p.id === activeSpeakerId) || participants[0];
  const otherParticipants = participants.filter((p) => p.id !== activeSpeaker?.id);

  // Get stream for active speaker
  const activeStream =
    activeSpeaker?.userId === currentUserId
      ? localStream
      : remoteStreams.get(activeSpeaker?.userId || "");

  return (
    <div className={cn("flex flex-col h-full gap-2", className)}>
      {/* Main Speaker (Large) */}
      {activeSpeaker && (
        <div className="flex-1 min-h-0">
          <ParticipantVideo
            participant={activeSpeaker}
            stream={activeStream || null}
            isLocal={activeSpeaker.userId === currentUserId}
            isActiveSpeaker={true}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Other Participants (Small tiles at bottom) */}
      {otherParticipants.length > 0 && (
        <div className="h-32 flex-shrink-0">
          <div className="grid auto-cols-fr grid-flow-col gap-2 h-full">
            {otherParticipants.slice(0, 5).map((participant) => {
              const stream =
                participant.userId === currentUserId
                  ? localStream
                  : remoteStreams.get(participant.userId);

              return (
                <ParticipantVideo
                  key={participant.id}
                  participant={participant}
                  stream={stream || null}
                  isLocal={participant.userId === currentUserId}
                  className="w-full h-full"
                />
              );
            })}
            
            {/* Show overflow indicator if more than 5 others */}
            {otherParticipants.length > 5 && (
              <div className="flex items-center justify-center bg-muted rounded-lg border border-border">
                <span className="text-sm text-muted-foreground">
                  +{otherParticipants.length - 5} more
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

