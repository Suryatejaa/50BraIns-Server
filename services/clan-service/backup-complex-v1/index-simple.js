const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 4003;
const prisma = new PrismaClient();

console.log('🚀 Starting Clan Service (Simple)...');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'clan-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Featured clans
app.get('/public/featured', async (req, res) => {
    try {
        const featured = await prisma.clan.findMany({
            where: {
                visibility: 'PUBLIC',
                isActive: true,
                reputationScore: { gte: 80 }
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                tagline: true,
                primaryCategory: true,
                averageRating: true,
                reputationScore: true,
                portfolioImages: true,
                totalGigs: true,
                isVerified: true,
                _count: {
                    select: {
                        members: { where: { status: 'ACTIVE' } }
                    }
                }
            },
            orderBy: [
                { reputationScore: 'desc' },
                { averageRating: 'desc' }
            ],
            take: 8
        });

        const results = featured.map(clan => ({
            ...clan,
            memberCount: clan._count.members,
            _count: undefined
        }));

        res.json({
            success: true,
            message: 'Featured clans retrieved successfully',
            data: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting featured clans:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Member invitation endpoint
app.post('/members/invite', async (req, res) => {
    try {
        const { clanId } = req.query;
        const { invitedEmail, role = 'MEMBER', message } = req.body;

        if (!clanId) {
            return res.status(400).json({
                success: false,
                error: 'clanId is required',
                timestamp: new Date().toISOString()
            });
        }

        if (!invitedEmail) {
            return res.status(400).json({
                success: false,
                error: 'invitedEmail is required',
                timestamp: new Date().toISOString()
            });
        }

        // Check if clan exists
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            return res.status(404).json({
                success: false,
                error: 'Clan not found',
                timestamp: new Date().toISOString()
            });
        }

        // Create invitation
        const invitation = await prisma.clanInvitation.create({
            data: {
                clanId,
                invitedEmail,
                role,
                message,
                invitedBy: 'system', // In real app, this would be req.user.id
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });

        res.status(201).json({
            success: true,
            message: 'Invitation sent successfully',
            data: invitation,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error sending invitation:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('💥 Error:', error.message);
    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🎉 Clan Service (Simple) is ready!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
    console.log(`🌐 Featured: http://localhost:${PORT}/public/featured`);
    console.log(`👥 Invite: POST http://localhost:${PORT}/members/invite?clanId=ID`);
    console.log(`🧪 Ready for testing!`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📴 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📴 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
