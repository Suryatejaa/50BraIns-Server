const express = require('express');
const WorkHistoryService = require('../services/workHistory.service');
const Logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/portfolio/user/:userId
 * @desc Get user's portfolio items from completed work
 * @access Public
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            type,
            category,
            limit = 20,
            offset = 0,
            publicOnly = true
        } = req.query;

        // Get portfolio items through work records
        const workRecords = await WorkHistoryService.prisma.workRecord.findMany({
            where: { userId },
            include: {
                portfolioItems: {
                    where: {
                        ...(type && { type }),
                        ...(publicOnly === 'true' && { isPublic: true })
                    },
                    orderBy: { displayOrder: 'asc' }
                }
            },
            orderBy: { completedAt: 'desc' }
        });

        // Flatten portfolio items with work context
        const portfolioItems = [];
        workRecords.forEach(workRecord => {
            workRecord.portfolioItems.forEach(item => {
                portfolioItems.push({
                    ...item,
                    workContext: {
                        workRecordId: workRecord.id,
                        gigId: workRecord.gigId,
                        title: workRecord.title,
                        category: workRecord.category,
                        skills: workRecord.skills,
                        completedAt: workRecord.completedAt,
                        clientRating: workRecord.clientRating
                    }
                });
            });
        });

        // Apply category filter after flattening
        const filteredItems = category
            ? portfolioItems.filter(item => item.workContext.category === category)
            : portfolioItems;

        // Apply pagination
        const paginatedItems = filteredItems.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: {
                portfolioItems: paginatedItems,
                pagination: {
                    total: filteredItems.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: filteredItems.length > (parseInt(offset) + parseInt(limit))
                }
            }
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching portfolio', error, { userId: req.params.userId });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio'
        });
    }
});

/**
 * @route GET /api/portfolio/item/:itemId
 * @desc Get specific portfolio item details
 * @access Public
 */
router.get('/item/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;

        const portfolioItem = await WorkHistoryService.prisma.portfolioItem.findUnique({
            where: { id: itemId },
            include: {
                workRecord: {
                    select: {
                        id: true,
                        gigId: true,
                        title: true,
                        category: true,
                        skills: true,
                        completedAt: true,
                        clientRating: true,
                        clientFeedback: true
                    }
                }
            }
        });

        if (!portfolioItem) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio item not found'
            });
        }

        // Check if item is public or user has access
        if (!portfolioItem.isPublic) {
            // Add authorization check here when auth middleware is implemented
            return res.status(403).json({
                success: false,
                message: 'Access denied to private portfolio item'
            });
        }

        res.status(200).json({
            success: true,
            data: portfolioItem
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching portfolio item', error, { itemId: req.params.itemId });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio item'
        });
    }
});

/**
 * @route GET /api/portfolio/showcase/:userId
 * @desc Get user's portfolio showcase (best items)
 * @access Public
 */
router.get('/showcase/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 6 } = req.query;

        // Get work records with high ratings and portfolio items
        const showcaseRecords = await WorkHistoryService.prisma.workRecord.findMany({
            where: {
                userId,
                clientRating: { gte: 4.0 }, // Only high-rated work
                portfolioItems: {
                    some: { isPublic: true }
                }
            },
            include: {
                portfolioItems: {
                    where: { isPublic: true },
                    orderBy: { displayOrder: 'asc' },
                    take: 2 // Max 2 items per work record
                }
            },
            orderBy: [
                { clientRating: 'desc' },
                { completedAt: 'desc' }
            ],
            take: parseInt(limit)
        });

        // Format showcase data
        const showcase = showcaseRecords.map(record => ({
            workRecordId: record.id,
            gigId: record.gigId,
            title: record.title,
            category: record.category,
            skills: record.skills,
            completedAt: record.completedAt,
            clientRating: record.clientRating,
            portfolioItems: record.portfolioItems
        }));

        res.status(200).json({
            success: true,
            data: showcase
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching portfolio showcase', error, { userId: req.params.userId });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio showcase'
        });
    }
});

/**
 * @route GET /api/portfolio/categories/:userId
 * @desc Get user's portfolio organized by categories
 * @access Public
 */
router.get('/categories/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get work records with portfolio items grouped by category
        const workRecords = await WorkHistoryService.prisma.workRecord.findMany({
            where: {
                userId,
                portfolioItems: {
                    some: { isPublic: true }
                }
            },
            include: {
                portfolioItems: {
                    where: { isPublic: true },
                    orderBy: { displayOrder: 'asc' }
                }
            },
            orderBy: { completedAt: 'desc' }
        });

        // Group by category
        const categories = {};
        workRecords.forEach(record => {
            if (!categories[record.category]) {
                categories[record.category] = {
                    category: record.category,
                    itemCount: 0,
                    items: []
                };
            }

            record.portfolioItems.forEach(item => {
                categories[record.category].items.push({
                    ...item,
                    workContext: {
                        workRecordId: record.id,
                        title: record.title,
                        completedAt: record.completedAt,
                        clientRating: record.clientRating
                    }
                });
                categories[record.category].itemCount++;
            });
        });

        // Convert to array and sort by item count
        const categoryData = Object.values(categories)
            .sort((a, b) => b.itemCount - a.itemCount);

        res.status(200).json({
            success: true,
            data: categoryData
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching portfolio categories', error, { userId: req.params.userId });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio categories'
        });
    }
});

module.exports = router;
