const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 4003;
const prisma = new PrismaClient();

console.log('🚀 Starting Simplified Clan Service (V1)...');

// Basic middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple auth middleware (simulate user context from API gateway)
const requireAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.headers['authorization']?.split(' ')[1];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: userId };
    next();
};

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'clan-service-v1', timestamp: new Date().toISOString() });
});

// ===== SIMPLIFIED CLAN ENDPOINTS =====

// Get all clans (public)
app.get('/clans', async (req, res) => {
    try {
        const clans = await prisma.clan.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                description: true,
                memberCount: true,
                reputationScore: true,
                primaryCategory: true,
                createdAt: true
            },
            orderBy: { reputationScore: 'desc' }
        });
        res.json({ success: true, clans });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a clan
app.post('/clans', requireAuth, async (req, res) => {
    try {
        const { name, description, primaryCategory } = req.body;
        
        if (!name || !description) {
            return res.status(400).json({ success: false, error: 'Name and description are required' });
        }

        const clan = await prisma.clan.create({
            data: {
                name,
                description,
                primaryCategory: primaryCategory || 'General',
                clanHeadId: req.user.id,
                memberCount: 1,
                reputationScore: 0
            }
        });

        // Add creator as first member
        await prisma.clanMember.create({
            data: {
                userId: req.user.id,
                clanId: clan.id,
                role: 'LEADER',
                status: 'ACTIVE'
            }
        });

        res.status(201).json({ success: true, clan });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get clan details
app.get('/clans/:clanId', async (req, res) => {
    try {
        const clan = await prisma.clan.findUnique({
            where: { id: req.params.clanId },
            select: {
                id: true,
                name: true,
                description: true,
                primaryCategory: true,
                memberCount: true,
                reputationScore: true,
                createdAt: true,
                members: {
                    select: {
                        userId: true,
                        role: true,
                        joinedAt: true
                    }
                }
            }
        });

        if (!clan) {
            return res.status(404).json({ success: false, error: 'Clan not found' });
        }

        res.json({ success: true, clan });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Join a clan
app.post('/clans/:clanId/join', requireAuth, async (req, res) => {
    try {
        const { clanId } = req.params;
        const userId = req.user.id;

        // Check if already a member
        const existingMember = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId, clanId } }
        });

        if (existingMember) {
            return res.status(400).json({ success: false, error: 'Already a member of this clan' });
        }

        // Add member
        await prisma.clanMember.create({
            data: {
                userId,
                clanId,
                role: 'MEMBER',
                status: 'ACTIVE'
            }
        });

        // Update clan member count
        await prisma.clan.update({
            where: { id: clanId },
            data: { memberCount: { increment: 1 } }
        });

        res.json({ success: true, message: 'Successfully joined clan' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Leave a clan
app.post('/clans/:clanId/leave', requireAuth, async (req, res) => {
    try {
        const { clanId } = req.params;
        const userId = req.user.id;

        // Check if user is clan head
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (clan.clanHeadId === userId) {
            return res.status(400).json({ success: false, error: 'Clan head cannot leave. Transfer leadership first.' });
        }

        // Remove member
        await prisma.clanMember.delete({
            where: { userId_clanId: { userId, clanId } }
        });

        // Update clan member count
        await prisma.clan.update({
            where: { id: clanId },
            data: { memberCount: { decrement: 1 } }
        });

        res.json({ success: true, message: 'Successfully left clan' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== CLAN CHAT ENDPOINTS =====

// Get clan messages
app.get('/clans/:clanId/messages', requireAuth, async (req, res) => {
    try {
        const { clanId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Check if user is member
        const member = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId: req.user.id, clanId } }
        });

        if (!member) {
            return res.status(403).json({ success: false, error: 'Not a member of this clan' });
        }

        const messages = await prisma.clanMessage.findMany({
            where: { clanId },
            select: {
                id: true,
                content: true,
                messageType: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });

        res.json({ success: true, messages: messages.reverse() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send message to clan
app.post('/clans/:clanId/messages', requireAuth, async (req, res) => {
    try {
        const { clanId } = req.params;
        const { content, messageType = 'TEXT' } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Message content is required' });
        }

        // Check if user is member
        const member = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId: req.user.id, clanId } }
        });

        if (!member) {
            return res.status(403).json({ success: false, error: 'Not a member of this clan' });
        }

        const message = await prisma.clanMessage.create({
            data: {
                content,
                messageType,
                userId: req.user.id,
                clanId
            },
            select: {
                id: true,
                content: true,
                messageType: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        res.status(201).json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GIG SHARING ENDPOINTS =====

// Share a gig with clan
app.post('/clans/:clanId/share-gig', requireAuth, async (req, res) => {
    try {
        const { clanId } = req.params;
        const { gigId, gigTitle, gigDescription, gigUrl } = req.body;

        if (!gigId || !gigTitle) {
            return res.status(400).json({ success: false, error: 'Gig ID and title are required' });
        }

        // Check if user is member
        const member = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId: req.user.id, clanId } }
        });

        if (!member) {
            return res.status(403).json({ success: false, error: 'Not a member of this clan' });
        }

        // Create shared gig message
        const message = await prisma.clanMessage.create({
            data: {
                content: `Shared gig: ${gigTitle}`,
                messageType: 'GIG_SHARE',
                userId: req.user.id,
                clanId,
                metadata: {
                    gigId,
                    gigTitle,
                    gigDescription,
                    gigUrl
                }
            }
        });

        res.status(201).json({ success: true, message: 'Gig shared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get shared gigs for a clan
app.get('/clans/:clanId/shared-gigs', requireAuth, async (req, res) => {
    try {
        const { clanId } = req.params;

        // Check if user is member
        const member = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId: req.user.id, clanId } }
        });

        if (!member) {
            return res.status(403).json({ success: false, error: 'Not a member of this clan' });
        }

        const sharedGigs = await prisma.clanMessage.findMany({
            where: { 
                clanId,
                messageType: 'GIG_SHARE'
            },
            select: {
                id: true,
                content: true,
                metadata: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, sharedGigs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== REPUTATION UPDATE ENDPOINT =====

// Update clan reputation (called by reputation service when member scores change)
app.post('/clans/:clanId/update-reputation', async (req, res) => {
    try {
        const { clanId } = req.params;
        const { memberScores } = req.body; // Array of { userId, score }

        // Calculate new clan reputation based on member scores
        const totalScore = memberScores.reduce((sum, member) => sum + member.score, 0);
        const averageScore = memberScores.length > 0 ? totalScore / memberScores.length : 0;

        // Update clan reputation
        await prisma.clan.update({
            where: { id: clanId },
            data: { reputationScore: Math.round(averageScore) }
        });

        res.json({ success: true, newReputationScore: Math.round(averageScore) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');

        const server = app.listen(PORT, () => {
            console.log(`\n🎉 Simplified Clan Service (V1) is ready!`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🩺 Health: http://localhost:${PORT}/health`);
            console.log(`🏘️  Clans: http://localhost:${PORT}/clans`);
            console.log(`💬 Chat: /clans/:id/messages`);
            console.log(`🎯 Gig Sharing: /clans/:id/share-gig`);
            console.log(`📊 Reputation: Automatic updates`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await prisma.$disconnect();
    process.exit(0);
});
