// ================================
// Message Notification Service
// ================================
// Handles push notifications for messages

import { RoomRepository, RoomWithRelations } from '@/lib/repositories/room.repository';
import { QueueService } from '@/lib/queue/queue-service';
import { PushService } from '@/lib/services/push.service';
import type { ILogger } from '@/lib/logger/logger.interface';

export class MessageNotificationService {
  constructor(
    private roomRepo: RoomRepository,
    private queueService: QueueService,
    private logger: ILogger,
    private pushService?: PushService // Optional - fallback only
  ) {}

  /**
   * Send push notifications to offline/inactive participants
   */
  async sendPushNotifications(
    roomId: string,
    senderId: string,
    content: string,
    type: string,
    fileName?: string
  ): Promise<void> {
    try {
      const room = await this.getRoomForNotifications(roomId);
      if (!room) return;

      const recipients = this.getNotificationRecipients(room, senderId);
      if (recipients.length === 0) return;

      const notification = this.buildNotificationPayload(room, senderId, content, type, fileName);
      await this.sendNotificationsToRecipients(recipients, notification);
    } catch (error) {
      this.logger.error('Failed to send push notifications:', error, {
        component: 'MessageNotificationService',
        roomId,
        senderId,
      });
      throw error;
    }
  }

  /**
   * Get room for notifications with validation
   */
  private async getRoomForNotifications(roomId: string) {
    const room = await this.roomRepo.findByIdWithRelations(roomId);
    if (!room?.participants || !Array.isArray(room.participants)) {
      this.logger.warn('Room participants not available for push notifications', {
        component: 'MessageNotificationService',
        roomId,
      });
      return null;
    }
    return room;
  }

  /**
   * Get notification recipients (exclude sender)
   */
  private getNotificationRecipients(
    room: RoomWithRelations,
    senderId: string
  ): Array<{ userId: string; user: { id: string; name: string; avatar: string | null; email: string | null; status: string | null } }> {
    return room.participants.filter((p) => p.userId !== senderId);
  }

  /**
   * Build notification payload
   */
  private buildNotificationPayload(
    room: RoomWithRelations,
    senderId: string,
    content: string,
    type: string,
    fileName?: string
  ): { title: string; body: string; data: { roomId: string; messageId?: string; type: string } } {
    const sender = room.participants.find((p) => p.userId === senderId)?.user;
    if (!sender) {
      throw new Error('Sender not found in room participants');
    }

    const title = room.isGroup ? `${sender.name} in ${room.name}` : sender.name;
    const body = this.getNotificationBody(type, content, fileName);
    const url = `/chat?roomId=${room.id}`;
    const icon = sender.avatar || '/icon-192x192.png';

    return { 
      title, 
      body, 
      data: { 
        roomId: room.id, 
        type 
      } 
    };
  }

  /**
   * Get notification body based on message type
   */
  private getNotificationBody(type: string, content: string, fileName?: string): string {
    const bodyMap: Record<string, string> = {
      text: content,
      image: '📷 Sent an image',
      file: `📎 Sent a file: ${fileName || 'Attachment'}`,
      video: '🎥 Sent a video',
      audio: '🎵 Sent an audio file',
    };
    return bodyMap[type] || `Sent a ${type}`;
  }

  /**
   * Send notifications to recipients via queue
   */
  private async sendNotificationsToRecipients(
    recipients: Array<{ userId: string; user: { id: string; name: string; avatar: string | null; email: string | null; status: string | null } }>,
    notification: { title: string; body: string; data: { roomId: string; messageId?: string; type: string } }
  ): Promise<void> {
    if (!this.queueService) {
      this.logger.warn('QueueService not available, skipping push notifications', {
        component: 'MessageNotificationService',
      });
      return;
    }

    // Send via queue (async, non-blocking)
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.queueService.addPushNotification(recipient.userId, notification)
      )
    );

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to queue push notification for user ${recipients[index].userId}:`,
          result.reason,
          {
            component: 'MessageNotificationService',
            userId: recipients[index].userId,
          }
        );
      }
    });
  }
}

