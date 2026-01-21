const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Enabling PostGIS extension...');
        await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
        console.log('PostGIS enabled.');
    } catch (e) {
        console.error('Error enabling PostGIS:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
