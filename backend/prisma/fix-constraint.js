const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Cleaning categories table constraint...');
        await prisma.$executeRawUnsafe(`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key CASCADE;`);
        console.log('Done.');
    } catch (e) {
        console.error('Error (might be expected if table doesn\'t exist):', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
