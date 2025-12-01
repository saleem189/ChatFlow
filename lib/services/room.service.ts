// ================================
// Room Service
// ================================
// Business logic layer for chat rooms

import { RoomRepository, RoomWithRelations } from '@/lib/repositories/room.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { createRoomSchema } from '@/lib/validations';

export class RoomService {
  constructor(
    private roomRepo: RoomRepository,
    private userRepo: UserRepository
  ) {}

  /**
   * Check if user is a room admin (owner or participant with admin role)
   */
  async isRoomAdmin(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepo.findById(roomId);
    if (!room) return false;

    // Room owner is always admin
    if (room.ownerId === userId) return true;

    // Check participant role
    const role = await this.roomRepo.getParticipantRole(roomId, userId);
    return role === 'admin';
  }

  /**
   * Get all rooms for a user
   */
  async getUserRooms(userId: string): Promise<Array<{
    id: string;
    name: string;
    isGroup: boolean;
    lastMessage?: {
      content: string;
      createdAt: string;
      senderName: string;
    };
    participants: Array<{
      id: string;
      name: string;
      avatar: string | null;
      status: string;
    }>;
  }>> {
    const rooms = await this.roomRepo.findByUserId(userId);

    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      isGroup: room.isGroup,
      lastMessage: room.messages[0]
        ? {
            content: room.messages[0].content,
            createdAt: room.messages[0].createdAt.toISOString(),
            senderName: room.messages[0].sender.name,
          }
        : undefined,
      participants: room.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar,
        status: p.user.status || 'offline',
      })),
    }));
  }

  /**
   * Create a direct message (DM) or find existing
   */
  async createOrFindDM(
    userId: string,
    otherUserId: string
  ): Promise<{ room: RoomWithRelations; existing: boolean }> {
    // Validate other user exists
    const otherUser = await this.userRepo.findById(otherUserId);
    if (!otherUser) {
      throw new NotFoundError('User not found');
    }

    // Check if DM already exists
    const existingRooms = await this.roomRepo.findByUserId(userId);
    const existingDM = existingRooms.find(
      (room) =>
        !room.isGroup &&
        room.participants.some((p) => p.user.id === otherUserId) &&
        room.participants.some((p) => p.user.id === userId)
    );

    if (existingDM) {
      return { room: existingDM, existing: true };
    }

    // Create new DM
    const room = await this.roomRepo.create({
      name: otherUser.name || 'Direct Message',
      isGroup: false,
      ownerId: userId,
    });

    // Add participants
    await this.roomRepo.addParticipant(room.id, userId, 'admin');
    await this.roomRepo.addParticipant(room.id, otherUserId, 'member');

    const roomWithRelations = await this.roomRepo.findByIdWithRelations(room.id);
    if (!roomWithRelations) {
      throw new NotFoundError('Failed to retrieve created room');
    }

    return { room: roomWithRelations, existing: false };
  }

  /**
   * Create a group chat
   */
  async createGroup(
    userId: string,
    name: string,
    participantIds: string[],
    description?: string
  ): Promise<RoomWithRelations> {
    // Validate input
    if (!name || name.trim().length < 2) {
      throw new ValidationError('Group name is required (min 2 characters)');
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      throw new ValidationError('Select at least one participant');
    }

    // Filter valid participant IDs
    const validParticipantIds = participantIds.filter(
      (id) => id && typeof id === 'string' && id.trim().length > 0
    );

    if (validParticipantIds.length === 0) {
      throw new ValidationError('Invalid participant IDs');
    }

    // Validate all participants exist
    for (const participantId of validParticipantIds) {
      const user = await this.userRepo.findById(participantId);
      if (!user) {
        throw new NotFoundError(`User ${participantId} not found`);
      }
    }

    // Create group room
    const room = await this.roomRepo.create({
      name: name.trim(),
      description: description?.trim() || null,
      isGroup: true,
      ownerId: userId,
    });

    // Add participants
    await this.roomRepo.addParticipant(room.id, userId, 'admin');
    for (const participantId of validParticipantIds) {
      await this.roomRepo.addParticipant(room.id, participantId, 'member');
    }

    const roomWithRelations = await this.roomRepo.findByIdWithRelations(room.id);
    if (!roomWithRelations) {
      throw new NotFoundError('Failed to retrieve created room');
    }

    return roomWithRelations;
  }

  /**
   * Update room settings (admin only)
   */
  async updateRoom(
    roomId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      avatar?: string;
    }
  ): Promise<RoomWithRelations> {
    // Check if user is admin
    const isAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      throw new ForbiddenError('Only room admins can update room settings');
    }

    // Validate name if provided
    if (updates.name !== undefined && updates.name.trim().length < 2) {
      throw new ValidationError('Room name must be at least 2 characters');
    }

    // Update room
    await this.roomRepo.update(roomId, {
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.description !== undefined && {
        description: updates.description?.trim() || null,
      }),
      ...(updates.avatar !== undefined && { avatar: updates.avatar }),
    });

    const updatedRoom = await this.roomRepo.findByIdWithRelations(roomId);
    if (!updatedRoom) {
      throw new NotFoundError('Room not found');
    }

    return updatedRoom;
  }

  /**
   * Add members to room (admin only)
   */
  async addMembers(
    roomId: string,
    userId: string,
    memberIds: string[]
  ): Promise<{ added: string[] }> {
    // Check if user is admin
    const isAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      throw new ForbiddenError('Only room admins can add members');
    }

    // Validate input
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new ValidationError('userIds array is required');
    }

    // Check if room is a group
    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    if (!room.isGroup) {
      throw new ValidationError('Can only add members to group chats');
    }

    // Add participants
    const added: string[] = [];
    for (const memberId of memberIds) {
      // Validate user exists
      const user = await this.userRepo.findById(memberId);
      if (!user) {
        continue; // Skip invalid users
      }

      // Check if already participant
      const isParticipant = await this.roomRepo.isParticipant(roomId, memberId);
      if (!isParticipant) {
        await this.roomRepo.addParticipant(roomId, memberId, 'member');
        added.push(memberId);
      }
    }

    return { added };
  }

  /**
   * Remove member from room (admin only)
   */
  async removeMember(
    roomId: string,
    userId: string,
    memberIdToRemove: string
  ): Promise<void> {
    // Check if user is admin
    const isAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      throw new ForbiddenError('Only room admins can remove members');
    }

    // Check if trying to remove owner
    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    if (room.ownerId === memberIdToRemove) {
      throw new ValidationError('Cannot remove room owner');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, memberIdToRemove);
    if (!isParticipant) {
      throw new NotFoundError('User is not a member of this room');
    }

    // Remove participant
    await this.roomRepo.removeParticipant(roomId, memberIdToRemove);
  }

  /**
   * Leave room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('You are not a member of this room');
    }

    // Can't leave if you're the owner
    if (room.ownerId === userId) {
      throw new ValidationError('Room owner cannot leave. Transfer ownership first.');
    }

    // Remove participant
    await this.roomRepo.removeParticipant(roomId, userId);
  }

  /**
   * Get room by ID with relations
   */
  async getRoomById(roomId: string, userId: string): Promise<RoomWithRelations> {
    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    const room = await this.roomRepo.findByIdWithRelations(roomId);
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    return room;
  }

  /**
   * Update participant role (admin only)
   */
  async updateParticipantRole(
    roomId: string,
    userId: string,
    targetUserId: string,
    isAdmin: boolean
  ): Promise<void> {
    // Check if requester is admin
    const isRequesterAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isRequesterAdmin) {
      throw new ForbiddenError('Only room admins can manage admins');
    }

    // Check if target user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, targetUserId);
    if (!isParticipant) {
      throw new NotFoundError('User is not a member of this room');
    }

    // Update role
    await this.roomRepo.addParticipant(roomId, targetUserId, isAdmin ? 'admin' : 'member');
  }
}

