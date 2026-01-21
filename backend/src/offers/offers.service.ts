
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto'; // Assuming this DTO exists

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) { }

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
        status: 'active',
        business_branches: {
          business_id: businessId,
        },
      },
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
}
