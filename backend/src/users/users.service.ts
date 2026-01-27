
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
                profile_picture: true,
                role: true,
                created_at: true,
                _count: {
                    select: {
                        user_saved_offers: true,
                        user_followed_businesses: true,
                        offers_offers_created_byTousers: true,
                    },
                },
                businesses: {
                    include: {
                        business_branches: true,
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

    async updateProfile(userId: string, data: { display_name?: string; business_name?: string; whatsapp_number?: string; bio?: string; profile_picture?: string }) {
        // 1. Update User
        const user = await this.prisma.users.update({
            where: { id: userId },
            data: {
                display_name: data.display_name,
                profile_picture: data.profile_picture,
            },
        });

        // 2. Update Business
        // Assuming the user has a business (they should if they are in the owner app)
        const business = await this.prisma.businesses.updateMany({
            where: { owner_id: userId },
            data: {
                business_name: data.business_name,
                whatsapp_number: data.whatsapp_number,
                bio: data.bio,
                logo_url: data.profile_picture,
            },
        });

        // Fetch updated user with business for the response
        const updatedUser = await this.prisma.users.findUnique({
            where: { id: userId },
            include: {
                businesses: true,
            },
        });

        return updatedUser;
    }

    async updateBranchLocation(userId: string, data: { branchId: string; address_line?: string; city?: string; area?: string; state?: string; pincode?: string; latitude?: number; longitude?: number }) {
        // Verify the branch belongs to the user
        const branch = await this.prisma.business_branches.findFirst({
            where: {
                id: data.branchId,
                businesses: {
                    owner_id: userId,
                },
            },
        });

        if (!branch) {
            throw new Error('Branch not found or unauthorized');
        }

        return this.prisma.business_branches.update({
            where: { id: data.branchId },
            data: {
                address_line: data.address_line,
                city: data.city,
                area: data.area,
                state: data.state,
                pincode: data.pincode,
                latitude: data.latitude,
                longitude: data.longitude,
            },
        });
    }

    async findAllBusinesses() {
        return this.prisma.businesses.findMany({
            where: {
                status: 'active',
            },
            include: {
                business_branches: true,
            },
            orderBy: {
                business_name: 'asc'
            }
        });
    }

    async findOneBusiness(id: string, userId?: string) {
        const business = await this.prisma.businesses.findUnique({
            where: { id },
            include: {
                business_branches: {
                    include: {
                        offers: {
                            include: {
                                offer_media: { take: 1, orderBy: { sort_order: 'asc' } },
                                offer_rules: true,
                                offer_metrics: true,
                                user_saved_offers: userId ? { where: { user_id: userId } } : false,
                                _count: {
                                    select: {
                                        offer_views: true,
                                        offer_clicks: true,
                                        offer_leads: true,
                                        user_saved_offers: true,
                                    }
                                }
                            }
                        }
                    }
                },
                business_metrics: true,
                _count: {
                    select: {
                        user_followed_businesses: true,
                    }
                },
                user_followed_businesses: userId ? {
                    where: {
                        user_id: userId
                    }
                } : false
            }
        });

        if (business) {
            // Flatten offers from all branches
            (business as any).offers = business.business_branches.flatMap(b => b.offers || []);

            if (userId) {
                (business as any).isFollowing = business.user_followed_businesses.length > 0;
                delete (business as any).user_followed_businesses;
            }
        }

        return business;
    }
}
