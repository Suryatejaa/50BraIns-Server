const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');

// GET /public/categories - Get available gig categories
router.get('/categories', async (req, res) => {
    try {
        const categories = [
            { id: 'content-creation', name: 'Content Creation', description: 'Social media posts, videos, blogs' },
            { id: 'video-editing', name: 'Video Editing', description: 'Post-production, motion graphics' },
            { id: 'photography', name: 'Photography', description: 'Product, event, portrait photography' },
            { id: 'graphic-design', name: 'Graphic Design', description: 'Logos, banners, marketing materials' },
            { id: 'writing', name: 'Writing & Copywriting', description: 'Articles, scripts, marketing copy' },
            { id: 'influencer-marketing', name: 'Influencer Marketing', description: 'Brand partnerships, sponsored content' },
            { id: 'film-production', name: 'Film Production', description: 'Short films, documentaries, commercials' },
            { id: 'voice-over', name: 'Voice Over', description: 'Narration, commercials, audiobooks' },
            { id: 'animation', name: 'Animation', description: '2D/3D animation, motion graphics' },
            { id: 'music-production', name: 'Music Production', description: 'Background music, jingles, sound design' }
        ];

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories'
        });
    }
});

// GET /public/roles - Get available roles
router.get('/roles', async (req, res) => {
    try {
        const roles = [
            { id: 'influencer', name: 'Influencer', description: 'Content creators with social media following' },
            { id: 'editor', name: 'Video Editor', description: 'Post-production specialists' },
            { id: 'dop', name: 'Director of Photography', description: 'Camera operators and cinematographers' },
            { id: 'writer', name: 'Writer', description: 'Content writers and copywriters' },
            { id: 'designer', name: 'Graphic Designer', description: 'Visual design specialists' },
            { id: 'photographer', name: 'Photographer', description: 'Photography professionals' },
            { id: 'animator', name: 'Animator', description: '2D/3D animation specialists' },
            { id: 'voice-artist', name: 'Voice Artist', description: 'Voice over professionals' },
            { id: 'musician', name: 'Musician', description: 'Music composers and producers' },
            { id: 'model', name: 'Model', description: 'Fashion and commercial models' }
        ];

        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch roles'
        });
    }
});

// GET /public/featured - Get featured gigs
router.get('/featured', async (req, res) => {
    try {
        const prisma = databaseService.getClient();

        const featuredGigs = await prisma.gig.findMany({
            where: {
                status: 'OPEN',
                OR: [
                    { urgency: 'urgent' },
                    { budget: { gte: 10000 } } // High budget gigs
                ]
            },
            take: 6,
            orderBy: [
                { urgency: 'asc' },
                { budget: 'desc' },
                { createdAt: 'desc' }
            ],
            select: {
                id: true,
                title: true,
                description: true,
                budget: true,
                budgetType: true,
                roleRequired: true,
                urgency: true,
                category: true,
                location: true,
                createdAt: true,
                _count: {
                    select: {
                        applications: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: 'Featured gigs retrieved successfully',
            data: featuredGigs
        });
    } catch (error) {
        console.error('Error fetching featured gigs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured gigs'
        });
    }
});

// GET /public/stats - Get platform statistics
router.get('/stats', async (req, res) => {
    try {
        const prisma = databaseService.getClient();

        const [totalGigs, openGigs, completedGigs, totalApplications] = await Promise.all([
            prisma.gig.count(),
            prisma.gig.count({ where: { status: 'OPEN' } }),
            prisma.gig.count({ where: { status: 'COMPLETED' } }),
            prisma.application.count()
        ]);

        res.json({
            success: true,
            data: {
                totalGigs,
                openGigs,
                completedGigs,
                totalApplications,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

module.exports = router;
