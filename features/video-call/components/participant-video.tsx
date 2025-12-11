// ================================
// Participant Video Component
// ================================
// Individual participant video view

"use client";

import { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, User, Hand } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { VideoCallParticipant } from "../types";

interface ParticipantVideoProps {
  participant: VideoCallParticipant;
  stream: MediaStream | null;
  isLocal?: boolean;
  isActiveSpeaker?: boolean;
  className?: string;
}

export function ParticipantVideo({
  participant,
  stream,
  isLocal = false,
  isActiveSpeaker = false,
  className,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((error) => {
        // AbortError is harmless - it occurs when the video source changes quickly
        // This is common during WebRTC stream updates
        if (error.name !== 'AbortError') {
          console.error('Error playing video:', error);
        }
      });

      // Check if video track is enabled
      const videoTrack = stream.getVideoTracks()[0];
      setIsVideoVisible(videoTrack?.enabled ?? false);
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
      setIsVideoVisible(false);
    }
  }, [stream]);

  // Update video visibility when track is enabled/disabled
  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const handleTrackChange = () => {
          setIsVideoVisible(videoTrack.enabled);
        };
        videoTrack.addEventListener('ended', handleTrackChange);
        videoTrack.addEventListener('mute', handleTrackChange);
        videoTrack.addEventListener('unmute', handleTrackChange);
        return () => {
          videoTrack.removeEventListener('ended', handleTrackChange);
          videoTrack.removeEventListener('mute', handleTrackChange);
          videoTrack.removeEventListener('unmute', handleTrackChange);
        };
      }
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-lg overflow-hidden bg-muted",
        isActiveSpeaker && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video to prevent feedback
        className={cn(
          "w-full h-full object-cover",
          !isVideoVisible && "hidden"
        )}
      />

      {/* Avatar/Placeholder when video is off */}
      {(!isVideoVisible || !stream) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary to-accent">
          <Avatar className="w-20 h-20 border-4 border-background/20">
            <AvatarImage src={participant.avatar || undefined} alt={participant.name} />
            <AvatarFallback className="!bg-gradient-to-br !from-primary !to-accent !text-primary-foreground text-2xl font-semibold">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
            {isLocal && " (You)"}
          </span>
          {participant.handRaised && (
            <Hand className="w-4 h-4 text-yellow-400 animate-pulse" />
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {/* Mute Indicator */}
        {participant.isMuted ? (
          <div className="w-8 h-8 rounded-full bg-destructive/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <MicOff className="w-4 h-4 text-destructive-foreground" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-green-500/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <Mic className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Video Off Indicator */}
        {!participant.isVideoOn && (
          <div className="w-8 h-8 rounded-full bg-muted/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <VideoOff className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Top-Left Indicators (Screen Share & Hand Raised) */}
      <div className="absolute top-2 left-2 flex flex-col gap-2">
        {/* Screen Share Indicator */}
        {participant.isScreenSharing && (
          <div className="px-2 py-1 rounded bg-primary/80 backdrop-blur-sm text-primary-foreground text-xs font-medium shadow-sm">
            Sharing Screen
          </div>
        )}

        {/* Hand Raised Indicator */}
        {participant.handRaised && (
          <div className="px-3 py-1.5 rounded-full bg-yellow-500/90 backdrop-blur-sm text-white text-xs font-semibold shadow-lg flex items-center gap-1.5 animate-pulse">
            <Hand className="w-4 h-4" />
            Hand Raised
          </div>
        )}
      </div>
    </div>
  );
}

