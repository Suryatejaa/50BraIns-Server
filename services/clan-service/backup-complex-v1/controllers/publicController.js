/**
 * Public Clan Controller
 * No authentication required - publicly accessible clan information
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple helper functions
const formatSuccessResponse = (data, message = 'Success') => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
});

const formatErrorResponse = (message, details = null) => ({
    success: false,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
});

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Simple cache manager fallback
const CacheManager = {
    generateKey: (...args) => args.join(':'),
    getTTL: () => 300,
    getOrSet: async (key, fetcher) => await fetcher()
};

// Get trending/featured clans
const getTrendingClans = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, category, location } = req.query;
    const cacheKey = CacheManager.generateKey('trending', page, limit, search, category, location);

    const results = await CacheManager.getOrSet(cacheKey, async () => {
        const whereClause = {
            visibility: 'PUBLIC',
            isActive: true,
            AND: [
                search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { skills: { hasSome: [search] } },
                        { categories: { hasSome: [search] } }
                    ]
                } : {},
                category ? { primaryCategory: category } : {},
                location ? { location: { contains: location, mode: 'insensitive' } } : {}
            ]
        };

        const [clans, total] = await Promise.all([
            prisma.clan.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    tagline: true,
                    primaryCategory: true,
                    categories: true,
                    skills: true,
                    location: true,
                    averageRating: true,
                    reputationScore: true,
                    portfolioImages: true,
                    totalGigs: true,
                    isVerified: true,
                    createdAt: true,
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } }
                        }
                    }
                },
                orderBy: [
                    { reputationScore: 'desc' },
                    { averageRating: 'desc' },
                    { totalGigs: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit)
            }),
            prisma.clan.count({ where: whereClause })
        ]);

        return {
            clans: clans.map(clan => ({
                ...clan,
                memberCount: clan._count.members,
                _count: undefined
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    });

    res.json(formatSuccessResponse(results, 'Trending clans retrieved successfully'));
});

// Search clans
const searchClans = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, category, location, visibility, isVerified } = req.query;
    const cacheKey = CacheManager.generateKey('search', page, limit, search, category, location, visibility, isVerified);

    const results = await CacheManager.getOrSet(cacheKey, async () => {
        const whereClause = {
            visibility: visibility || 'PUBLIC',
            isActive: true,
            AND: [
                search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { tagline: { contains: search, mode: 'insensitive' } },
                        { skills: { hasSome: [search] } },
                        { categories: { hasSome: [search] } }
                    ]
                } : {},
                category ? { primaryCategory: category } : {},
                location ? { location: { contains: location, mode: 'insensitive' } } : {},
                isVerified !== undefined ? { isVerified: isVerified } : {}
            ]
        };

        const [clans, total] = await Promise.all([
            prisma.clan.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    tagline: true,
                    primaryCategory: true,
                    categories: true,
                    skills: true,
                    location: true,
                    averageRating: true,
                    reputationScore: true,
                    portfolioImages: true,
                    totalGigs: true,
                    isVerified: true,
                    maxMembers: true,
                    createdAt: true,
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } }
                        }
                    }
                },
                orderBy: [
                    { reputationScore: 'desc' },
                    { averageRating: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit)
            }),
            prisma.clan.count({ where: whereClause })
        ]);

        return {
            clans: clans.map(clan => ({
                ...clan,
                memberCount: clan._count.members,
                hasOpenings: clan._count.members < clan.maxMembers,
                _count: undefined
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    });

    res.json(formatSuccessResponse(results, 'Search results retrieved successfully'));
});

// Get clan by slug (public view)
const getClanBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const clanData = await prisma.clan.findUnique({
        where: {
            slug,
            visibility: 'PUBLIC',
            isActive: true
        },
        include: {
            members: {
                where: { status: 'ACTIVE' },
                select: {
                    id: true,
                    userId: true,
                    role: true,
                    customRole: true,
                    isCore: true,
                    joinedAt: true
                },
                orderBy: [
                    { role: 'asc' },
                    { joinedAt: 'asc' }
                ]
            },
            portfolio: {
                where: { isPublic: true },
                orderBy: { isFeatured: 'desc' },
                take: 6,
                select: {
                    id: true,
                    title: true,
                    mediaType: true,
                    mediaUrl: true,
                    thumbnailUrl: true,
                    tags: true,
                    views: true,
                    likes: true
                }
            },
            reviews: {
                where: { isPublic: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    rating: true,
                    title: true,
                    content: true,
                    reviewerId: true,
                    createdAt: true
                }
            },
            analytics: {
                select: {
                    profileViews: true,
                    contactClicks: true,
                    averageProjectValue: true,
                    marketRanking: true,
                    categoryRanking: true
                }
            }
        }
    });

    if (!clanData) {
        return res.status(404).json(formatErrorResponse('Clan not found'));
    }

    const clan = {
        ...clanData,
        memberCount: clanData.members.length,
        portfolioCount: await prisma.clanPortfolio.count({
            where: { clanId: clanData.id, isPublic: true }
        }),
        reviewCount: await prisma.clanReview.count({
            where: { clanId: clanData.id, isPublic: true }
        })
    };

    // Update view count
    await prisma.clanAnalytics.upsert({
        where: { clanId: clan.id },
        update: {
            profileViews: { increment: 1 },
            lastCalculatedAt: new Date()
        },
        create: {
            clanId: clan.id,
            profileViews: 1
        }
    });

    res.json(formatSuccessResponse(clan, 'Clan profile retrieved successfully'));
});

// Get clan categories
const getClanCategories = asyncHandler(async (req, res) => {
    const categoryData = await prisma.clan.groupBy({
        by: ['primaryCategory'],
        where: {
            visibility: 'PUBLIC',
            isActive: true,
            primaryCategory: { not: null }
        },
        _count: {
            primaryCategory: true
        },
        orderBy: {
            _count: {
                primaryCategory: 'desc'
            }
        }
    });

    const categories = categoryData.map(item => ({
        category: item.primaryCategory,
        count: item._count.primaryCategory
    }));

    res.json(formatSuccessResponse(categories, 'Categories retrieved successfully'));
});

// Get clan statistics
const getClanStats = asyncHandler(async (req, res) => {
    const [
        totalClans,
        totalMembers,
        totalGigs,
        averageRating,
        topCategories
    ] = await Promise.all([
        prisma.clan.count({
            where: { visibility: 'PUBLIC', isActive: true }
        }),
        prisma.clanMember.count({
            where: {
                status: 'ACTIVE',
                clan: { visibility: 'PUBLIC', isActive: true }
            }
        }),
        prisma.clan.aggregate({
            where: { visibility: 'PUBLIC', isActive: true },
            _sum: { totalGigs: true }
        }),
        prisma.clan.aggregate({
            where: {
                visibility: 'PUBLIC',
                isActive: true,
                averageRating: { gt: 0 }
            },
            _avg: { averageRating: true }
        }),
        prisma.clan.groupBy({
            by: ['primaryCategory'],
            where: {
                visibility: 'PUBLIC',
                isActive: true,
                primaryCategory: { not: null }
            },
            _count: { primaryCategory: true },
            orderBy: { _count: { primaryCategory: 'desc' } },
            take: 5
        })
    ]);

    const stats = {
        totalClans,
        totalMembers,
        totalGigs: totalGigs._sum.totalGigs || 0,
        averageRating: Number((averageRating._avg.averageRating || 0).toFixed(1)),
        topCategories: topCategories.map(cat => ({
            category: cat.primaryCategory,
            count: cat._count.primaryCategory
        }))
    };

    res.json(formatSuccessResponse(stats, 'Statistics retrieved successfully'));
});

// Get featured clans
const getFeaturedClans = asyncHandler(async (req, res) => {
    const featured = await prisma.clan.findMany({
        where: {
            visibility: 'PUBLIC',
            isActive: true,
            // More lenient criteria for featured clans
            OR: [
                { isVerified: true },
                { reputationScore: { gte: 10 } }
            ]
        },
        include: {
            _count: {
                select: {
                    members: { where: { status: 'ACTIVE' } },
                    portfolio: { where: { isPublic: true } },
                    reviews: { where: { isPublic: true } }
                }
            }
        },
        orderBy: [
            { isVerified: 'desc' },
            { reputationScore: 'desc' },
            { averageRating: 'desc' },
            { createdAt: 'desc' }
        ],
        take: 8
    });

    // Calculate scores for each clan
    const { calculateClanScore } = require('../utils/scoring');

    const results = featured.map((clan, index) => ({
        id: clan.id,
        name: clan.name,
        slug: clan.slug,
        description: clan.description,
        primaryCategory: clan.primaryCategory,
        categories: clan.categories,
        location: clan.location,
        averageRating: clan.averageRating,
        isVerified: clan.isVerified,
        visibility: clan.visibility,
        clanHeadId: clan.clanHeadId,
        memberCount: clan._count?.members || 0,
        portfolioCount: clan._count?.portfolio || 0,
        reviewCount: clan._count?.reviews || 0,
        totalGigs: clan.totalGigs,
        completedGigs: clan.completedGigs,
        score: calculateClanScore(clan),
        rank: index + 1,
        createdAt: clan.createdAt
    }));

    res.json(formatSuccessResponse(results, 'Featured clans retrieved successfully'));
});

module.exports = {
    getTrendingClans,
    getClanBySlug,
    getClanCategories,
    getClanStats,
    getFeaturedClans,
    searchClans
};
