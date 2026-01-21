import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categoriesData = [
    // Fashion & Apparel
    {
        name: 'Fashion',
        icon: '👗',
        subcategories: [
            'Men\'s Clothing',
            'Women\'s Clothing',
            'Kids Clothing',
            'Footwear',
            'Accessories',
            'Jewelry',
            'Watches',
            'Bags & Luggage',
            'Sunglasses',
            'Ethnic Wear'
        ]
    },

    // Electronics & Gadgets
    {
        name: 'Electronics',
        icon: '📱',
        subcategories: [
            'Mobile Phones',
            'Laptops',
            'Tablets',
            'Cameras',
            'Headphones & Earphones',
            'Smart Watches',
            'Gaming Consoles',
            'Computer Accessories',
            'Power Banks',
            'Mobile Accessories'
        ]
    },

    // Home & Living
    {
        name: 'Home & Decor',
        icon: '🏠',
        subcategories: [
            'Furniture',
            'Home Decor',
            'Kitchen & Dining',
            'Bedding & Linen',
            'Bath',
            'Lighting',
            'Storage & Organization',
            'Garden & Outdoor',
            'Tools & Hardware',
            'Cleaning Supplies'
        ]
    },

    // Appliances
    {
        name: 'Appliances',
        icon: '🔌',
        subcategories: [
            'Air Conditioners',
            'Refrigerators',
            'Washing Machines',
            'Televisions',
            'Microwaves',
            'Water Purifiers',
            'Vacuum Cleaners',
            'Air Purifiers',
            'Kitchen Appliances',
            'Fans & Coolers'
        ]
    },

    // Grocery & Food
    {
        name: 'Grocery',
        icon: '🛒',
        subcategories: [
            'Fruits & Vegetables',
            'Dairy Products',
            'Snacks & Beverages',
            'Packaged Food',
            'Personal Care',
            'Household Essentials',
            'Baby Care',
            'Pet Supplies',
            'Health & Wellness',
            'Organic Products'
        ]
    },

    // Beauty & Personal Care
    {
        name: 'Beauty',
        icon: '💄',
        subcategories: [
            'Makeup',
            'Skincare',
            'Haircare',
            'Fragrances',
            'Bath & Body',
            'Men\'s Grooming',
            'Beauty Tools',
            'Nail Care',
            'Salon & Spa',
            'Ayurvedic Products'
        ]
    },

    // Sports & Fitness
    {
        name: 'Sports & Fitness',
        icon: '⚽',
        subcategories: [
            'Gym Equipment',
            'Sportswear',
            'Sports Shoes',
            'Yoga & Fitness',
            'Cycling',
            'Outdoor Sports',
            'Team Sports',
            'Swimming',
            'Fitness Accessories',
            'Nutrition & Supplements'
        ]
    },

    // Books & Stationery
    {
        name: 'Books & Stationery',
        icon: '📚',
        subcategories: [
            'Fiction Books',
            'Non-Fiction Books',
            'Educational Books',
            'Comics & Magazines',
            'Office Supplies',
            'School Supplies',
            'Art & Craft',
            'Notebooks & Diaries',
            'Pens & Pencils',
            'Gift Items'
        ]
    },

    // Toys & Games
    {
        name: 'Toys & Games',
        icon: '🎮',
        subcategories: [
            'Action Figures',
            'Dolls & Soft Toys',
            'Board Games',
            'Puzzles',
            'Educational Toys',
            'Remote Control Toys',
            'Outdoor Play',
            'Baby Toys',
            'Building Blocks',
            'Video Games'
        ]
    },

    // Automotive
    {
        name: 'Automotive',
        icon: '🚗',
        subcategories: [
            'Car Accessories',
            'Bike Accessories',
            'Car Care',
            'Helmets',
            'GPS & Navigation',
            'Car Electronics',
            'Tyres & Wheels',
            'Spare Parts',
            'Tools & Equipment',
            'Vehicle Service'
        ]
    },

    // Restaurants & Food
    {
        name: 'Food & Dining',
        icon: '🍕',
        subcategories: [
            'Restaurants',
            'Fast Food',
            'Cafes & Bakeries',
            'Pizza',
            'Chinese',
            'Indian',
            'Continental',
            'Desserts',
            'Cloud Kitchens',
            'Food Delivery'
        ]
    },

    // Health & Wellness
    {
        name: 'Health & Wellness',
        icon: '🏥',
        subcategories: [
            'Medicines',
            'Vitamins & Supplements',
            'Medical Devices',
            'Fitness Equipment',
            'Health Monitors',
            'First Aid',
            'Ayurveda',
            'Homeopathy',
            'Sexual Wellness',
            'Elderly Care'
        ]
    },

    // Services
    {
        name: 'Services',
        icon: '🛠️',
        subcategories: [
            'Salon & Spa',
            'Home Cleaning',
            'Appliance Repair',
            'Plumbing',
            'Electrical',
            'Painting',
            'Pest Control',
            'AC Service',
            'Laundry',
            'Tutoring'
        ]
    },

    // Travel & Hotels
    {
        name: 'Travel',
        icon: '✈️',
        subcategories: [
            'Hotels',
            'Flights',
            'Bus Tickets',
            'Train Tickets',
            'Cab Services',
            'Travel Packages',
            'Visa Services',
            'Travel Insurance',
            'Luggage',
            'Travel Accessories'
        ]
    },

    // Entertainment
    {
        name: 'Entertainment',
        icon: '🎬',
        subcategories: [
            'Movie Tickets',
            'Events & Shows',
            'Concerts',
            'Theme Parks',
            'Gaming Zones',
            'Streaming Services',
            'Music',
            'Sports Events',
            'Comedy Shows',
            'Workshops'
        ]
    }
];

async function seedCategories() {
    console.log('🌱 Starting category seeding...');

    try {
        // Clear existing data using raw SQL to handle CASCADE deletion of self-referencing and foreign keys
        console.log('🗑️  Clearing existing category data (CASCADE)...');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "categories" RESTART IDENTITY CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "offer_categories" RESTART IDENTITY CASCADE');

        console.log('✅ Database cleared successfully.');

        let totalCreated = 0;

        for (const category of categoriesData) {
            console.log(`\n📁 Processing category: ${category.name}`);

            // Create parent category (no unique constraint on name anymore)
            const parent = await prisma.categories.create({
                data: {
                    name: category.name,
                    icon: category.icon,
                    parent_id: null,
                    is_active: true,
                }
            });

            totalCreated++;
            console.log(`   ✅ Handled parent: ${parent.name} (${parent.id})`);

            // Create subcategories
            for (const subName of category.subcategories) {
                await prisma.categories.create({
                    data: {
                        name: subName,
                        parent_id: parent.id,
                        is_active: true,
                    }
                });
                totalCreated++;
            }

            console.log(`   ✅ Handled ${category.subcategories.length} subcategories`);
        }

        console.log(`\n✨ Seeding complete!`);
        console.log(`📊 Total categories created: ${totalCreated}`);
        console.log(`   - Parent categories: ${categoriesData.length}`);
        console.log(`   - Subcategories: ${totalCreated - categoriesData.length}`);

    } catch (error) {
        console.error('❌ Error seeding categories:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed function
seedCategories()
    .then(() => {
        console.log('\n🎉 Category seeding successful!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Category seeding failed:', error);
        process.exit(1);
    });
