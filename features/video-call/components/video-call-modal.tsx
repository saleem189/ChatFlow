// ================================
// Video Call Modal Component
// ================================
// Main video call interface with resizable, draggable window
// Inspired by Zoom, Google Meet, Microsoft Teams UI/UX

"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ParticipantGrid } from "./participant-grid";
import { SpeakerView } from "./speaker-view";
import { ViewModeSelector, type ViewMode } from "./view-mode-selector";
import { CallControls } from "./call-controls";
import { useVideoCallContext } from "./video-call-provider";
import { ResizableVideoCallWindow } from "./resizable-video-call-window";
import { CallQualityIndicator } from "./call-quality-indicator";
import { ParticipantListPanel } from "./participant-list-panel";
import { ReactionsOverlay, type Reaction } from "./reactions-overlay";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSocket } from "@/hooks/use-socket";

export function VideoCallModal() {
  const {
    activeCall,
    callStatus,
    localStream,
    remoteStreams,
    isMuted,
    hasVideo,
    isScreenSharing,
    isHandRaised,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleHandRaise,
    sendReaction,
    endCall,
    currentUserId,
  } = useVideoCallContext();

  const { socket } = useSocket({ autoConnect: true });
  const [isParticipantListOpen, setIsParticipantListOpen] = useState(false);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>();

  // Listen for incoming reactions
  useEffect(() => {
    if (!socket || !activeCall) return;

    const handleReaction = (data: {
      userId: string;
      userName: string;
      emoji: string;
      timestamp: number;
    }) => {
      const newReaction: Reaction = {
        id: `${data.userId}-${data.timestamp}`,
        emoji: data.emoji,
        userId: data.userId,
        userName: data.userName,
        timestamp: data.timestamp,
      };

      setActiveReactions((prev) => [...prev, newReaction]);
    };

    socket.on('call-reaction', handleReaction);

    return () => {
      socket.off('call-reaction', handleReaction);
    };
  }, [socket, activeCall]);

  // Auto-detect active speaker (basic implementation using audio tracks)
  // MUST be before early return to comply with Rules of Hooks
  useEffect(() => {
    if (!activeCall || viewMode !== "speaker") return;

    const participants = Array.from(activeCall.participants.values());
    if (participants.length === 0) return;

    // Simple heuristic: prioritize unmuted participants
    const unmutedParticipants = participants.filter((p) => !p.isMuted);
    
    if (unmutedParticipants.length > 0) {
      // Set first unmuted participant as active speaker
      // In real implementation, analyze audio levels from MediaStream
      setActiveSpeakerId(unmutedParticipants[0].id);
    } else {
      // Fallback to first participant
      setActiveSpeakerId(participants[0].id);
    }

    // Update every 2 seconds
    const interval = setInterval(() => {
      const currentParticipants = Array.from(activeCall.participants.values());
      const currentUnmuted = currentParticipants.filter((p) => !p.isMuted);
      if (currentUnmuted.length > 0) {
        setActiveSpeakerId(currentUnmuted[0].id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [viewMode, activeCall]);

  // Remove completed reactions
  const handleReactionComplete = (id: string) => {
    setActiveReactions((prev) => prev.filter((r) => r.id !== id));
  };

  if (!activeCall || callStatus === 'idle') return null;

  // Get participants array from Map
  const participants = Array.from(activeCall.participants.values());
  
  // Find host ID (first participant or room owner)
  const hostId = participants[0]?.userId;

  // Create window title with participant list toggle and view mode selector
  const windowTitle = (
    <div className="flex items-center gap-2">
      <span>{activeCall.callType === 'video' ? 'Video' : 'Audio'} Call</span>
      
      {/* Participant Count Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
              onClick={() => setIsParticipantListOpen(true)}
            >
              <Users className="w-4 h-4" />
              <span className="text-xs">{participants.length}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>View participants</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* View Mode Selector */}
      {participants.length > 1 && (
        <ViewModeSelector
          value={viewMode}
          onChange={setViewMode}
          className="h-7 text-xs min-w-[140px]"
        />
      )}
      
      {/* Call Quality Indicator */}
      <CallQualityIndicator />
    </div>
  );

  return (
    <>
      <ResizableVideoCallWindow
        title={windowTitle}
        onClose={endCall}
        defaultWidth={900}
        defaultHeight={700}
        minWidth={500}
        minHeight={400}
        className="text-white"
      >
      {/* Video Grid/Speaker View */}
      <div className="flex-1 overflow-hidden p-4 bg-muted relative">
        {participants.length > 0 ? (
          viewMode === "gallery" ? (
            <ParticipantGrid
              participants={participants}
              remoteStreams={remoteStreams}
              localStream={localStream}
              currentUserId={currentUserId}
              className="h-full"
            />
          ) : (
            <SpeakerView
              participants={participants}
              remoteStreams={remoteStreams}
              localStream={localStream}
              currentUserId={currentUserId}
              activeSpeakerId={activeSpeakerId}
              className="h-full"
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Waiting for participants...</p>
            </div>
          </div>
        )}
        
        {/* Reactions Overlay */}
        <ReactionsOverlay
          reactions={activeReactions}
          onReactionComplete={handleReactionComplete}
        />
      </div>

      {/* Controls */}
      <CallControls
        isMuted={isMuted}
        hasVideo={hasVideo}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onToggleHandRaise={toggleHandRaise}
        onSendReaction={sendReaction}
        onEndCall={endCall}
      />
    </ResizableVideoCallWindow>

    {/* Participant List Panel */}
    <ParticipantListPanel
      participants={participants}
      currentUserId={currentUserId}
      hostId={hostId}
      isOpen={isParticipantListOpen}
      onClose={() => setIsParticipantListOpen(false)}
    />
    </>
  );
}

