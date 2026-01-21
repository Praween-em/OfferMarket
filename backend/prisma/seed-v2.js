const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoriesData = [
    {
        name: 'Fashion',
        icon: '👗',
        subcategories: [
            { name: 'Men\'s Clothing', icon: '👕' },
            { name: 'Women\'s Clothing', icon: '👗' },
            { name: 'Kids Clothing', icon: '👶' },
            { name: 'Footwear', icon: '👟' },
            { name: 'Accessories', icon: '🕶️' },
            { name: 'Jewelry', icon: '💍' },
            { name: 'Watches', icon: '⌚' },
            { name: 'Bags & Luggage', icon: '💼' },
            { name: 'Ethnic Wear', icon: '👘' }
        ]
    },
    {
        name: 'Electronics',
        icon: '📱',
        subcategories: [
            { name: 'Mobile Phones', icon: '📱' },
            { name: 'Laptops', icon: '💻' },
            { name: 'Tablets', icon: '📟' },
            { name: 'Cameras', icon: '📷' },
            { name: 'Audio & Music', icon: '🎧' },
            { name: 'Smart Watches', icon: '⌚' },
            { name: 'Gaming', icon: '🎮' },
            { name: 'Computer Accessories', icon: '🖱️' },
            { name: 'Storage Devices', icon: '💾' }
        ]
    },
    {
        name: 'Home & Decor',
        icon: '🏠',
        subcategories: [
            { name: 'Furniture', icon: '🛋️' },
            { name: 'Home Decor', icon: '🖼️' },
            { name: 'Kitchen & Dining', icon: '🍽️' },
            { name: 'Bedding', icon: '🛏️' },
            { name: 'Lighting', icon: '💡' },
            { name: 'Garden & Outdoor', icon: '🏡' },
            { name: 'Tools & Hardware', icon: '🛠️' }
        ]
    },
    {
        name: 'Appliances',
        icon: '🔌',
        subcategories: [
            { name: 'Televisions', icon: '📺' },
            { name: 'Refrigerators', icon: '❄️' },
            { name: 'Washing Machines', icon: '🧺' },
            { name: 'Air Conditioners', icon: '🌬️' },
            { name: 'Kitchen Appliances', icon: '🍳' },
            { name: 'Small Appliances', icon: '🔌' }
        ]
    },
    {
        name: 'Grocery',
        icon: '🛒',
        subcategories: [
            { name: 'Fruits & Veggies', icon: '🍎' },
            { name: 'Dairy & Eggs', icon: '🥛' },
            { name: 'Beverages', icon: '🥤' },
            { name: 'Snacks & Sweets', icon: '🍪' },
            { name: 'staples & Grains', icon: '🌾' },
            { name: 'Personal Care', icon: '🪥' },
            { name: 'Household Needs', icon: '🧹' }
        ]
    },
    {
        name: 'Beauty',
        icon: '💄',
        subcategories: [
            { name: 'Makeup', icon: '💄' },
            { name: 'Skin Care', icon: '🧴' },
            { name: 'Hair Care', icon: '💇' },
            { name: 'Fragrances', icon: '✨' },
            { name: 'Grooming', icon: '🪒' }
        ]
    },
    {
        name: 'Sports',
        icon: '⚽',
        subcategories: [
            { name: 'Fitness', icon: '💪' },
            { name: 'Cricket', icon: '🏏' },
            { name: 'Football', icon: '⚽' },
            { name: 'Badminton', icon: '🏸' },
            { name: 'Cycling', icon: '🚲' }
        ]
    },
    {
        name: 'Food & Dining',
        icon: '🍕',
        subcategories: [
            { name: 'Restaurants', icon: '🍽️' },
            { name: 'Bakeries', icon: '🥐' },
            { name: 'Cafes', icon: '☕' },
            { name: 'Sweet Shops', icon: '🍬' }
        ]
    },
    {
        name: 'Health Products',
        icon: '🏥',
        subcategories: [
            { name: 'Medicines', icon: '💊' },
            { name: 'Supplements', icon: '🥛' },
            { name: 'Personal Care', icon: '🧼' },
            { name: 'Wellness & Fitness', icon: '🧘' },
            { name: 'First Aid', icon: '🩹' },
            { name: 'Medical Equipment', icon: '🩺' }
        ]
    }
];

async function main() {
    console.log('🌱 Starting refined category seeding...\n');

    try {
        // Clear existing categories
        console.log('🗑️  Clearing existing categories...');
        await prisma.categories.deleteMany({});
        console.log('✅ Cleared\n');

        let totalCreated = 0;

        for (const category of categoriesData) {
            console.log(`📁 Creating: ${category.name} ${category.icon}`);

            const parent = await prisma.categories.create({
                data: {
                    name: category.name,
                    icon: category.icon,
                    is_active: true,
                }
            });

            totalCreated++;

            for (const sub of category.subcategories) {
                await prisma.categories.create({
                    data: {
                        name: sub.name,
                        icon: sub.icon,
                        parent_id: parent.id,
                        is_active: true,
                    }
                });
                totalCreated++;
            }

            console.log(`   ✅ ${category.subcategories.length} subcategories created`);
        }

        console.log(`\n✨ Complete! Created ${totalCreated} categories`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        prisma.$disconnect();
        process.exit(1);
    });
