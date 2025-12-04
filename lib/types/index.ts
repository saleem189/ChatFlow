// ================================
// Type Exports
// ================================
// Barrel export for all shared types

// Message types
export type {
  MessageStatus,
  MessageType,
  ReplyToMessage,
  MessageReactionUser,
  MessageReactions,
  Message,
  MessagePayload,
  PaginatedMessages,
} from './message.types';

// Room types
export type {
  ParticipantRole,
  Participant,
  LastMessage,
  ChatRoom,
  CreateRoomRequest,
  RoomResponse,
} from './room.types';

// Note: UserStatus is exported from user.types.ts, not room.types.ts

// User types
export type {
  UserRole,
  User,
  UserDisplay,
  RegisterUserData,
  LoginUserData,
  UpdateUserProfileData,
} from './user.types';

// API types
export type {
  ApiError,
  ApiSuccess,
  PaginationParams,
  SearchParams,
  FileUploadResponse,
} from './api.types';

