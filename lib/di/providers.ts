// ================================
// Service Providers
// ================================
// Registers all services with the DI container
// SERVER-ONLY: This file imports server-only services (UserService with bcryptjs, etc.)

import 'server-only';

import { container } from './container';
import prisma from '@/lib/prisma';
// Server-only imports - safe because of 'server-only' at top
// Note: redis-connection and related services are loaded lazily to avoid Turbopack module resolution issues
import { ConfigService } from '@/lib/config/config.service';
import { EventBus } from '@/lib/events/event-bus';

// Repositories
import { MessageRepository } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

// Services
import { MessageService } from '@/lib/services/message.service';
import { MessageNotificationService } from '@/lib/services/message-notification.service';
import { MessageReactionService } from '@/lib/services/message-reaction.service';
import { MessageReadService } from '@/lib/services/message-read.service';
import { RoomService } from '@/lib/services/room.service';
import { UserService } from '@/lib/services/user.service';
import { AdminService } from '@/lib/services/admin.service';
// QueueService loaded dynamically to prevent client bundling
import type { QueueService } from '@/lib/queue/queue-service';
import { EmailService } from '@/lib/services/email.service';
// CacheService loaded dynamically to prevent client bundling
import type { CacheService } from '@/lib/cache/cache.service';
import type { PushService } from '@/lib/services/push.service';
// Logger is now injected via DI - no direct import needed
// Use factory pattern to prevent client bundling of FileLogger
import { createLogger } from '@/lib/logger/logger-factory';
import { SentryAdapter } from '@/lib/logger/sentry-adapter';
import type { ILogger } from '@/lib/logger/logger.interface';
import type { IErrorTrackingAdapter } from '@/lib/logger/error-tracking-adapter.interface';
import { env } from '@/lib/env';

/**
 * Initialize and register all services with the DI container
 * Call this once at application startup
 */
export function setupDI(): void {
  // Register core infrastructure services FIRST
  // These are needed by other services
  
  // Redis connection (shared instance) - loaded lazily to avoid Turbopack module resolution issues
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined') {
    container.register('redis', async () => {
      const { redisConnection } = await import('@/lib/queue/redis-connection');
      return redisConnection;
    }, true);
  }
  
  // Register Logger FIRST (needed by infrastructure services)
  // Logger type is determined by LOGGER_TYPE env variable or database config
  // Default: 'file' (writes to app.log, similar to message-flow.log)
  
  // Get logger type from environment variable (fast, no async needed)
  const loggerType = env.LOGGER_TYPE || 'file';
  
  // Create a temporary logger for ConfigService initialization
  // This will be replaced after ConfigService is ready
  // Use factory to prevent client bundling of FileLogger
  const logFilePath = env.LOG_FILE_PATH;
  const tempLogger = createLogger(loggerType, logFilePath);
  
  // Register error tracking adapter (for Sentry logger)
  container.register('errorTrackingAdapter', () => new SentryAdapter(), true);
  
  // Register logger implementation
  // Note: After ConfigService is initialized, logger config can be updated from database
  // Logger is synchronous for now (uses temp logger), but can be updated async later
  container.register<ILogger>('logger', () => {
    return tempLogger;
  }, true);
  
  // Cache Service (needs Redis and Logger) - loaded lazily to avoid Turbopack module resolution issues
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined') {
    container.register('cacheService', async () => {
      const { CacheService } = await import('@/lib/cache/cache.service');
      const { redisConnection } = await import('@/lib/queue/redis-connection');
      const logger = await container.resolve<ILogger>('logger');
      return new CacheService(redisConnection, logger);
    }, true);
  }
  
  // Config Service (needs Redis and Logger)
  // Use temp logger for initialization
  // Loaded lazily to avoid Turbopack module resolution issues
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined') {
    container.register('configService', async () => {
      const { redisConnection } = await import('@/lib/queue/redis-connection');
      const configService = new ConfigService(redisConnection, tempLogger);
      container.setConfigService(configService);
      return configService;
    }, true);
  }
  
  // After ConfigService is ready, we can update logger from database config if needed
  // This will be done asynchronously to avoid blocking startup
  (async () => {
    try {
      // Get ConfigService from container (async)
      const configService = await container.resolve<ConfigService>('configService');
      if (!configService) {
        return; // ConfigService not available
      }
      
      // Get logger config from database (with defaults to avoid errors if not found)
      const loggerTypeFromConfig = await configService.get<string>('logger.type', loggerType);
      // Use undefined as default - if not found, we'll use env-based logger
      const logFilePathFromConfig = await configService.get<string>('logger.file.path', undefined);
      
      // If config differs from env, update logger
      // Only update if we have a valid config value (not undefined)
      if (loggerTypeFromConfig !== loggerType || (logFilePathFromConfig !== undefined && logFilePathFromConfig !== env.LOG_FILE_PATH)) {
        // Use factory to create new logger (prevents client bundling)
        // Ensure loggerTypeFromConfig is a valid type
        const validLoggerType: 'file' | 'sentry' | 'console' = 
          (loggerTypeFromConfig === 'file' || loggerTypeFromConfig === 'sentry' || loggerTypeFromConfig === 'console')
            ? loggerTypeFromConfig
            : 'file';
        const newLogger = createLogger(validLoggerType, logFilePathFromConfig);
        
        // Update logger in container
        container.register<ILogger>('logger', () => newLogger, true);
        tempLogger.info('Logger updated from database config', { 
          type: loggerTypeFromConfig,
          logFilePath: logFilePathFromConfig 
        });
      }
    } catch (error) {
      // If config lookup fails, continue with env-based logger
      // This is expected if logger config hasn't been set in the database yet
      // Only log in development to avoid noise in production
      if (process.env.NODE_ENV === 'development') {
        tempLogger.info('Logger config not found in database, using env-based logger (this is normal)', {
          loggerType: loggerType,
          logFilePath: env.LOG_FILE_PATH || 'app.log'
        });
      }
    }
  })();
  
  // Event Bus (needs Redis and Logger)
  // Loaded lazily to avoid Turbopack module resolution issues
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined') {
    container.register('eventBus', async () => {
      const { redisConnection } = await import('@/lib/queue/redis-connection');
      const logger = await container.resolve<ILogger>('logger');
      return new EventBus(redisConnection, logger);
    }, true);
  }
  
  // Register Prisma client (singleton)
  container.register('prisma', () => prisma, true);

  // Register Repositories (singletons) with cache service
  // Cache service is async, so repositories need async resolution
  container.register('messageRepository', async () => {
    const cacheService = await container.resolve<CacheService>('cacheService');
    return new MessageRepository(
      container.resolveSync('prisma'),
      cacheService
    );
  }, true);

  container.register('roomRepository', async () => {
    const cacheService = await container.resolve<CacheService>('cacheService');
    return new RoomRepository(
      container.resolveSync('prisma'),
      cacheService
    );
  }, true);

  container.register('userRepository', async () => {
    const cacheService = await container.resolve<CacheService>('cacheService');
    return new UserRepository(
      container.resolveSync('prisma'),
      cacheService
    );
  }, true);

  // Register Queue Service FIRST (before other services that depend on it)
  // Loaded lazily to avoid Turbopack module resolution issues
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined') {
    container.register('queueService', async () => {
      const { QueueService } = await import('@/lib/queue/queue-service');
      const logger = await container.resolve<ILogger>('logger');
      return new QueueService(logger);
    }, true);
  }

  // Register Push Service FIRST (before MessageService that might use it as fallback)
  // Loaded lazily to avoid Turbopack module resolution issues
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined') {
    container.register('pushService', async () => {
      const { PushService } = await import('@/lib/services/push.service');
      const logger = await container.resolve<ILogger>('logger');
      return new PushService(logger);
    }, true);
  }

  // Register specialized message services FIRST (before MessageService)
  container.register('messageNotificationService', async () => {
    const roomRepository = await container.resolve<RoomRepository>('roomRepository');
    const queueService = await container.resolve<QueueService>('queueService');
    const logger = await container.resolve<ILogger>('logger');
    const pushService = await container.resolve<PushService>('pushService');
    return new MessageNotificationService(
      roomRepository,
      queueService,
      logger,
      pushService
    );
  }, true);

  container.register('messageReactionService', async () => {
    const messageRepository = await container.resolve<MessageRepository>('messageRepository');
    const roomRepository = await container.resolve<RoomRepository>('roomRepository');
    return new MessageReactionService(messageRepository, roomRepository);
  }, true);

  container.register('messageReadService', async () => {
    const messageRepository = await container.resolve<MessageRepository>('messageRepository');
    const roomRepository = await container.resolve<RoomRepository>('roomRepository');
    return new MessageReadService(messageRepository, roomRepository);
  }, true);

  // Register MessageService (core CRUD operations)
  // Uses composition with specialized services
  container.register('messageService', async () => {
    const messageRepository = await container.resolve<MessageRepository>('messageRepository');
    const roomRepository = await container.resolve<RoomRepository>('roomRepository');
    const logger = await container.resolve<ILogger>('logger');
    const cacheService = await container.resolve<CacheService>('cacheService');
    const messageNotificationService = await container.resolve<MessageNotificationService>('messageNotificationService');
    const messageReactionService = await container.resolve<MessageReactionService>('messageReactionService');
    const messageReadService = await container.resolve<MessageReadService>('messageReadService');
    return new MessageService(
      messageRepository,
      roomRepository,
      logger,
      cacheService,
      messageNotificationService,
      messageReactionService,
      messageReadService
    );
  }, true);

  container.register('roomService', async () => {
    const roomRepository = await container.resolve<RoomRepository>('roomRepository');
    const userRepository = await container.resolve<UserRepository>('userRepository');
    return new RoomService(roomRepository, userRepository);
  }, true);

  container.register('userService', async () => {
    const userRepository = await container.resolve<UserRepository>('userRepository');
    const logger = await container.resolve<ILogger>('logger');
    return new UserService(userRepository, logger);
  }, true);

  // Register Email Service (uses factory pattern)
  container.register('emailService', async () => {
    const logger = await container.resolve<ILogger>('logger');
    return new EmailService(logger);
  }, true);

  // Register Admin Service
  container.register('adminService', async () => {
    const userRepository = await container.resolve<UserRepository>('userRepository');
    const roomRepository = await container.resolve<RoomRepository>('roomRepository');
    const messageRepository = await container.resolve<MessageRepository>('messageRepository');
    return new AdminService(userRepository, roomRepository, messageRepository);
  }, true);

  // Update MessageService to include PushService (if needed for fallback)
  // Note: MessageService primarily uses queueService, pushService is fallback only
}

/**
 * Set up event handlers (called after DI setup)
 */
async function setupEventHandlers(): Promise<void> {
  try {
    const { setupEmailEventHandlers } = await import('@/lib/events/handlers');
    await setupEmailEventHandlers();
  } catch (error) {
    // Get logger from DI (async)
    try {
      const logger = await container.resolve<ILogger>('logger');
      logger.error('Error setting up event handlers:', error, {
        component: 'DIProviders',
      });
    } catch {
      // Logger not available, use console
      console.error('[DI Providers] Error setting up event handlers:', error);
    }
  }
}

// Set up event handlers after a short delay to ensure all services are registered
setTimeout(() => {
  setupEventHandlers();
}, 100);

/**
 * Get a service from the container (asynchronous)
 * This is the primary method - all services should be resolved asynchronously
 * to support both sync and async factories
 */
export async function getService<T>(key: string): Promise<T> {
  return await container.resolve<T>(key);
}

/**
 * Get a service from the container (synchronous)
 * Only use this for services that are guaranteed to be synchronous (e.g., Prisma)
 * @deprecated Use getService() instead for better compatibility
 */
export function getServiceSync<T>(key: string): T {
  return container.resolveSync<T>(key);
}

/**
 * Destroy all services and cleanup resources
 * Should be called on application shutdown
 * This will call destroy() on all services that implement it:
 * - EventBus: Closes Redis subscribers, clears intervals
 * - ConfigService: Closes Redis subscriber, clears intervals
 * - Other services with destroy() methods
 */
export async function destroyDI(): Promise<void> {
  try {
    let logger: ILogger | null = null;
    try {
      if (container.has('logger')) {
        logger = container.resolveSync<ILogger>('logger');
      }
    } catch {
      // Logger not available, will use console
      logger = null;
    }

    if (logger) {
      logger.log('🛑 Destroying DI container and cleaning up resources...', {
        component: 'DIProviders',
      });
    } else {
      console.log('[DI Container] 🛑 Destroying DI container and cleaning up resources...');
    }

    await container.destroy();

    if (logger) {
      logger.log('✅ DI container destroyed successfully', {
        component: 'DIProviders',
      });
    } else {
      console.log('[DI Container] ✅ DI container destroyed successfully');
    }
  } catch (error) {
    console.error('[DI Container] ❌ Error destroying DI container:', error);
    throw error;
  }
}

// Initialize on module load
setupDI();

