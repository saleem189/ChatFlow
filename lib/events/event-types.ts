// ================================
// Event Types
// ================================
// Type-safe event payload definitions for the event bus

/**
 * Event payload type map
 * Defines the data structure for each event type
 */
export interface EventDataMap {
  'user.registered': {
    userId: string;
    email: string;
    name: string;
    timestamp?: number;
  };
  'user.password-reset-requested': {
    userId: string;
    email: string;
    resetToken: string;
    resetUrl: string;
    timestamp?: number;
  };
  'user.email-verification-requested': {
    userId: string;
    email: string;
    verificationToken: string;
    verificationUrl: string;
    timestamp?: number;
  };
  'email.notification': {
    email: string;
    subject: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    timestamp?: number;
  };
  'message.created': {
    messageId: string;
    roomId: string;
    senderId: string;
    content: string;
    timestamp?: number;
  };
  'message.updated': {
    messageId: string;
    roomId: string;
    senderId: string;
    content: string;
    timestamp?: number;
  };
  'message.deleted': {
    messageId: string;
    roomId: string;
    senderId: string;
    timestamp?: number;
  };
  'room.created': {
    roomId: string;
    name: string;
    isGroup: boolean;
    creatorId: string;
    timestamp?: number;
  };
  'room.updated': {
    roomId: string;
    updates: Record<string, unknown>;
    timestamp?: number;
  };
  'room.deleted': {
    roomId: string;
    timestamp?: number;
  };
  'user.status-changed': {
    userId: string;
    status: 'ONLINE' | 'OFFLINE' | 'AWAY';
    timestamp?: number;
  };
  'push.notification-sent': {
    userId: string;
    notificationId: string;
    success: boolean;
    timestamp?: number;
  };
}

/**
 * Event name type (all possible event names)
 */
export type EventName = keyof EventDataMap;

/**
 * Get event data type for a specific event
 */
export type EventData<T extends EventName> = EventDataMap[T];

