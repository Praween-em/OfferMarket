
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phone: true,
                email: true,
                display_name: true,
                role: true,
                created_at: true,
                _count: {
                    select: {
                        user_saved_offers: true,
                        user_followed_businesses: true,
                    },
                },
            },
        });
        return user;
    }

    async followBusiness(userId: string, businessId: string) {
        return this.prisma.user_followed_businesses.upsert({
            where: {
                user_id_business_id: {
                    user_id: userId,
                    business_id: businessId,
                },
            },
            update: {},
            create: {
                user_id: userId,
                business_id: businessId,
            },
        });
    }

    async unfollowBusiness(userId: string, businessId: string) {
        return this.prisma.user_followed_businesses.delete({
            where: {
                user_id_business_id: {
                    user_id: userId,
                    business_id: businessId,
                },
            },
        });
    }

    async reportBusiness(businessId: string, userId: string, reason: any, notes?: string) {
        return this.prisma.business_reports.create({
            data: {
                business_id: businessId,
                reported_by: userId,
                reason: reason,
                notes: notes,
                status: 'pending',
            },
        });
    }
}
