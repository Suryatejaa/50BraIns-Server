const { prisma } = require('./src/config/database');

(async () => {
    try {
        console.log('Checking user 76d5fb63-2e64-4b84-b20c-529b783910b3...');

        const user = await prisma.user.findUnique({
            where: { id: '76d5fb63-2e64-4b84-b20c-529b783910b3' },
            select: { id: true, email: true, username: true }
        });
        console.log('User:', user);

        const analytics = await prisma.userAnalytics.findUnique({
            where: { userId: '76d5fb63-2e64-4b84-b20c-529b783910b3' }
        });
        console.log('Analytics:', analytics);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
})();
