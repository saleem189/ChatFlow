// ================================
// Queue Service
// ================================
// Simple service for adding jobs to queues
// SERVER-ONLY: Uses BullMQ (Node.js only)

import 'server-only'; // Mark as server-only to prevent client bundling

import { pushNotificationQueue, fileProcessingQueue } from './queues';
import { JOB_TYPES } from './queues';
import type { ILogger } from '@/lib/logger/logger.interface';

export class QueueService {
  constructor(private logger: ILogger) {
    // Logger injected via DI for consistent logging
  }

  /**
   * Add push notification job to queue
   */
  async addPushNotification(
    userId: string,
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
    },
    options?: {
      priority?: number; // Higher = more priority
      delay?: number; // Delay in milliseconds
    }
  ): Promise<string> {
    try {
      const job = await pushNotificationQueue.add(
        JOB_TYPES.PUSH_NOTIFICATION,
        {
          userId,
          payload,
        },
        {
          priority: options?.priority || 0,
          delay: options?.delay,
        }
      );

      this.logger.log('Added push notification job', {
        component: 'QueueService',
        jobId: job.id,
        userId,
      });
      return job.id!;
    } catch (error: unknown) {
      this.logger.error('Failed to add push notification job', error, {
        component: 'QueueService',
        userId,
      });
      throw error;
    }
  }

  /**
   * Add image processing job to queue
   */
  async addImageProcessing(
    filePath: string,
    outputPath: string,
    options?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      priority?: number;
    }
  ): Promise<string> {
    try {
      const job = await fileProcessingQueue.add(
        JOB_TYPES.PROCESS_IMAGE,
        {
          filePath,
          outputPath,
          options: {
            maxWidth: options?.maxWidth,
            maxHeight: options?.maxHeight,
            quality: options?.quality,
            format: options?.format,
          },
        },
        {
          priority: options?.priority || 0,
        }
      );

      this.logger.log('Added image processing job', {
        component: 'QueueService',
        jobId: job.id,
        filePath,
      });
      return job.id!;
    } catch (error: unknown) {
      this.logger.error('Failed to add image processing job', error, {
        component: 'QueueService',
        filePath,
      });
      throw error;
    }
  }

  /**
   * Add video processing job to queue
   */
  async addVideoProcessing(
    filePath: string,
    outputPath: string,
    options?: {
      priority?: number;
    }
  ): Promise<string> {
    try {
      const job = await fileProcessingQueue.add(
        JOB_TYPES.PROCESS_VIDEO,
        {
          filePath,
          outputPath,
        },
        {
          priority: options?.priority || 0,
        }
      );

      this.logger.log('Added video processing job', {
        component: 'QueueService',
        jobId: job.id,
        filePath,
      });
      return job.id!;
    } catch (error: unknown) {
      this.logger.error('Failed to add video processing job', error, {
        component: 'QueueService',
        filePath,
      });
      throw error;
    }
  }

  /**
   * Add avatar optimization job to queue
   */
  async addAvatarOptimization(
    filePath: string,
    userId: string,
    options?: {
      priority?: number;
    }
  ): Promise<string> {
    try {
      const job = await fileProcessingQueue.add(
        JOB_TYPES.OPTIMIZE_AVATAR,
        {
          filePath,
          userId,
        },
        {
          priority: options?.priority || 10, // Higher priority for avatars
        }
      );

      this.logger.log('Added avatar optimization job', {
        component: 'QueueService',
        jobId: job.id,
        userId,
      });
      return job.id!;
    } catch (error: unknown) {
      this.logger.error('Failed to add avatar optimization job', error, {
        component: 'QueueService',
        userId,
      });
      throw error;
    }
  }

  /**
   * Get queue stats
   */
  async getStats() {
    const [
      pushWaiting,
      pushActive,
      pushCompleted,
      pushFailed,
      fileWaiting,
      fileActive,
      fileCompleted,
      fileFailed,
    ] = await Promise.all([
      pushNotificationQueue.getWaitingCount(),
      pushNotificationQueue.getActiveCount(),
      pushNotificationQueue.getCompletedCount(),
      pushNotificationQueue.getFailedCount(),
      fileProcessingQueue.getWaitingCount(),
      fileProcessingQueue.getActiveCount(),
      fileProcessingQueue.getCompletedCount(),
      fileProcessingQueue.getFailedCount(),
    ]);

    return {
      pushNotifications: {
        waiting: pushWaiting,
        active: pushActive,
        completed: pushCompleted,
        failed: pushFailed,
        total: pushWaiting + pushActive + pushCompleted + pushFailed,
      },
      fileProcessing: {
        waiting: fileWaiting,
        active: fileActive,
        completed: fileCompleted,
        failed: fileFailed,
        total: fileWaiting + fileActive + fileCompleted + fileFailed,
      },
    };
  }
}

// Export singleton for backward compatibility during migration
// Note: Prefer using DI container: getService<QueueService>('queueService')
let _queueServiceInstance: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!_queueServiceInstance) {
    // Import DI container to get logger (lazy import to avoid circular dependencies)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getService } = require('@/lib/di');
    const logger = getService('logger') as ILogger;
    _queueServiceInstance = new QueueService(logger);
  }
  return _queueServiceInstance;
}

// Export singleton for backward compatibility
export const queueService = getQueueService();

