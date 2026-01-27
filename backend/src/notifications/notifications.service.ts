import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService
    ) { }

    onModuleInit() {
        const serviceAccountValue = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
        if (serviceAccountValue) {
            try {
                if (admin.apps.length === 0) {
                    const config = serviceAccountValue.trim().startsWith('{')
                        ? JSON.parse(serviceAccountValue)
                        : serviceAccountValue;

                    admin.initializeApp({
                        credential: admin.credential.cert(config),
                    });
                    console.log('✅ Firebase Admin initialized successfully');
                }
            } catch (error) {
                console.error('❌ Failed to initialize Firebase Admin:', error);
            }
        } else {
            console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT not found. Push notifications will not work.');
        }
    }

    async registerToken(userId: string, fcmToken: string, platform: string = 'android') {
        return this.prisma.user_device_tokens.upsert({
            where: { fcm_token: fcmToken },
            update: { user_id: userId, platform },
            create: { user_id: userId, fcm_token: fcmToken, platform },
        });
    }

    async sendPushNotification(userId: string, title: string, body: string, data?: any) {
        const tokens = await this.prisma.user_device_tokens.findMany({
            where: { user_id: userId },
        });

        if (tokens.length === 0) return;

        const fcmTokens = tokens.map(t => t.fcm_token);

        const message: admin.messaging.MulticastMessage = {
            tokens: fcmTokens,
            notification: {
                title,
                body,
            },
            data: data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`Push: Successfully sent ${response.successCount} notifications`);

            // Clean up invalid tokens
            if (response.failureCount > 0) {
                const tokensToDelete = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && (resp.error?.code === 'messaging/registration-token-not-registered' || resp.error?.code === 'messaging/invalid-registration-token')) {
                        tokensToDelete.push(fcmTokens[idx]);
                    }
                });

                if (tokensToDelete.length > 0) {
                    await this.prisma.user_device_tokens.deleteMany({
                        where: { fcm_token: { in: tokensToDelete } },
                    });
                }
            }
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    async getUserNotifications(userId: string) {
        return this.prisma.notifications.findMany({
            where: {
                user_id: userId,
            },
            orderBy: {
                created_at: 'desc',
            },
            take: 20,
        });
    }

    async markAsRead(notificationId: string) {
        return this.prisma.notifications.update({
            where: { id: notificationId },
            data: { is_read: true },
        });
    }

    async clearAll(userId: string) {
        return this.prisma.notifications.deleteMany({
            where: { user_id: userId },
        });
    }
}
