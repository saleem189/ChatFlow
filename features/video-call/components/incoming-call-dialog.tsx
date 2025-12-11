// ================================
// Incoming Call Dialog Component
// ================================
// Dialog shown when receiving an incoming call

"use client";

import { useEffect, useRef } from "react";
import { Phone, Video, X, PhoneCall } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn, getInitials } from "@/lib/utils";
import { useVideoCallContext } from "./video-call-provider";
import { notifyIncomingCall } from "@/lib/utils/call-notifications";

export function IncomingCallDialog() {
  const { incomingCall, acceptCall, rejectCall } = useVideoCallContext();
  const notificationRef = useRef<{ stopRingtone: () => void } | null>(null);

  // Show notification and play ringtone when call comes in
  useEffect(() => {
    if (incomingCall) {
      notifyIncomingCall(
        incomingCall.fromName,
        incomingCall.callType,
        acceptCall,
        rejectCall
      ).then((result) => {
        notificationRef.current = result;
      });
    }

    // Cleanup on unmount or when call changes
    return () => {
      if (notificationRef.current) {
        notificationRef.current.stopRingtone();
        notificationRef.current = null;
      }
    };
  }, [incomingCall, acceptCall, rejectCall]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    notificationRef.current?.stopRingtone();
    
    // Open call in new tab (the tab will handle accepting)
    window.open(`/call/${incomingCall.callId}?type=${incomingCall.callType}&room=${incomingCall.roomId}&accept=true`, '_blank');
    
    // Also accept via socket to notify other participants
    acceptCall();
  };

  const handleReject = () => {
    notificationRef.current?.stopRingtone();
    rejectCall();
  };

  return (
    <Dialog open={!!incomingCall} onOpenChange={(open) => !open && rejectCall()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">
          Incoming {incomingCall.callType === 'video' ? 'video' : 'audio'} call from {incomingCall.fromName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          You have an incoming {incomingCall.callType === 'video' ? 'video' : 'audio'} call from {incomingCall.fromName}. You can accept or decline the call.
        </DialogDescription>
        <div className="flex flex-col items-center gap-6 p-6">
          {/* Caller Avatar */}
          <div className="relative">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20 animate-pulse">
              <AvatarImage src={incomingCall.fromAvatar || undefined} alt={incomingCall.fromName} />
              <AvatarFallback className="!bg-gradient-to-br !from-primary !to-accent !text-primary-foreground text-2xl font-semibold">
                {getInitials(incomingCall.fromName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-bounce shadow-lg">
              {incomingCall.callType === 'video' ? (
                <Video className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Phone className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
          </div>

          {/* Caller Info */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              {incomingCall.fromName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Incoming {incomingCall.callType === 'video' ? 'video' : 'audio'} call
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 w-full">
            {/* Reject Button */}
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 h-14 rounded-full"
              onClick={handleReject}
            >
              <X className="w-5 h-5 mr-2" />
              Decline
            </Button>

            {/* Accept Button */}
            <Button
              variant="default"
              size="lg"
              className="flex-1 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              onClick={handleAccept}
            >
              <PhoneCall className="w-5 h-5 mr-2" />
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

