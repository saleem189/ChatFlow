// ================================
// Service Interfaces
// ================================
// Type definitions for services in the DI container
// Ensures type safety when using getService()

import type { Room, Message } from '@prisma/client';

/**
 * Room with messages and participants
 * Extends Prisma Room model with relations
 */
export interface RoomWithMessages extends Omit<Room, 'createdAt' | 'updatedAt'> {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  isGroup: boolean;
  ownerId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  messages: Array<Message & {
    sender: {
      id: string;
      name: string;
      avatar: string | null;
    };
    reactions: Array<{
      emoji: string;
      user: {
        id: string;
        name: string;
        avatar: string | null;
      };
    }>;
    readReceipts: Array<{
      id: string;
      userId: string;
      readAt: Date | string;
    }>;
    replyTo: {
      id: string;
      content: string;
      sender: {
        id: string;
        name: string;
        avatar: string | null;
      };
    } | null;
  }>;
  participants: Array<{
    user: {
      id: string;
      name: string;
      avatar: string | null;
      status: string;
      lastSeen?: Date | string;
    };
    role: string;
  }>;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

/**
 * Room Service Interface
 */
export interface IRoomService {
  getRoomWithMessages(roomId: string, userId: string, limit: number): Promise<RoomWithMessages | null>;
  // Add other methods as needed
}

/**
 * Message Service Interface
 */
export interface IMessageService {
  // Add methods as needed
}

/**
 * User Service Interface
 */
export interface IUserService {
  // Add methods as needed
}

/**
 * Admin Service Interface
 */
export interface IAdminService {
  // Add methods as needed
}

/**
 * Service type map for type-safe service resolution
 */
export interface ServiceMap {
  roomService: IRoomService;
  messageService: IMessageService;
  userService: IUserService;
  adminService: IAdminService;
  // Add other services as needed
}

/**
 * Service key type
 */
export type ServiceKey = keyof ServiceMap;

