import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

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
