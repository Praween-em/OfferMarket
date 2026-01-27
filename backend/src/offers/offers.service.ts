
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto'; // Assuming this DTO exists
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) { }

  async createCampaign(userId: string, createCampaignDto: any) {
    const { title, start_date, end_date, items } = createCampaignDto;

    // 1. Get the business and its branches for this user
    let business = await this.prisma.businesses.findFirst({
      where: { owner_id: userId },
      include: { business_branches: true },
    });

    if (!business) {
      throw new Error('Business not found for user');
    }

    // Auto-create branch if missing (e.g. for existing users who skipped branch setup)
    if (business.business_branches.length === 0) {
      const defaultBranch = await this.prisma.business_branches.create({
        data: {
          business_id: business.id,
          branch_name: 'Main Store',
          city: 'Default City',

          is_active: true,
        },
      });
      business.business_branches = [defaultBranch];
    }

    const currentBusiness = business; // For TS null safety in async closures
    const branchId = business.business_branches[0].id;

    const result = await this.prisma.$transaction(async (tx: any) => {
      // 2. Create the Campaign
      const campaign = await tx.campaigns.create({
        data: {
          business_id: currentBusiness.id,
          name: title,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          created_by: userId,
        },
      });

      // 3. Create each Offer in the campaign
      const createdOffers: any[] = [];
      for (const item of items) {
        const offer = await tx.offers.create({
          data: {
            branch_id: branchId,
            campaign_id: campaign.id,
            title: item.name,
            short_description: item.name,
            description: item.rules.description || item.name,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            status: 'active',
            offer_scope: 'store_wide',
            created_by: userId,
          },
        });

        // 4. Create Rule for the offer
        await tx.offer_rules.create({
          data: {
            offer_id: offer.id,
            rule_type: item.type,
            discount_value: item.rules.discount ? parseFloat(item.rules.discount) : null,
            buy_quantity: item.rules.buyQty ? parseInt(item.rules.buyQty) : null,
            get_quantity: item.rules.getQty ? parseInt(item.rules.getQty) : null,
            min_purchase_amount: item.rules.minSpend ? parseFloat(item.rules.minSpend) : null,
            conditions: {
              ...item.rules,
              text: item.rules.conditions || '',
              original_price: item.rules.original_price,
              offer_price: item.rules.offer_price
            },
          },
        });

        // 5. Create Media for the offer (support multiple images)
        const imagesToUpload = item.images || [item.image1, item.image2].filter(Boolean);

        for (let i = 0; i < imagesToUpload.length; i++) {
          if (imagesToUpload[i]) {
            await tx.offer_media.create({
              data: {
                offer_id: offer.id,
                image_url: imagesToUpload[i],
                sort_order: i,
              },
            });
          }
        }

        createdOffers.push(offer);
      }

      return { campaign, offers: createdOffers };
    });

    // Notify followers (async, don't block response)
    this.notifyFollowers(currentBusiness.id, title, `New deals from ${currentBusiness.business_name}!`);

    return result;
  }

  private async notifyFollowers(businessId: string, title: string, message: string) {
    try {
      const followers = await this.prisma.user_followed_businesses.findMany({
        where: { business_id: businessId },
        select: { user_id: true }
      });

      for (const follower of followers) {
        // This is non-blocking for each follower to ensure speed
        this.notificationsService.sendPushNotification(
          follower.user_id,
          title,
          message,
          { businessId, type: 'new_offer' }
        ).catch(err => console.error(`Failed to notify user ${follower.user_id}:`, err));
      }
    } catch (error) {
      console.error('Failed to notify followers:', error);
    }
  }

  async create(createOfferDto: CreateOfferDto) {
    const {
      branch_id,
      title,
      short_description,
      description,
      start_date,
      end_date,
      type,
      discount_value,
      buy_quantity,
      get_quantity,
      min_purchase_amount,
      max_discount_amount,
    } = createOfferDto;

    // Use a transaction to ensure both Offer and Rule are created, or neither.
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create the Offer
      const offer = await tx.offers.create({
        data: {
          branch_id,
          title,
          short_description,
          description,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          status: 'active', // Default to active for simplicity in this phase
          offer_scope: 'store_wide',
        },
      });

      // 2. Create the Rule
      await tx.offer_rules.create({
        data: {
          offer_id: offer.id,
          rule_type: type,
          discount_value,
          buy_quantity,
          get_quantity,
          min_purchase_amount,
          max_discount_amount,
        },
      });

      return offer;
    });
  }

  /**
   * High-performance feed using Cursor Pagination
   * @param cursor The ID of the last item seen (for infinite scroll)
   * @param limit Number of items to fetch
   */
  async getFeed(cursor?: string, limit = 20) {
    // 1. Build Query Options
    const queryOptions: any = {
      take: limit,
      where: {
        status: 'active',
        start_date: { lte: new Date() },
        end_date: { gte: new Date() },
      },
      orderBy: {
        created_at: 'desc', // Recent offers first
      },
      include: {
        business_branches: {
          select: {
            city: true,
            businesses: {
              select: {
                business_name: true,
                logo_url: true,
                id: true,
              },
            },
          },
        },
        offer_media: {
          take: 1, // Only need the thumbnail
          orderBy: { sort_order: 'asc' }
        }
      },
    };

    // 2. Add Cursor if provided
    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1; // Skip the cursor itself
    }

    // 3. Execute Query
    const offers = await this.prisma.offers.findMany(queryOptions);

    // 4. Return Data + Next Cursor
    const lastItem = offers[offers.length - 1];
    const nextCursor = lastItem ? lastItem.id : null;

    return {
      data: offers,
      meta: {
        next_cursor: nextCursor,
        has_more: offers.length === limit,
      },
    };
  }

  async getHotDeals() {
    return this.prisma.offers.findMany({
      where: {
        status: 'active',
        start_date: { lte: new Date() },
        end_date: { gte: new Date() },
      },
      take: 10,
      include: {
        business_branches: {
          select: {
            city: true,
            businesses: {
              select: {
                business_name: true,
                logo_url: true,
              },
            },
          },
        },
        offer_media: {
          take: 1,
          orderBy: { sort_order: 'asc' },
        },
        offer_rules: {
          select: {
            rule_type: true,
            discount_value: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  getOfferTypes() {
    return [
      {
        id: 'flat',
        title: 'Flat Amount Off',
        description: 'Give a fixed amount discount (e.g., $10 off)',
        icon: 'tag',
      },
      {
        id: 'percentage',
        title: 'Percentage Off',
        description: 'Give a percentage discount (e.g., 20% off)',
        icon: 'percent',
      },
      {
        id: 'buy_x_get_y',
        title: 'Buy X Get Y',
        description: 'Buy specific items to get others for free/discounted',
        icon: 'shopping-bag',
      },
      {
        id: 'bogo',
        title: 'Buy 1 Get 1 Free',
        description: 'Classic BOGO offer',
        icon: 'users',
      },
      {
        id: 'tiered_volume',
        title: 'Tiered Volume',
        description: 'Buy more, save more (e.g., Buy 2 get 10%, Buy 3 get 20%)',
        icon: 'layers',
      },
      {
        id: 'tiered_spending',
        title: 'Tiered Spending',
        description: 'Spend more, save more (e.g., Spend $50 get $5 off)',
        icon: 'dollar-sign',
      },
      {
        id: 'bundle_fixed_price',
        title: 'Bundle Price',
        description: 'Sell a group of items for a fixed total price',
        icon: 'package',
      },
      {
        id: 'free_gift',
        title: 'Free Gift',
        description: 'Free gift with purchase over a certain amount',
        icon: 'gift',
      },
      {
        id: 'referral',
        title: 'Referral Bonus',
        description: 'Rewarding users for referring friends',
        icon: 'user-plus',
      },
      {
        id: 'first_order',
        title: 'First Order',
        description: 'Special discount for first-time customers',
        icon: 'star',
      },
      {
        id: 'loyalty_points',
        title: 'Loyalty Points',
        description: 'Earn double or triple points',
        icon: 'award',
      },
      {
        id: 'mystery_reward',
        title: 'Mystery Reward',
        description: 'Gamified scratch card reward',
        icon: 'help-circle',
      },
    ];
  }

  async getOffersByBusiness(businessId: string) {
    return this.prisma.offers.findMany({
      where: {
        business_branches: {
          business_id: businessId,
        },
      },
      include: {
        business_branches: {
          include: {
            businesses: true,
          },
        },
        offer_media: {
          orderBy: { sort_order: 'asc' },
        },
        offer_rules: {
          select: {
            rule_type: true,
            discount_value: true,
            buy_quantity: true,
            get_quantity: true,
            min_purchase_amount: true,
            conditions: true,
          },
        },
        offer_metrics: true,
        campaigns: true,
        _count: {
          select: {
            offer_views: true,
            offer_clicks: true,
            offer_leads: true,
            user_saved_offers: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.offers.findUnique({
      where: { id },
      include: {
        business_branches: {
          include: {
            businesses: true,
          },
        },
        offer_media: {
          orderBy: { sort_order: 'asc' },
        },
        offer_rules: {
          select: {
            rule_type: true,
            discount_value: true,
            buy_quantity: true,
            get_quantity: true,
            min_purchase_amount: true,
            conditions: true,
          },
        },
        offer_metrics: true,
        campaigns: true,
        _count: {
          select: {
            offer_views: true,
            offer_clicks: true,
            offer_leads: true,
            user_saved_offers: true,
          }
        }
      },
    });
  }

  async reportOffer(offerId: string, userId: string, reason: any, notes?: string) {
    return this.prisma.offer_reports.create({
      data: {
        offer_id: offerId,
        reported_by: userId,
        reason: reason,
        notes: notes,
        status: 'pending',
      },
    });
  }

  async update(id: string, updateData: any) {
    const {
      title,
      short_description,
      description,
      start_date,
      end_date,
      status,
      // Rule updates
      type,
      discount_value,
      buy_quantity,
      get_quantity,
      min_purchase_amount,
      max_discount_amount,
    } = updateData;

    return this.prisma.$transaction(async (tx: any) => {
      const offer = await tx.offers.update({
        where: { id },
        data: {
          title,
          short_description,
          description,
          start_date: start_date ? new Date(start_date) : undefined,
          end_date: end_date ? new Date(end_date) : undefined,
          status,
        },
      });

      if (type || discount_value !== undefined || buy_quantity !== undefined || get_quantity !== undefined || min_purchase_amount !== undefined) {
        await tx.offer_rules.update({
          where: { offer_id: id },
          data: {
            rule_type: type,
            discount_value,
            buy_quantity,
            get_quantity,
            min_purchase_amount,
            max_discount_amount,
          },
        });
      }

      return offer;
    });
  }

  async toggleStatus(id: string) {
    const offer = await this.prisma.offers.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!offer) throw new Error('Offer not found');

    const newStatus = offer.status === 'active' ? 'paused' : 'active';

    return this.prisma.offers.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async getDashboardStats(userId: string) {
    const business = await this.prisma.businesses.findFirst({
      where: { owner_id: userId },
      select: { id: true, business_name: true }
    });

    if (!business) throw new Error('Business not found');

    const offers = await this.prisma.offers.findMany({
      where: { branch_id: { in: await this.getBranchIds(business.id) } },
      include: { offer_metrics: true }
    });

    const totalViews = offers.reduce((acc: number, o: any) => acc + Number(o.offer_metrics?.views || 0), 0);
    const totalShares = offers.reduce((acc: number, o: any) => acc + Number(o.offer_metrics?.shares || 0), 0);
    const totalLeads = offers.reduce((acc: number, o: any) => acc + Number(o.offer_metrics?.clicks || 0), 0);

    const mostViewed = [...offers].sort((a, b) => Number(b.offer_metrics?.views || 0) - Number(a.offer_metrics?.views || 0))[0];
    const mostShared = [...offers].sort((a, b) => Number(b.offer_metrics?.shares || 0) - Number(a.offer_metrics?.shares || 0))[0];

    // Get unread notification count
    const unreadNotifications = await this.prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });

    return {
      businessName: business.business_name,
      totalViews: Number(totalViews),
      totalShares: Number(totalShares),
      totalLeads: Number(totalLeads),
      unreadNotifications: Number(unreadNotifications),
      mostViewed: mostViewed && mostViewed.offer_metrics ? {
        id: mostViewed.id,
        title: mostViewed.title,
        count: Number(mostViewed.offer_metrics.views || 0)
      } : null,
      mostShared: mostShared && mostShared.offer_metrics ? {
        id: mostShared.id,
        title: mostShared.title,
        count: Number(mostShared.offer_metrics.shares || 0)
      } : null,
      recentActivity: []
    };
  }

  async getAnalytics(userId: string) {
    const business = await this.prisma.businesses.findFirst({
      where: { owner_id: userId },
      select: { id: true }
    });

    if (!business) throw new Error('Business not found');
    const branchIds = await this.getBranchIds(business.id);

    const stats = await this.prisma.offer_metrics.aggregate({
      where: { offers: { branch_id: { in: branchIds } } },
      _sum: {
        views: true,
        claims: true,
        clicks: true,
        saves: true,
        shares: true
      }
    });

    return {
      summary: {
        totalViews: Number(stats._sum.views || 0),
        totalClaims: Number(stats._sum.claims || 0),
        totalLeads: Number(stats._sum.clicks || 0),
        totalSaves: Number(stats._sum.saves || 0),
        totalShares: Number(stats._sum.shares || 0)
      }
    };
  }

  private async getBranchIds(businessId: string) {
    const branches = await this.prisma.business_branches.findMany({
      where: { business_id: businessId },
      select: { id: true }
    });
    return branches.map((b: any) => b.id);
  }

  async trackView(offerId: string, userId?: string, data?: { sessionId?: string, ip?: string, userAgent?: string }) {
    await this.prisma.offer_views.create({
      data: {
        offer_id: offerId,
        user_id: userId,
        session_id: data?.sessionId,
        ip_address: data?.ip,
        user_agent: data?.userAgent,
      }
    });

    return this.prisma.offer_metrics.upsert({
      where: { offer_id: offerId },
      update: { views: { increment: 1 }, last_metric_updated_at: new Date() },
      create: { offer_id: offerId, views: 1 }
    });
  }

  async trackClick(offerId: string, action: string, userId?: string) {
    await this.prisma.offer_clicks.create({
      data: {
        offer_id: offerId,
        user_id: userId,
        action: action,
      }
    });

    return this.prisma.offer_metrics.upsert({
      where: { offer_id: offerId },
      update: { clicks: { increment: 1 }, last_metric_updated_at: new Date() },
      create: { offer_id: offerId, clicks: 1 }
    });
  }

  async trackShare(offerId: string) {
    return this.prisma.offer_metrics.upsert({
      where: { offer_id: offerId },
      update: { shares: { increment: 1 }, last_metric_updated_at: new Date() },
      create: { offer_id: offerId, shares: 1 }
    });
  }

  async saveOffer(offerId: string, userId: string) {
    await this.prisma.user_saved_offers.upsert({
      where: {
        user_id_offer_id: { user_id: userId, offer_id: offerId }
      },
      update: {},
      create: { user_id: userId, offer_id: offerId }
    });

    return this.prisma.offer_metrics.upsert({
      where: { offer_id: offerId },
      update: { saves: { increment: 1 }, last_metric_updated_at: new Date() },
      create: { offer_id: offerId, saves: 1 }
    });
  }

  async unsaveOffer(offerId: string, userId: string) {
    await this.prisma.user_saved_offers.delete({
      where: {
        user_id_offer_id: { user_id: userId, offer_id: offerId }
      }
    });

    return this.prisma.offer_metrics.update({
      where: { offer_id: offerId },
      data: { saves: { decrement: 1 }, last_metric_updated_at: new Date() }
    });
  }

  async createLead(offerId: string, userId: string, leadData: { phone: string, name?: string, type: string }) {
    await this.prisma.offer_leads.create({
      data: {
        offer_id: offerId,
        user_id: userId,
        user_phone: leadData.phone,
        user_name: leadData.name,
        metadata: { type: leadData.type }
      }
    });

    return this.prisma.offer_metrics.upsert({
      where: { offer_id: offerId },
      update: { clicks: { increment: 1 }, last_metric_updated_at: new Date() },
      create: { offer_id: offerId, clicks: 1 }
    });
  }
}
