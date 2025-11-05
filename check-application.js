const { PrismaClient } = require('./services/gig-service/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkApplication() {
    try {
        const app = await prisma.application.findUnique({
            where: { id: 'cmhjgsn8h0001lgysvmtnmzeg' },
            include: {
                gig: {
                    select: {
                        id: true,
                        title: true,
                        postedById: true,
                        status: true
                    }
                }
            }
        });
        console.log('Application found:', JSON.stringify(app, null, 2));

        // Also check if there's an existing chat
        const chat = await prisma.gigChat.findUnique({
            where: { applicationId: 'cmhjgsn8h0001lgysvmtnmzeg' }
        });
        console.log('Existing chat:', chat ? 'Found' : 'Not found');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkApplication();