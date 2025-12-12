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

// Components
export { VideoCallProvider, useVideoCallContext } from './components/video-call-provider';
export { IncomingCallDialog } from './components/incoming-call-dialog';
// VideoCallModal and ResizableVideoCallWindow are now replaced by /call/[callId] route
export { ParticipantVideo } from './components/participant-video';
export { ParticipantGrid } from './components/participant-grid';
export { CallControls } from './components/call-controls';
export { DeviceSettings } from './components/device-settings';
export { CallQualityIndicator } from './components/call-quality-indicator';
export { JoinCallButton } from './components/join-call-button';
export { ParticipantListPanel } from './components/participant-list-panel';
export { ReactionsPicker } from './components/reactions-picker';
export { ViewModeSelector } from './components/view-mode-selector';
export { SpeakerView } from './components/speaker-view';

// Hooks
export { useVideoCall } from './hooks/use-video-call';
export { useMediaStream } from './hooks/use-media-stream';
export { usePeerConnection } from './hooks/use-peer-connection';
