import webpush from 'web-push';
import prisma from '@/lib/prisma';

// Configure web-push with VAPID keys
if (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_VAPID_SUBJECT
) {
    webpush.setVapidDetails(
        process.env.NEXT_PUBLIC_VAPID_SUBJECT,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('VAPID keys not found. Push notifications will not work.');
}

export class PushService {
    /**
     * Save a push subscription for a user
     */
    async saveSubscription(userId: string, subscription: any) {
        try {
            console.log('saveSubscription called with:', { userId, subscription });

            if (!userId || !subscription || !subscription.endpoint) {
                throw new Error('Invalid subscription data');
            }

            // Extract keys
            const p256dh = subscription.keys?.p256dh;
            const auth = subscription.keys?.auth;

            console.log('Extracted keys:', { p256dh: !!p256dh, auth: !!auth });

            if (!p256dh || !auth) {
                throw new Error('Invalid subscription keys');
            }

            // Check if subscription already exists
            const existing = await prisma.pushSubscription.findFirst({
                where: {
                    userId,
                    endpoint: subscription.endpoint,
                },
            });

            if (existing) {
                console.log('Subscription already exists:', existing.id);
                return existing;
            }

            // Create new subscription
            console.log('Creating new subscription...');
            const result = await prisma.pushSubscription.create({
                data: {
                    userId,
                    endpoint: subscription.endpoint,
                    p256dh,
                    auth,
                },
            });
            console.log('Subscription created:', result.id);
            return result;
        } catch (error) {
            console.error('Error in saveSubscription:', error);
            throw error;
        }
    }

    /**
     * Send a notification to a user
     */
    async sendNotification(userId: string, payload: { title: string; body: string; url?: string; icon?: string }) {
        if (!userId) return;

        // Get all subscriptions for the user
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length === 0) return;

        const notificationPayload = JSON.stringify(payload);

        // Send to all subscriptions
        const promises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    notificationPayload
                );
            } catch (error: any) {
                // If subscription is invalid (410 Gone), delete it
                if (error.statusCode === 410) {
                    await prisma.pushSubscription.delete({
                        where: { id: sub.id },
                    });
                } else {
                    console.error('Error sending push notification:', error);
                }
            }
        });

        await Promise.all(promises);
    }
}

export const pushService = new PushService();
