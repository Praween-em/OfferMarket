
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Content Check ---');

    try {
        const userCount = await prisma.users.count();
        console.log('Users:', userCount);

        const categoryCount = await prisma.categories.count();
        console.log('Categories:', categoryCount);

        const businessCount = await prisma.businesses.count();
        console.log('Businesses:', businessCount);

        const branchCount = await prisma.business_branches.count();
        console.log('Branches:', branchCount);

        const offerCount = await prisma.offers.count();
        console.log('Offers:', offerCount);

        const activeOffers = await prisma.offers.count({
            where: {
                status: 'active',
                start_date: { lte: new Date() },
                end_date: { gte: new Date() }
            }
        });
        console.log('Active Offers (Current):', activeOffers);

        if (categoryCount > 0) {
            const sampleCats = await prisma.categories.findMany({ take: 5 });
            console.log('Sample Categories:', sampleCats.map(c => c.name));
        }

    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
