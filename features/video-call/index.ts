// ================================
// Feature Module - Video Call
// ================================
// Public API for the video call feature
// Only export what other features need to access

// Types
export type {
    VideoCallParticipant,
    VideoCallRoom,
    VideoCallConfig,
    VideoCallEvent,
    VideoCallEventType,
} from './types';

// Constants
export { VIDEO_CALL_DEFAULTS } from './types';

// Utilities
export {
    isCallHost,
    canJoinCall,
    getActiveScreenSharer,
} from './types';

// Components would be exported here when created:
// export { VideoCallProvider } from './components/video-call-provider';
// export { VideoCallControls } from './components/video-call-controls';
// export { ParticipantGrid } from './components/participant-grid';

// Hooks would be exported here when created:
// export { useVideoCall } from './hooks/use-video-call';
// export { useVideoCallParticipants } from './hooks/use-video-call-participants';
