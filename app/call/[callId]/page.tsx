// ================================
// Call Page - Full-Screen Interface
// ================================
// Google Meet-style full-page video call

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VideoCallProvider, useVideoCallContext } from "@/features/video-call";
import { ParticipantGrid } from "@/features/video-call/components/participant-grid";
import { SpeakerView } from "@/features/video-call/components/speaker-view";
import { ViewModeSelector, type ViewMode } from "@/features/video-call/components/view-mode-selector";
import { CallQualityIndicator } from "@/features/video-call/components/call-quality-indicator";
import { ReactionsOverlay, type Reaction } from "@/features/video-call/components/reactions-overlay";
import { useSocket } from "@/hooks/use-socket";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// Lazy load heavy call components for better initial load
const CallControls = dynamic(
  () => import("@/features/video-call/components/call-controls").then((mod) => ({ default: mod.CallControls })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }
);

const ParticipantListPanel = dynamic(
  () => import("@/features/video-call/components/participant-list-panel").then((mod) => ({ default: mod.ParticipantListPanel })),
  { 
    ssr: false 
  }
);

function CallInterface() {
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
    initiateCall,
    acceptCall,
  } = useVideoCallContext();

  const { socket } = useSocket({ autoConnect: true });
  const router = useRouter();
  const params = useParams();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  
  const [isParticipantListOpen, setIsParticipantListOpen] = useState(false);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>();
  const [isJoining, setIsJoining] = useState(false);

  // Auto-initiate or accept call when page loads
  useEffect(() => {
    if (activeCall || isJoining) return; // Already in call or joining
    
    const roomId = searchParams.get('room');
    const callType = searchParams.get('type') as 'video' | 'audio' || 'video';
    const shouldAccept = searchParams.get('accept') === 'true';
    const callId = params.callId as string;
    
    if (!roomId) {
      console.error('Missing roomId in URL');
      return;
    }

    console.log(shouldAccept ? 'Accepting call' : 'Initiating call', { roomId, callType, callId });
    setIsJoining(true);
    
    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      const action = shouldAccept ? acceptCall() : initiateCall(roomId, callType);
      
      action
        .then(() => {
          console.log('Call started successfully');
        })
        .catch((error) => {
          console.error('Failed to start call:', error);
          setIsJoining(false);
        });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [activeCall, isJoining, initiateCall, acceptCall, searchParams, params.callId]);
  
  // Reset joining state when call becomes active
  useEffect(() => {
    if (activeCall && isJoining) {
      setIsJoining(false);
    }
  }, [activeCall, isJoining]);

  // Auto-detect active speaker
  useEffect(() => {
    if (!activeCall || viewMode !== "speaker") return;

    const participants = Array.from(activeCall.participants.values());
    if (participants.length === 0) return;

    const unmutedParticipants = participants.filter((p) => !p.isMuted);
    
    if (unmutedParticipants.length > 0) {
      setActiveSpeakerId(unmutedParticipants[0].id);
    } else {
      setActiveSpeakerId(participants[0].id);
    }

    const interval = setInterval(() => {
      const currentParticipants = Array.from(activeCall.participants.values());
      const currentUnmuted = currentParticipants.filter((p) => !p.isMuted);
      if (currentUnmuted.length > 0) {
        setActiveSpeakerId(currentUnmuted[0].id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [viewMode, activeCall]);

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

  const handleReactionComplete = (id: string) => {
    setActiveReactions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleEndCall = () => {
    endCall();
    // Close the tab after a short delay
    setTimeout(() => {
      window.close();
    }, 500);
  };

  // Handle browser close/refresh - leave call
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeCall) {
        endCall();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeCall, endCall]);

  if (!activeCall || callStatus === 'idle' || isJoining) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-center space-y-4">
          {(callStatus === 'initiating' || callStatus === 'ringing' || isJoining) ? (
            <>
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-foreground font-medium">
                {callStatus === 'ringing' ? 'Connecting...' : 'Joining call...'}
              </div>
              <p className="text-sm text-muted-foreground">
                Setting up your video connection
              </p>
            </>
          ) : (
            <>
              <div className="text-muted-foreground">
                No active call
              </div>
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const participants = Array.from(activeCall.participants.values());
  const hostId = participants[0]?.userId;

  return (
    <div className="h-screen flex flex-col bg-muted">
      {/* Top Bar */}
      <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {activeCall.callType === 'video' ? 'Video' : 'Audio'} Call
          </h1>
          
          {/* Participant Count Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 gap-2"
                  onClick={() => setIsParticipantListOpen(true)}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{participants.length}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View participants</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Selector */}
          {participants.length > 1 && (
            <ViewModeSelector
              value={viewMode}
              onChange={setViewMode}
              className="h-8 text-sm min-w-[140px]"
            />
          )}
          
          {/* Call Quality Indicator */}
          <CallQualityIndicator />
        </div>
      </header>

      {/* Main Video Area */}
      <main className="flex-1 overflow-hidden p-4 relative">
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
      </main>

      {/* Bottom Controls Bar */}
      <footer className="h-20 bg-background border-t border-border flex items-center justify-center flex-shrink-0">
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
          onEndCall={handleEndCall}
        />
      </footer>

      {/* Participant List Panel */}
      <ParticipantListPanel
        participants={participants}
        currentUserId={currentUserId}
        hostId={hostId}
        isOpen={isParticipantListOpen}
        onClose={() => setIsParticipantListOpen(false)}
      />
    </div>
  );
}

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const callId = params.callId as string;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/call/${callId}`);
    }
  }, [status, router, callId]);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <VideoCallProvider
      currentUserId={session.user.id}
      currentUserName={session.user.name || "Unknown"}
      currentUserAvatar={session.user.image}
    >
      <CallInterface />
    </VideoCallProvider>
  );
}

