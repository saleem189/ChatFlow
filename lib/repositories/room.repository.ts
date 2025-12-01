// ================================
// Room Repository
// ================================
// Data access layer for chat rooms

import { PrismaClient, ChatRoom, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export type RoomWithRelations = Prisma.ChatRoomGetPayload<{
  include: {
    owner: { select: { id: true; name: true; avatar: true } };
    participants: {
      include: {
        user: { select: { id: true; name: true; avatar: true; email: true; status: true } };
      };
    };
    messages: {
      take: 1;
      orderBy: { createdAt: 'desc' };
      include: {
        sender: { select: { id: true; name: true; avatar: true } };
      };
    };
  };
}>;

export class RoomRepository extends BaseRepository<
  ChatRoom,
  Prisma.ChatRoomCreateInput,
  Prisma.ChatRoomUpdateInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'chatRoom');
  }

  /**
   * Check if user is a participant in a room
   */
  async isParticipant(roomId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.roomParticipant.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });
    return !!participant;
  }

  /**
   * Get room with all relations
   */
  async findByIdWithRelations(roomId: string): Promise<RoomWithRelations | null> {
    return this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
                status: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    }) as Promise<RoomWithRelations | null>;
  }

  /**
   * Get all rooms for a user
   */
  async findByUserId(userId: string): Promise<RoomWithRelations[]> {
    const participants = await this.prisma.roomParticipant.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    email: true,
                    status: true,
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        room: {
          updatedAt: 'desc',
        },
      },
    });

    return participants.map((p) => p.room) as RoomWithRelations[];
  }

  /**
   * Add participant to room
   */
  async addParticipant(roomId: string, userId: string, role: string = 'member'): Promise<void> {
    await this.prisma.roomParticipant.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      create: {
        userId,
        roomId,
        role,
      },
      update: {
        role,
      },
    });
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await this.prisma.roomParticipant.deleteMany({
      where: {
        userId,
        roomId,
      },
    });
  }

  /**
   * Get participant role
   */
  async getParticipantRole(roomId: string, userId: string): Promise<string | null> {
    const participant = await this.prisma.roomParticipant.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });
    return participant?.role || null;
  }
}

