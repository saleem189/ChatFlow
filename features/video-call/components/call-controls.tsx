// ================================
// Call Controls Component
// ================================
// Control buttons for video calls

"use client";

import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Settings, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReactionsPicker } from "./reactions-picker";
import { useState } from "react";

// Lazy load DeviceSettings - only loaded when settings dialog opens
const DeviceSettings = dynamic(
  () => import("./device-settings").then((mod) => ({ default: mod.DeviceSettings })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
);

interface CallControlsProps {
  isMuted: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onSendReaction: (emoji: string) => void;
  onEndCall: () => void;
  className?: string;
}

export function CallControls({
  isMuted,
  hasVideo,
  isScreenSharing,
  isHandRaised,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onSendReaction,
  onEndCall,
  className,
}: CallControlsProps) {
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  
  return (
    <TooltipProvider>
      <div className={cn("flex items-center justify-center gap-2 p-4 bg-background/80 backdrop-blur-sm border-t border-border", className)}>
        {/* Mute/Unmute Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={onToggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
        </Tooltip>

        {/* Video Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={!hasVideo ? "destructive" : "secondary"}
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={onToggleVideo}
            >
              {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hasVideo ? "Turn off video" : "Turn on video"}</TooltipContent>
        </Tooltip>

        {/* Screen Share Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="icon"
              className={cn(
                "w-12 h-12 rounded-full",
                isScreenSharing && "bg-primary hover:bg-primary/90"
              )}
              onClick={onToggleScreenShare}
            >
              {isScreenSharing ? (
                <MonitorOff className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isScreenSharing ? "Stop sharing screen" : "Share screen"}</TooltipContent>
        </Tooltip>

        {/* Hand Raise Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isHandRaised ? "default" : "secondary"}
              size="icon"
              className={cn(
                "w-12 h-12 rounded-full transition-all",
                isHandRaised && "animate-pulse bg-primary hover:bg-primary/90"
              )}
              onClick={onToggleHandRaise}
            >
              <Hand className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isHandRaised ? "Lower hand" : "Raise hand"}</TooltipContent>
        </Tooltip>

        {/* Reactions Picker */}
        <ReactionsPicker onReaction={onSendReaction} />

        {/* Settings Menu */}
        <Dialog open={showDeviceSettings} onOpenChange={setShowDeviceSettings}>
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="w-12 h-12 rounded-full"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Call Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DialogTrigger asChild>
                  <DropdownMenuItem>
                    <Mic className="w-4 h-4 mr-2" />
                    Audio & Video Devices
                  </DropdownMenuItem>
                </DialogTrigger>
                <DropdownMenuItem disabled>
                  <Monitor className="w-4 h-4 mr-2" />
                  Quality Settings
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced Options
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>Call settings</TooltipContent>
          </Tooltip>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Device Settings</DialogTitle>
            </DialogHeader>
            <DeviceSettings />
          </DialogContent>
        </Dialog>

        {/* End Call Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={onEndCall}
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>End call</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

