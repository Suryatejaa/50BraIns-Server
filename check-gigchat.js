const { PrismaClient } = require('./services/gig-service/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkGigChatModel() {
    try {
        console.log('Testing GigChat model access...');

        // Try to find any chat
        const chats = await prisma.gigChat.findMany({
            take: 1
        });
        console.log('GigChat model works, found chats:', chats.length);

        // Check specific application chat
        const appChat = await prisma.gigChat.findUnique({
            where: { applicationId: 'cmhjgsn8h0001lgysvmtnmzeg' }
        });
        console.log('Chat for this application:', appChat ? 'Exists' : 'Does not exist');

    } catch (error) {
        console.error('GigChat model error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkGigChatModel();