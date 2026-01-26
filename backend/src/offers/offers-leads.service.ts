import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OffersLeadsService {
    constructor(private prisma: PrismaService) { }

    async createLead(offerId: string, userId: string | null, userData: { user_phone: string; user_name?: string }) {
        // Check if lead already exists for this user and offer (within last 24 hours)
        const existingLead = await this.prisma.offer_leads.findFirst({
            where: {
                offer_id: offerId,
                user_phone: userData.user_phone,
                created_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
            },
        });

        if (existingLead) {
            return existingLead; // Don't create duplicate
        }

        // Create new lead
        const lead = await this.prisma.offer_leads.create({
            data: {
                offer_id: offerId,
                user_id: userId,
                user_phone: userData.user_phone,
                user_name: userData.user_name,
                status: 'new',
            },
        });

        // Increment leads metric
        await this.prisma.offer_metrics.upsert({
            where: { offer_id: offerId },
            create: {
                offer_id: offerId,
                clicks: 1,
            },
            update: {
                clicks: { increment: 1 },
            },
        });

        return lead;
    }

    async getBusinessLeads(businessId: string, status?: string, limit = 20, offset = 0) {
        // Get all branch IDs for this business
        const branches = await this.prisma.business_branches.findMany({
            where: { business_id: businessId },
            select: { id: true },
        });

        const branchIds = branches.map(b => b.id);

        const whereClause: any = {
            offers: {
                branch_id: { in: branchIds },
            },
        };

        if (status) {
            whereClause.status = status;
        }

        const [leads, total] = await Promise.all([
            this.prisma.offer_leads.findMany({
                where: whereClause,
                include: {
                    offers: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    users: {
                        select: {
                            display_name: true,
                            profile_picture: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
                take: limit,
                skip: offset,
            }),
            this.prisma.offer_leads.count({ where: whereClause }),
        ]);

        const newCount = await this.prisma.offer_leads.count({
            where: {
                ...whereClause,
                status: 'new',
            },
        });

        return {
            data: leads,
            meta: {
                total,
                newCount,
                limit,
                offset,
            },
        };
    }

    async updateLeadStatus(leadId: string, status: 'new' | 'contacted' | 'converted') {
        return this.prisma.offer_leads.update({
            where: { id: leadId },
            data: {
                status,
                contacted_at: status === 'contacted' || status === 'converted' ? new Date() : undefined,
            },
        });
    }

    async getRecentInteractions(businessId: string, limit = 10) {
        // Get all branch IDs for this business
        const branches = await this.prisma.business_branches.findMany({
            where: { business_id: businessId },
            select: { id: true },
        });

        const branchIds = branches.map(b => b.id);

        // Get recent WhatsApp leads
        const recentLeads = await this.prisma.offer_leads.findMany({
            where: {
                offers: {
                    branch_id: { in: branchIds },
                },
            },
            include: {
                offers: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
            take: limit,
        });

        // Get recent views
        const recentViews = await this.prisma.offer_views.findMany({
            where: {
                offers: {
                    branch_id: { in: branchIds },
                },
            },
            include: {
                offers: {
                    select: {
                        title: true,
                    },
                },
                users: {
                    select: {
                        display_name: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
            take: limit,
        });

        // Combine and format interactions
        const interactions = [
            ...recentLeads.map(lead => ({
                type: 'whatsapp_click' as const,
                user_name: lead.user_name || 'Anonymous',
                offer_title: lead.offers.title,
                timestamp: lead.created_at,
            })),
            ...recentViews.map(view => ({
                type: 'view' as const,
                user_name: view.users?.display_name || 'Anonymous',
                offer_title: view.offers?.title || 'Unknown Offer',
                timestamp: view.created_at,
            })),
        ];

        // Sort by timestamp and limit
        interactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return interactions.slice(0, limit);
    }
}
