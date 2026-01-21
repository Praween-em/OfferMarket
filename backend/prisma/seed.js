const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoriesData = [
    {
        name: 'Fashion',
        subcategories: ['Men\'s Clothing', 'Women\'s Clothing', 'Kids Clothing', 'Footwear', 'Accessories', 'Jewelry', 'Watches', 'Bags & Luggage', 'Sunglasses', 'Ethnic Wear']
    },
    {
        name: 'Electronics',
        subcategories: ['Mobile Phones', 'Laptops', 'Tablets', 'Cameras', 'Headphones & Earphones', 'Smart Watches', 'Gaming Consoles', 'Computer Accessories', 'Power Banks', 'Mobile Accessories']
    },
    {
        name: 'Home & Decor',
        subcategories: ['Furniture', 'Home Decor', 'Kitchen & Dining', 'Bedding & Linen', 'Bath', 'Lighting', 'Storage & Organization', 'Garden & Outdoor', 'Tools & Hardware', 'Cleaning Supplies']
    },
    {
        name: 'Appliances',
        subcategories: ['Air Conditioners', 'Refrigerators', 'Washing Machines', 'Televisions', 'Microwaves', 'Water Purifiers', 'Vacuum Cleaners', 'Air Purifiers', 'Kitchen Appliances', 'Fans & Coolers']
    },
    {
        name: 'Grocery',
        subcategories: ['Fruits & Vegetables', 'Dairy Products', 'Snacks & Beverages', 'Packaged Food', 'Personal Care', 'Household Essentials', 'Baby Care', 'Pet Supplies', 'Health & Wellness', 'Organic Products']
    },
    {
        name: 'Beauty',
        subcategories: ['Makeup', 'Skincare', 'Haircare', 'Fragrances', 'Bath & Body', 'Men\'s Grooming', 'Beauty Tools', 'Nail Care', 'Salon & Spa', 'Ayurvedic Products']
    },
    {
        name: 'Sports & Fitness',
        subcategories: ['Gym Equipment', 'Sportswear', 'Sports Shoes', 'Yoga & Fitness', 'Cycling', 'Outdoor Sports', 'Team Sports', 'Swimming', 'Fitness Accessories', 'Nutrition & Supplements']
    },
    {
        name: 'Books & Stationery',
        subcategories: ['Fiction Books', 'Non-Fiction Books', 'Educational Books', 'Comics & Magazines', 'Office Supplies', 'School Supplies', 'Art & Craft', 'Notebooks & Diaries', 'Pens & Pencils', 'Gift Items']
    },
    {
        name: 'Toys & Games',
        subcategories: ['Action Figures', 'Dolls & Soft Toys', 'Board Games', 'Puzzles', 'Educational Toys', 'Remote Control Toys', 'Outdoor Play', 'Baby Toys', 'Building Blocks', 'Video Games']
    },
    {
        name: 'Automotive',
        subcategories: ['Car Accessories', 'Bike Accessories', 'Car Care', 'Helmets', 'GPS & Navigation', 'Car Electronics', 'Tyres & Wheels', 'Spare Parts', 'Tools & Equipment', 'Vehicle Service']
    },
    {
        name: 'Food & Dining',
        subcategories: ['Restaurants', 'Fast Food', 'Cafes & Bakeries', 'Pizza', 'Chinese', 'Indian', 'Continental', 'Desserts', 'Cloud Kitchens', 'Food Delivery']
    },
    {
        name: 'Health & Wellness',
        subcategories: ['Medicines', 'Vitamins & Supplements', 'Medical Devices', 'Fitness Equipment', 'Health Monitors', 'First Aid', 'Ayurveda', 'Homeopathy', 'Sexual Wellness', 'Elderly Care']
    },
    {
        name: 'Services',
        subcategories: ['Salon & Spa', 'Home Cleaning', 'Appliance Repair', 'Plumbing', 'Electrical', 'Painting', 'Pest Control', 'AC Service', 'Laundry', 'Tutoring']
    },
    {
        name: 'Travel',
        subcategories: ['Hotels', 'Flights', 'Bus Tickets', 'Train Tickets', 'Cab Services', 'Travel Packages', 'Visa Services', 'Travel Insurance', 'Luggage', 'Travel Accessories']
    },
    {
        name: 'Entertainment',
        subcategories: ['Movie Tickets', 'Events & Shows', 'Concerts', 'Theme Parks', 'Gaming Zones', 'Streaming Services', 'Music', 'Sports Events', 'Comedy Shows', 'Workshops']
    }
];

async function main() {
    console.log('🌱 Starting category seeding...\n');

    try {
        let totalCreated = 0;
        let skipped = 0;

        for (const category of categoriesData) {
            console.log(`📁 Processing: ${category.name}`);

            // Check if parent category already exists
            let parent = await prisma.categories.findFirst({
                where: { name: category.name, parent_id: null }
            });

            if (!parent) {
                parent = await prisma.categories.create({
                    data: {
                        name: category.name,
                        is_active: true,
                    }
                });
                totalCreated++;
                console.log(`   ✅ Created parent`);
            } else {
                console.log(`   ⏭️  Parent already exists`);
                skipped++;
            }

            // Create subcategories
            let subCreated = 0;
            for (const subName of category.subcategories) {
                const existing = await prisma.categories.findFirst({
                    where: { name: subName, parent_id: parent.id }
                });

                if (!existing) {
                    await prisma.categories.create({
                        data: {
                            name: subName,
                            parent_id: parent.id,
                            is_active: true,
                        }
                    });
                    totalCreated++;
                    subCreated++;
                }
            }

            if (subCreated > 0) {
                console.log(`   ✅ Created ${subCreated} subcategories`);
            }
        }

        console.log(`\n✨ Complete!`);
        console.log(`   - Created: ${totalCreated} categories`);
        console.log(`   - Skipped: ${skipped} (already existed)\n`);

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
