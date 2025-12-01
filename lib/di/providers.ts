// ================================
// Service Providers
// ================================
// Registers all services with the DI container

import { container } from './container';
import prisma from '@/lib/prisma';

// Repositories
import { MessageRepository } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

// Services
import { MessageService } from '@/lib/services/message.service';
import { RoomService } from '@/lib/services/room.service';
import { UserService } from '@/lib/services/user.service';
import { AdminService } from '@/lib/services/admin.service';

/**
 * Initialize and register all services with the DI container
 * Call this once at application startup
 */
export function setupDI(): void {
  // Register Prisma client (singleton)
  container.register('prisma', () => prisma, true);

  // Register Repositories (singletons)
  container.register('messageRepository', () => {
    return new MessageRepository(container.resolve('prisma'));
  }, true);

  container.register('roomRepository', () => {
    return new RoomRepository(container.resolve('prisma'));
  }, true);

  container.register('userRepository', () => {
    return new UserRepository(container.resolve('prisma'));
  }, true);

  // Register Services (singletons)
  container.register('messageService', () => {
    return new MessageService(
      container.resolve('messageRepository'),
      container.resolve('roomRepository')
    );
  }, true);

  container.register('roomService', () => {
    return new RoomService(
      container.resolve('roomRepository'),
      container.resolve('userRepository')
    );
  }, true);

  container.register('userService', () => {
    return new UserService(
      container.resolve('userRepository')
    );
  }, true);
}

/**
 * Get a service from the container
 * Use this in API routes instead of manual instantiation
 */
export function getService<T>(key: string): T {
  return container.resolve<T>(key);
}

// Initialize on module load
setupDI();

