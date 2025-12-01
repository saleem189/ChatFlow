// ================================
// User Repository
// ================================
// Data access layer for users

import { PrismaClient, User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export type UserWithRelations = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    avatar: true;
    role: true;
    status: true;
    lastSeen: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'user');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status, lastSeen: new Date() },
    });
  }

  /**
   * Get all users (for admin or search)
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<User[]> {
    const { skip, take, search } = options || {};

    return this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

