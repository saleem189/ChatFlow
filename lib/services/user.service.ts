// ================================
// User Service
// ================================
// Business logic layer for users
// SERVER-ONLY: Uses bcryptjs (Node.js only)

import 'server-only';

import { UserRepository } from '@/lib/repositories/user.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
// Dynamic import to prevent webpack from bundling bcryptjs for client
import { getService } from '@/lib/di';
import { EventBus } from '@/lib/events/event-bus';
import type { ILogger } from '@/lib/logger/logger.interface';
import type { UserStatus } from '@/lib/types/user.types';

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private logger: ILogger // ✅ Injected via DI
  ) {}

  /**
   * Register a new user
   */
  async register(
    name: string,
    email: string,
    password: string
  ): Promise<{
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }> {
    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new ValidationError('A user with this email already exists');
    }

    // Hash password - use require with dynamic path to prevent webpack static analysis
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.userRepo.create({
      name,
      email,
      password: hashedPassword,
      status: 'OFFLINE',
    });

    // Publish user registered event (non-blocking)
    // Email service will handle sending welcome email
    try {
      const eventBus = await getService<EventBus>('eventBus');
      await eventBus.publish('user.registered', {
        userId: user.id,
        email: user.email,
        name: user.name,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Don't fail registration if event publishing fails
      this.logger.error('Failed to publish user.registered event:', error, {
        component: 'UserService',
        userId: user.id,
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get all users (for search/listing)
   */
  async getAllUsers(options?: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    status: string;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    return this.userRepo.findAll(options);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    status: string;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<{
    id: string;
    avatar: string | null;
  }> {
    // Validate avatar URL
    if (!avatarUrl || avatarUrl.trim().length === 0) {
      throw new ValidationError('Avatar URL is required');
    }

    const user = await this.userRepo.updateAvatar(userId, avatarUrl);
    return {
      id: user.id,
      avatar: user.avatar,
    };
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    await this.userRepo.updateAvatar(userId, '');
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.userRepo.updateStatus(userId, status);
  }
}

