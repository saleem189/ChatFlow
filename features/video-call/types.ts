// ================================
// Feature Module Pattern Example
// ================================
// This template shows how to structure new features
// for maximum reusability and maintainability

// Feature types - define all types specific to this feature
export interface VideoCallParticipant {
    id: string;
    userId: string;
    name: string;
    avatar?: string | null;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
    handRaised: boolean;
    handRaisedAt?: Date;
    joinedAt: Date;
}

export interface VideoCallRoom {
    id: string;
    roomId: string;
    participants: VideoCallParticipant[];
    hostId: string;
    isRecording: boolean;
    startedAt: Date;
    maxParticipants: number;
}

export interface VideoCallConfig {
    maxParticipants?: number;
    enableRecording?: boolean;
    enableScreenShare?: boolean;
    enableChat?: boolean;
    defaultMuted?: boolean;
    defaultVideoOff?: boolean;
}

// Feature events - for real-time updates
export type VideoCallEventType =
    | 'participant-joined'
    | 'participant-left'
    | 'participant-muted'
    | 'participant-unmuted'
    | 'video-enabled'
    | 'video-disabled'
    | 'screen-share-started'
    | 'screen-share-stopped'
    | 'hand-raised'
    | 'hand-lowered'
    | 'recording-started'
    | 'recording-stopped'
    | 'call-ended';

export interface VideoCallEvent {
    type: VideoCallEventType;
    participantId?: string;
    timestamp: Date;
    data?: Record<string, unknown>;
}

// Feature constants
export const VIDEO_CALL_DEFAULTS: VideoCallConfig = {
    maxParticipants: 10,
    enableRecording: false,
    enableScreenShare: true,
    enableChat: true,
    defaultMuted: true,
    defaultVideoOff: false,
};

// Feature utility functions
export function isCallHost(call: VideoCallRoom, userId: string): boolean {
    return call.hostId === userId;
}

export function canJoinCall(call: VideoCallRoom): boolean {
    return call.participants.length < call.maxParticipants;
}

export function getActiveScreenSharer(call: VideoCallRoom): VideoCallParticipant | undefined {
    return call.participants.find(p => p.isScreenSharing);
}
