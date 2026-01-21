const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting offer seeding...\n');

    try {
        // 1. Get or Create a Business Owner
        let owner = await prisma.users.findFirst({
            where: { role: 'business_owner' }
        });

        if (!owner) {
            console.log('👤 Creating a business owner...');
            owner = await prisma.users.create({
                data: {
                    phone: '1234567890',
                    display_name: 'Test Business Owner',
                    role: 'business_owner',
                    status: 'active',
                    is_phone_verified: true
                }
            });
        }

        // 2. Get or Create a Business
        let business = await prisma.businesses.findFirst({
            where: { owner_id: owner.id }
        });

        if (!business) {
            console.log('🏪 Creating a business...');
            business = await prisma.businesses.create({
                data: {
                    owner_id: owner.id,
                    business_name: 'Global Mart',
                    business_type: 'electronics',
                    brand_type: 'chain',
                    status: 'active',
                    is_verified: true,
                    description: 'Your one-stop shop for everything!'
                }
            });
        }

        // 3. Get or Create a Branch
        let branch = await prisma.business_branches.findFirst({
            where: { business_id: business.id }
        });

        if (!branch) {
            console.log('📍 Creating a branch...');
            branch = await prisma.business_branches.create({
                data: {
                    business_id: business.id,
                    branch_name: 'Main Branch',
                    city: 'Mumbai',
                    area: 'Bandra',
                    is_active: true
                }
            });
        }

        // 4. Get categories
        const categories = await prisma.categories.findMany({
            where: { parent_id: { not: null } },
            take: 10
        });

        if (categories.length === 0) {
            throw new Error('No subcategories found. Please run category seed first.');
        }

        // 5. Define 10 Diverse Offers
        const offersData = [
            {
                title: 'Mega Summer Sale',
                description: 'Get flat 50% off on all summer collections',
                type: 'percentage',
                discount: 50,
                categoryName: 'Fashion',
                imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
            },
            {
                title: 'Buy 1 Get 1 Free',
                description: 'On all casual t-shirts',
                type: 'bogo',
                categoryName: 'Fashion',
                imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'
            },
            {
                title: 'Cashback Bonanza',
                description: 'Spend ₹2000 and get ₹500 cashback',
                type: 'cashback',
                cashback: 500,
                minPurchase: 2000,
                categoryName: 'Electronics',
                imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80'
            },
            {
                title: 'Buy Laptop Get Bag',
                description: 'Free premium laptop bag with every laptop purchase',
                type: 'buy_x_get_y',
                categoryName: 'Electronics',
                imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80'
            },
            {
                title: 'Flat ₹200 Off',
                description: 'On orders above ₹999',
                type: 'flat',
                discount: 200,
                minPurchase: 999,
                categoryName: 'Home & Decor',
                imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80'
            },
            {
                title: 'Clearance Sale',
                description: 'Up to 70% off on old stock',
                type: 'percentage',
                discount: 70,
                categoryName: 'Footwear',
                imageUrl: 'https://images.unsplash.com/photo-1560769629-975e13f0c470?w=800&q=80'
            },
            {
                title: 'Pizza Festival',
                description: 'Buy 1 Medium Pizza Get 1 Small Pizza Free',
                type: 'bogo',
                categoryName: 'Food & Dining',
                imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80'
            },
            {
                title: 'Grocery Weekend',
                description: 'Flat 10% off on all fresh vegetables',
                type: 'percentage',
                discount: 10,
                categoryName: 'Grocery',
                imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
            },
            {
                title: 'New User Offer',
                description: '₹100 off on your first order',
                type: 'first_order',
                discount: 100,
                categoryName: 'Services',
                imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80'
            },
            {
                title: 'Gym Membership Deal',
                description: 'Get 3 months extra on 1 year membership',
                type: 'custom',
                categoryName: 'Sports',
                imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
            }
        ];

        console.log('🚀 Creating offers...');

        for (const data of offersData) {
            // Find a suitable category
            const category = await prisma.categories.findFirst({
                where: { name: { contains: data.categoryName, mode: 'insensitive' } }
            }) || categories[0];

            const offer = await prisma.offers.create({
                data: {
                    branch_id: branch.id,
                    title: data.title,
                    short_description: data.description,
                    description: data.description,
                    status: 'active',
                    start_date: new Date(),
                    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    created_by: owner.id,
                    offer_categories: {
                        create: {
                            category_id: category.id
                        }
                    },
                    offer_rules: {
                        create: {
                            rule_type: data.type,
                            discount_value: data.discount || null,
                            cashback_amount: data.cashback || null,
                            min_purchase_amount: data.minPurchase || null,
                        }
                    },
                    offer_media: {
                        create: {
                            image_url: data.imageUrl,
                            sort_order: 0
                        }
                    },
                    offer_metrics: {
                        create: {
                            views: 0,
                            clicks: 0,
                            claims: 0,
                            saves: 0
                        }
                    }
                }
            });
            console.log(` ✅ Created: ${offer.title}`);
        }

        console.log('\n✨ Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Error seeding offers:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
