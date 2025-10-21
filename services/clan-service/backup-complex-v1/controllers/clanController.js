const databaseService = require('../services/database');
const { calculateClanScore, getScoreBreakdown, rankClans } = require('../utils/scoring');
const axios = require('axios');
const rabbitmqService = require('../services/rabbitmqService');

const REPUTATION_SERVICE_URL = process.env.REPUTATION_SERVICE_URL || 'http://localhost:4006';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class ClanController {
    // Get all clans with filtering and ranking
    async getClans(req, res) {
        try {
            const {
                category,
                location,
                visibility,
                isVerified,
                minMembers,
                maxMembers,
                sortBy = 'score',
                order = 'desc',
                page = 1,
                limit = 20
            } = req.query;

            const prisma = await databaseService.getClient();

            // Get clans with all related data for scoring
            const clans = await prisma.clan.findMany({
                include: {
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } },
                            portfolio: { where: { isPublic: true } },
                            reviews: { where: { isPublic: true } }
                        }
                    },
                    analytics: true,
                    members: {
                        where: { status: 'ACTIVE' },
                        select: {
                            id: true,
                            userId: true,
                            role: true,
                            joinedAt: true,
                            gigsParticipated: true,
                            contributionScore: true
                        }
                    },
                    portfolio: {
                        where: { isPublic: true },
                        select: {
                            projectValue: true,
                            likes: true,
                            views: true,
                            isFeatured: true,
                            createdAt: true
                        }
                    },
                    reviews: {
                        where: { isPublic: true },
                        select: {
                            rating: true,
                            communicationRating: true,
                            qualityRating: true,
                            timelinessRating: true,
                            professionalismRating: true
                        }
                    }
                }
            });

            // Apply filters
            const filters = {};
            if (category) filters.category = category;
            if (location) filters.location = location;
            if (visibility) filters.visibility = visibility;
            if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
            if (minMembers) filters.minMembers = parseInt(minMembers);
            if (maxMembers) filters.maxMembers = parseInt(maxMembers);

            // Calculate scores and rank clans
            const rankedClans = rankClans(clans, filters);

            // Apply sorting and pagination
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const sortedClans = rankedClans.slice(offset, offset + limitNum);

            // Enrich with membership and join-request info for UI
            const prismaIds = sortedClans.map(c => c.id);
            const currentUserId = req.user?.id;
            let clanIdToMemberUserIds = {};
            let userProfilesMap = new Map();
            let clanIdToPendingUserIds = {};
            let userPendingMap = new Map();
            try {
                const [members, pendingRequests, userPendingRequests] = await Promise.all([
                    prisma.clanMember.findMany({
                        where: { clanId: { in: prismaIds }, status: 'ACTIVE' },
                        select: { clanId: true, userId: true }
                    }),
                    prisma.clanJoinRequest.findMany({
                        where: { clanId: { in: prismaIds }, status: 'PENDING' },
                        select: { clanId: true, userId: true }
                    }),
                    currentUserId
                        ? prisma.clanJoinRequest.findMany({
                            where: { clanId: { in: prismaIds }, userId: currentUserId, status: 'PENDING' },
                            select: { clanId: true, id: true }
                        })
                        : Promise.resolve([])
                ]);

                for (const m of members) {
                    if (!clanIdToMemberUserIds[m.clanId]) clanIdToMemberUserIds[m.clanId] = [];
                    clanIdToMemberUserIds[m.clanId].push(m.userId);
                }
                for (const r of pendingRequests) {
                    if (!clanIdToPendingUserIds[r.clanId]) clanIdToPendingUserIds[r.clanId] = [];
                    clanIdToPendingUserIds[r.clanId].push(r.userId);
                }
                userPendingMap = new Map(userPendingRequests.map(r => [r.clanId, r.id]));

                // Batch fetch minimal user identities
                console.log('Fetching user details');
                const uniqueUserIds = Array.from(new Set(members.map(m => m.userId)));
                if (uniqueUserIds.length) {
                    console.log(uniqueUserIds);
                    const resp = await axios.post(`${BASE_URL}/api/internal/profiles/internal/by-ids`,
                        { userIds: uniqueUserIds },
                        {
                            headers: {
                                'x-internal': 'true',
                                'x-calling-service': 'clan-service',
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    console.log('Resp: ', resp);
                    const users = resp.data?.data || [];
                    for (const u of users) userProfilesMap.set(u.id, u);
                }
            } catch (e) {
                // Non-blocking enrichment
            }

            // Update analytics for ranked clans
            for (const clan of sortedClans) {
                await prisma.clanAnalytics.upsert({
                    where: { clanId: clan.id },
                    update: {
                        marketRanking: clan.rank,
                        categoryRanking: filters.category ? clan.rank : null,
                        localRanking: filters.location ? clan.rank : null,
                        lastCalculatedAt: new Date()
                    },
                    create: {
                        clanId: clan.id,
                        marketRanking: clan.rank,
                        categoryRanking: filters.category ? clan.rank : null,
                        localRanking: filters.location ? clan.rank : null
                    }
                });
            }

            res.json({
                success: true,
                data: sortedClans.map(clan => ({
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
                    score: clan.score,
                    rank: clan.rank,
                    createdAt: clan.createdAt,
                    // Added membership context for UI
                    memberIds: clanIdToMemberUserIds[clan.id] || [],
                    members: (clanIdToMemberUserIds[clan.id] || []).map(uid => ({ userId: uid, user: userProfilesMap.get(uid) || null })),
                    pendingJoinUserIds: clanIdToPendingUserIds[clan.id] || [],
                    isMember: (clanIdToMemberUserIds[clan.id] || []).includes(currentUserId),
                    hasPendingJoinRequest: userPendingMap.has(clan.id),
                    pendingJoinRequestId: userPendingMap.get(clan.id) || null
                })),
                meta: {
                    page: pageNum,
                    limit: limitNum,
                    total: rankedClans.length,
                    pages: Math.ceil(rankedClans.length / limitNum),
                    filters,
                    sorting: { sortBy, order }
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Enhanced get clans with reputation integration for feed
    async getClansAdvanced(req, res) {
        try {
            const {
                category,
                location,
                visibility = 'PUBLIC',
                isVerified,
                minMembers,
                maxMembers,
                sortBy = 'reputation', // reputation, score, members, activity, date, relevance
                order = 'desc',
                page = 1,
                limit = 20,
                search,
                tier, // Reputation tier filter
                minScore,
                maxScore
            } = req.query;

            const prisma = await databaseService.getClient();

            // Build where clause
            const where = {};

            if (category) {
                const categoryArray = Array.isArray(category) ? category : category.split(',');
                where.categories = { hasSome: categoryArray };
            }

            if (location) {
                where.location = { contains: location, mode: 'insensitive' };
            }

            if (visibility) {
                const visibilityArray = Array.isArray(visibility) ? visibility : visibility.split(',');
                where.visibility = visibilityArray.length === 1 ? visibilityArray[0] : { in: visibilityArray };
            }

            if (isVerified !== undefined) {
                where.isVerified = isVerified === 'true';
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { categories: { has: search } }
                ];
            }

            // Get clans with detailed data
            const clans = await prisma.clan.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } },
                            portfolio: { where: { isPublic: true } },
                            reviews: { where: { isPublic: true } }
                        }
                    },
                    analytics: true,
                    members: {
                        where: { status: 'ACTIVE' },
                        select: {
                            id: true,
                            userId: true,
                            role: true,
                            joinedAt: true,
                            gigsParticipated: true,
                            contributionScore: true
                        },
                        take: 5 // Limit for performance
                    },
                    portfolio: {
                        where: { isPublic: true },
                        select: {
                            projectValue: true,
                            likes: true,
                            views: true,
                            isFeatured: true,
                            createdAt: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 3 // Latest portfolio items
                    },
                    reviews: {
                        where: { isPublic: true },
                        select: {
                            rating: true,
                            communicationRating: true,
                            qualityRating: true,
                            timelinessRating: true,
                            professionalismRating: true,
                            createdAt: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5 // Recent reviews
                    }
                }
            });

            // Build membership and join-request maps for browse UI
            const clanIds = clans.map(c => c.id);
            const currentUserId = req.user?.id;
            let clanIdToMemberUserIds = {};
            let userProfilesMap = new Map();
            let clanIdToPendingUserIds = {};
            let pendingRequestMap = new Map();
            try {
                const [members, allPendingRequests, userJoinRequests] = await Promise.all([
                    prisma.clanMember.findMany({
                        where: { clanId: { in: clanIds }, status: 'ACTIVE' },
                        select: { clanId: true, userId: true }
                    }),
                    prisma.clanJoinRequest.findMany({
                        where: { clanId: { in: clanIds }, status: 'PENDING' },
                        select: { clanId: true, userId: true }
                    }),
                    currentUserId
                        ? prisma.clanJoinRequest.findMany({
                            where: { clanId: { in: clanIds }, userId: currentUserId, status: 'PENDING' },
                            select: { clanId: true, id: true }
                        })
                        : Promise.resolve([])
                ]);

                for (const m of members) {
                    if (!clanIdToMemberUserIds[m.clanId]) clanIdToMemberUserIds[m.clanId] = [];
                    clanIdToMemberUserIds[m.clanId].push(m.userId);
                }
                for (const r of allPendingRequests) {
                    if (!clanIdToPendingUserIds[r.clanId]) clanIdToPendingUserIds[r.clanId] = [];
                    clanIdToPendingUserIds[r.clanId].push(r.userId);
                }
                pendingRequestMap = new Map(userJoinRequests.map(r => [r.clanId, r.id]));

                // Batch fetch minimal user identities
                const uniqueUserIds = Array.from(new Set(members.map(m => m.userId)));
                if (uniqueUserIds.length) {
                    const resp = await axios.post(`${BASE_URL}/api/internal/profiles/internal/by-ids`,
                        { userIds: uniqueUserIds },
                        {
                            headers: {
                                'x-internal': 'true',
                                'x-calling-service': 'clan-service',
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    const users = resp.data?.data || [];
                    for (const u of users) userProfilesMap.set(u.id, u);
                }
            } catch (e) {
                // Non-blocking enrichment
            }

            // Apply member count filters
            let filteredClans = clans;
            if (minMembers || maxMembers) {
                filteredClans = clans.filter(clan => {
                    const memberCount = clan._count?.members || 0;
                    if (minMembers && memberCount < parseInt(minMembers)) return false;
                    if (maxMembers && memberCount > parseInt(maxMembers)) return false;
                    return true;
                });
            }

            // Calculate clan scores
            const clansWithScores = filteredClans.map(clan => {
                const score = calculateClanScore(clan);
                const scoreBreakdown = getScoreBreakdown(clan);

                return {
                    ...clan,
                    calculatedScore: score,
                    scoreBreakdown,
                    memberCount: clan._count?.members || 0,
                    portfolioCount: clan._count?.portfolio || 0,
                    reviewCount: clan._count?.reviews || 0,
                    recentActivity: clan.analytics?.lastActivityAt || clan.updatedAt
                };
            });

            // Fetch reputation data if sorting by reputation
            let enrichedClans = clansWithScores;
            if (sortBy === 'reputation' || tier || minScore || maxScore) {
                try {
                    // Get clan reputation from reputation service
                    const response = await axios.get(`${REPUTATION_SERVICE_URL}/api/reputation/leaderboard/clans?limit=1000`);
                    if (response.data.success) {
                        const clanReputations = response.data.data.clans;
                        const reputationMap = {};

                        clanReputations.forEach(rep => {
                            reputationMap[rep.clanId] = rep;
                        });

                        enrichedClans = clansWithScores.map(clan => ({
                            ...clan,
                            reputation: reputationMap[clan.id] || {
                                averageScore: 0,
                                totalScore: 0,
                                tier: 'BRONZE',
                                rank: null
                            }
                        }));

                        // Apply reputation filters
                        enrichedClans = enrichedClans.filter(clan => {
                            if (tier && clan.reputation.tier !== tier.toUpperCase()) return false;
                            if (minScore && clan.reputation.averageScore < parseFloat(minScore)) return false;
                            if (maxScore && clan.reputation.averageScore > parseFloat(maxScore)) return false;
                            return true;
                        });
                    }
                } catch (error) {
                    console.warn('Failed to fetch clan reputation data:', error.message);
                }
            }

            // Sort clans
            enrichedClans.sort((a, b) => {
                let valueA, valueB;

                switch (sortBy) {
                    case 'reputation':
                        valueA = a.reputation?.averageScore || 0;
                        valueB = b.reputation?.averageScore || 0;
                        break;
                    case 'members':
                        valueA = a.memberCount;
                        valueB = b.memberCount;
                        break;
                    case 'activity':
                        valueA = new Date(a.recentActivity).getTime();
                        valueB = new Date(b.recentActivity).getTime();
                        break;
                    case 'date':
                        valueA = new Date(a.createdAt).getTime();
                        valueB = new Date(b.createdAt).getTime();
                        break;
                    case 'relevance':
                        // Combination of score, activity, and members
                        valueA = (a.calculatedScore * 0.5) + (a.memberCount * 0.3) +
                            (a.recentActivity ? (Date.now() - new Date(a.recentActivity).getTime()) / -86400000 : 0) * 0.2;
                        valueB = (b.calculatedScore * 0.5) + (b.memberCount * 0.3) +
                            (b.recentActivity ? (Date.now() - new Date(b.recentActivity).getTime()) / -86400000 : 0) * 0.2;
                        break;
                    case 'score':
                    default:
                        valueA = a.calculatedScore;
                        valueB = b.calculatedScore;
                        break;
                }

                return order === 'desc' ? valueB - valueA : valueA - valueB;
            });

            // Apply pagination
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;
            const paginatedClans = enrichedClans.slice(offset, offset + limitNum);

            // Format response
            const formattedClans = paginatedClans.map((clan, index) => ({
                id: clan.id,
                name: clan.name,
                slug: clan.slug,
                description: clan.description,
                avatar: clan.avatar,
                banner: clan.banner,
                primaryCategory: clan.primaryCategory,
                categories: clan.categories,
                location: clan.location,
                averageRating: clan.averageRating,
                isVerified: clan.isVerified,
                visibility: clan.visibility,
                clanHeadId: clan.clanHeadId,
                memberCount: clan.memberCount,
                portfolioCount: clan.portfolioCount,
                reviewCount: clan.reviewCount,
                calculatedScore: clan.calculatedScore,
                rank: offset + index + 1,
                reputation: clan.reputation || {
                    averageScore: 0,
                    totalScore: 0,
                    tier: 'BRONZE',
                    rank: null
                },
                // Membership/Join indicators for current user and IDs for UI logic
                memberIds: clanIdToMemberUserIds[clan.id] || [],
                pendingJoinUserIds: clanIdToPendingUserIds[clan.id] || [],
                isMember: (clanIdToMemberUserIds[clan.id] || []).includes(currentUserId),
                hasPendingJoinRequest: pendingRequestMap.has(clan.id),
                pendingJoinRequestId: pendingRequestMap.get(clan.id) || null,
                stats: {
                    totalGigs: clan.totalGigs || 0,
                    completedGigs: clan.completedGigs || 0,
                    successRate: clan.totalGigs > 0 ?
                        ((clan.completedGigs || 0) / clan.totalGigs * 100).toFixed(1) : 0,
                    avgProjectValue: clan.portfolio?.length > 0 ?
                        clan.portfolio.reduce((sum, p) => sum + (p.projectValue || 0), 0) / clan.portfolio.length : 0,
                    recentActivity: clan.recentActivity
                },
                featured: {
                    topMembers: clan.members?.slice(0, 3).map(member => ({
                        userId: member.userId,
                        role: member.role,
                        contributionScore: member.contributionScore,
                        gigsParticipated: member.gigsParticipated,
                        user: userProfilesMap.get(member.userId) || null
                    })) || [],
                    recentPortfolio: clan.portfolio?.slice(0, 2).map(item => ({
                        projectValue: item.projectValue,
                        likes: item.likes,
                        views: item.views,
                        isFeatured: item.isFeatured
                    })) || []
                },
                createdAt: clan.createdAt,
                updatedAt: clan.updatedAt
            }));

            res.json({
                success: true,
                data: {
                    clans: formattedClans,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: enrichedClans.length,
                        totalPages: Math.ceil(enrichedClans.length / limitNum),
                        hasNext: offset + limitNum < enrichedClans.length,
                        hasPrev: pageNum > 1
                    },
                    filters: {
                        category: category?.split(',') || [],
                        location,
                        visibility: visibility?.split(',') || [],
                        isVerified,
                        minMembers,
                        maxMembers,
                        sortBy,
                        order,
                        search,
                        tier,
                        minScore,
                        maxScore
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in getClansAdvanced:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch clans',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Create a new clan
    async createClan(req, res) {
        try {
            const clanData = req.body;
            const prisma = await databaseService.getClient();

            // Generate slug from name
            const slug = clanData.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') + '-' + Date.now();

            // Map specialties to categories if provided
            const processedData = { ...clanData };
            if (clanData.specialties && !clanData.categories) {
                processedData.categories = clanData.specialties;
                delete processedData.specialties;
            }

            // Set visibility based on isPrivate
            if (clanData.isPrivate !== undefined) {
                processedData.visibility = clanData.isPrivate ? 'PRIVATE' : 'PUBLIC';
                delete processedData.isPrivate;
            }

            const newClan = await prisma.clan.create({
                data: {
                    ...processedData,
                    slug,
                    clanHeadId: req.user.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                include: {
                    _count: {
                        select: {
                            members: true,
                            portfolio: true,
                            reviews: true
                        }
                    }
                }
            });

            // Calculate initial score
            const score = calculateClanScore(newClan);
            const scoreBreakdown = getScoreBreakdown(newClan);

            // Update clan with initial score
            await prisma.clan.update({
                where: { id: newClan.id },
                data: { reputationScore: Math.round(score) }
            });

            // Create initial analytics
            await prisma.clanAnalytics.create({
                data: {
                    clanId: newClan.id,
                    profileViews: 0,
                    marketRanking: null,
                    categoryRanking: null,
                    localRanking: null
                }
            });

            // Add clan owner as a member automatically
            await prisma.clanMember.create({
                data: {
                    userId: req.user.id,
                    clanId: newClan.id,
                    role: 'HEAD', // Clan head role
                    isCore: true,
                    joinedAt: new Date(),
                    lastActiveAt: new Date()
                }
            });

            // Publish clan creation event
            try {
                await rabbitmqService.publishClanCreated(newClan);
                await rabbitmqService.publishMemberJoined(newClan.id, req.user.id, 'HEAD');
            } catch (error) {
                console.error('Failed to publish clan events:', error);
                // Don't fail the request if event publishing fails
            }

            res.status(201).json({
                success: true,
                data: {
                    ...newClan,
                    memberCount: (newClan._count?.members || 0) + 1, // +1 for the owner who was just added
                    portfolioCount: newClan._count?.portfolio || 0,
                    reviewCount: newClan._count?.reviews || 0,
                    score,
                    scoreBreakdown
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Get a single clan by ID
    async getClanById(req, res) {
        try {
            const { clanId } = req.params;
            const prisma = await databaseService.getClient();

            const clan = await prisma.clan.findUnique({
                where: { id: clanId },
                include: {
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } },
                            portfolio: { where: { isPublic: true } },
                            reviews: { where: { isPublic: true } }
                        }
                    },
                    analytics: true,
                    members: {
                        where: { status: 'ACTIVE' },
                        select: {
                            id: true,
                            userId: true,
                            role: true,
                            customRole: true,
                            isCore: true,
                            joinedAt: true,
                            gigsParticipated: true,
                            contributionScore: true
                        },
                        orderBy: [
                            { role: 'asc' },
                            { isCore: 'desc' },
                            { joinedAt: 'asc' }
                        ]
                    },
                    portfolio: {
                        where: { isPublic: true },
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            mediaType: true,
                            mediaUrl: true,
                            thumbnailUrl: true,
                            projectType: true,
                            clientName: true,
                            projectDate: true,
                            projectValue: true,
                            tags: true,
                            skills: true,
                            isFeatured: true,
                            views: true,
                            likes: true,
                            createdAt: true
                        },
                        orderBy: [
                            { isFeatured: 'desc' },
                            { createdAt: 'desc' }
                        ]
                    },
                    reviews: {
                        where: { isPublic: true },
                        select: {
                            id: true,
                            rating: true,
                            title: true,
                            content: true,
                            reviewerId: true,
                            communicationRating: true,
                            qualityRating: true,
                            timelinessRating: true,
                            professionalismRating: true,
                            projectType: true,
                            isVerified: true,
                            createdAt: true
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!clan) {
                return res.status(404).json({
                    success: false,
                    error: 'Clan not found',
                    timestamp: new Date().toISOString()
                });
            }

            // Calculate fresh score
            const score = calculateClanScore(clan);
            const scoreBreakdown = getScoreBreakdown(clan);

            // Update clan's reputation score in database
            await prisma.clan.update({
                where: { id: clanId },
                data: {
                    reputationScore: Math.round(score),
                    updatedAt: new Date()
                }
            });

            // Update analytics with profile view
            await prisma.clanAnalytics.upsert({
                where: { clanId },
                update: {
                    profileViews: { increment: 1 },
                    lastCalculatedAt: new Date()
                },
                create: {
                    clanId,
                    profileViews: 1
                }
            });

            // Get pending join request user IDs for this clan
            let pendingJoinUserIds = [];
            try {
                const pendingRequests = await prisma.clanJoinRequest.findMany({
                    where: { clanId, status: 'PENDING' },
                    select: { userId: true }
                });
                pendingJoinUserIds = pendingRequests.map(r => r.userId);
            } catch (e) {
                // Non-blocking enrichment
            }

            res.json({
                success: true,
                data: {
                    ...clan,
                    memberCount: clan._count?.members || 0,
                    portfolioCount: clan._count?.portfolio || 0,
                    reviewCount: clan._count?.reviews || 0,
                    score,
                    scoreBreakdown,
                    // Enrich with pending join request user IDs for UI logic
                    pendingJoinUserIds,
                    rank: null // Individual clan view doesn't show rank
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Update a clan
    async updateClan(req, res) {
        try {
            const { clanId } = req.params;
            const updates = req.body;
            const prisma = await databaseService.getClient();

            // Update clan
            const updatedClan = await prisma.clan.update({
                where: { id: clanId },
                data: {
                    ...updates,
                    updatedAt: new Date()
                },
                include: {
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } },
                            portfolio: { where: { isPublic: true } },
                            reviews: { where: { isPublic: true } }
                        }
                    },
                    analytics: true,
                    members: {
                        where: { status: 'ACTIVE' },
                        select: {
                            id: true,
                            userId: true,
                            role: true,
                            joinedAt: true
                        }
                    },
                    portfolio: {
                        where: { isPublic: true },
                        select: {
                            id: true,
                            projectValue: true,
                            likes: true,
                            views: true,
                            isFeatured: true
                        }
                    },
                    reviews: {
                        where: { isPublic: true },
                        select: {
                            rating: true,
                            communicationRating: true,
                            qualityRating: true,
                            timelinessRating: true,
                            professionalismRating: true
                        }
                    }
                }
            });

            // Recalculate score after update
            const score = calculateClanScore(updatedClan);
            const scoreBreakdown = getScoreBreakdown(updatedClan);

            // Update reputation score
            await prisma.clan.update({
                where: { id: clanId },
                data: { reputationScore: Math.round(score) }
            });

            res.json({
                success: true,
                data: {
                    ...updatedClan,
                    memberCount: updatedClan._count?.members || 0,
                    portfolioCount: updatedClan._count?.portfolio || 0,
                    reviewCount: updatedClan._count?.reviews || 0,
                    score,
                    scoreBreakdown
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Get clans created by current user
    async getMyClans(req, res) {
        try {
            const userId = req.user.id;
            const {
                sortBy = 'createdAt',
                order = 'desc',
                page = 1,
                limit = 20
            } = req.query;

            const prisma = await databaseService.getClient();

            // Get clans where user is the clan head OR active member
            const clans = await prisma.clan.findMany({
                where: {
                    OR: [
                        { clanHeadId: userId },
                        { members: { some: { userId: userId, status: 'ACTIVE' } } }
                    ]
                },
                include: {
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } },
                            portfolio: { where: { isPublic: true } },
                            reviews: { where: { isPublic: true } }
                        }
                    },
                    analytics: true,
                    members: {
                        where: { status: 'ACTIVE' },
                        select: {
                            id: true,
                            userId: true,
                            role: true,
                            joinedAt: true,
                            gigsParticipated: true,
                            contributionScore: true
                        }
                    },
                    portfolio: {
                        where: { isPublic: true },
                        select: {
                            projectValue: true,
                            likes: true,
                            views: true,
                            isFeatured: true,
                            createdAt: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 3
                    },
                    reviews: {
                        where: { isPublic: true },
                        select: {
                            rating: true,
                            communicationRating: true,
                            qualityRating: true,
                            timelinessRating: true,
                            professionalismRating: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    }
                }
            });

            // Calculate scores for each clan
            const clansWithScores = clans.map(clan => {
                const score = calculateClanScore(clan);
                const scoreBreakdown = getScoreBreakdown(clan);

                return {
                    ...clan,
                    calculatedScore: score,
                    scoreBreakdown,
                    memberCount: clan._count?.members || 0,
                    portfolioCount: clan._count?.portfolio || 0,
                    reviewCount: clan._count?.reviews || 0
                };
            });

            // Sort clans
            clansWithScores.sort((a, b) => {
                let valueA, valueB;

                switch (sortBy) {
                    case 'name':
                        valueA = a.name.toLowerCase();
                        valueB = b.name.toLowerCase();
                        break;
                    case 'members':
                        valueA = a.memberCount;
                        valueB = b.memberCount;
                        break;
                    case 'score':
                        valueA = a.calculatedScore;
                        valueB = b.calculatedScore;
                        break;
                    case 'revenue':
                        valueA = a.totalRevenue || 0;
                        valueB = b.totalRevenue || 0;
                        break;
                    case 'gigs':
                        valueA = a.totalGigs || 0;
                        valueB = b.totalGigs || 0;
                        break;
                    case 'createdAt':
                    default:
                        valueA = new Date(a.createdAt).getTime();
                        valueB = new Date(b.createdAt).getTime();
                        break;
                }

                return order === 'desc' ? valueB - valueA : valueA - valueB;
            });

            // Apply pagination
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;
            const paginatedClans = clansWithScores.slice(offset, offset + limitNum);

            // Format response
            const formattedClans = paginatedClans.map(clan => ({
                id: clan.id,
                name: clan.name,
                slug: clan.slug,
                description: clan.description,
                tagline: clan.tagline,
                visibility: clan.visibility,
                isActive: clan.isActive,
                isVerified: clan.isVerified,
                clanHeadId: clan.clanHeadId,
                email: clan.email
            }));

            res.json({
                success: true,
                data: {
                    clans: formattedClans,
                    pagination: null,
                    sorting: null
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in getMyClans:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user clans',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Request to join a clan
    async requestToJoinClan(req, res) {
        try {
            const { clanId } = req.params;
            const userId = req.user.id;
            const { message } = req.body; // Optional message with the request

            const prisma = await databaseService.getClient();

            // Check if clan exists and is public
            const clan = await prisma.clan.findUnique({
                where: { id: clanId },
                select: {
                    id: true,
                    name: true,
                    visibility: true,
                    isActive: true,
                    maxMembers: true,
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } }
                        }
                    }
                }
            });

            if (!clan) {
                return res.status(404).json({
                    success: false,
                    error: 'Clan not found',
                    timestamp: new Date().toISOString()
                });
            }

            if (clan.visibility !== 'PUBLIC') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot join private clan',
                    timestamp: new Date().toISOString()
                });
            }

            if (!clan.isActive) {
                return res.status(400).json({
                    success: false,
                    error: 'Clan is not active',
                    timestamp: new Date().toISOString()
                });
            }

            // Check if user is already a member
            const existingMember = await prisma.clanMember.findFirst({
                where: {
                    clanId,
                    userId,
                    status: 'ACTIVE'
                }
            });

            if (existingMember) {
                return res.status(400).json({
                    success: false,
                    error: 'You are already a member of this clan',
                    timestamp: new Date().toISOString()
                });
            }

            // Check if there's already a pending request
            const existingRequest = await prisma.clanJoinRequest.findFirst({
                where: {
                    clanId,
                    userId,
                    status: 'PENDING'
                }
            });

            if (existingRequest) {
                return res.status(400).json({
                    success: false,
                    error: 'You already have a pending request to join this clan',
                    timestamp: new Date().toISOString()
                });
            }

            // Check if clan has space
            const memberCount = clan._count.members;
            if (clan.maxMembers && memberCount >= clan.maxMembers) {
                return res.status(400).json({
                    success: false,
                    error: 'Clan is at maximum capacity',
                    timestamp: new Date().toISOString()
                });
            }

            // Upsert join request to avoid unique constraint conflicts on (userId, clanId)
            // Behavior:
            // - If an ACTIVE/APPROVED membership exists we already returned above.
            // - If a PENDING request exists, reuse it and optionally update the message.
            // - If a prior REJECTED/CANCELLED exists, create a fresh PENDING request.
            let joinRequest;
            const existingAnyRequest = await prisma.clanJoinRequest.findUnique({
                where: { userId_clanId: { userId, clanId } },
                include: {
                    clan: { select: { name: true, clanHeadId: true } }
                }
            });

            if (existingAnyRequest) {
                if (existingAnyRequest.status === 'PENDING') {
                    // Reuse pending; update message if provided
                    joinRequest = await prisma.clanJoinRequest.update({
                        where: { id: existingAnyRequest.id },
                        data: { message: message ?? existingAnyRequest.message },
                        include: { clan: { select: { name: true, clanHeadId: true } } }
                    });
                } else {
                    // Any non-pending (APPROVED/REJECTED/CANCELLED/etc.) → recycle the same record back to PENDING
                    joinRequest = await prisma.clanJoinRequest.update({
                        where: { id: existingAnyRequest.id },
                        data: {
                            status: 'PENDING',
                            message: message || null,
                            reviewedAt: null,
                            reviewedBy: null,
                            reviewMessage: null,
                            createdAt: new Date()
                        },
                        include: { clan: { select: { name: true, clanHeadId: true } } }
                    });
                }
            } else {
                joinRequest = await prisma.clanJoinRequest.create({
                    data: {
                        clanId,
                        userId,
                        message: message || null,
                        status: 'PENDING',
                        createdAt: new Date()
                    },
                    include: {
                        clan: { select: { name: true, clanHeadId: true } }
                    }
                });
            }

            // Publish join request event
            try {
                await rabbitmqService.publishJoinRequest(clanId, userId, message);
            } catch (error) {
                console.error('Failed to publish join request event:', error);
                // Don't fail the request if event publishing fails
            }

            res.status(201).json({
                success: true,
                message: 'Join request submitted successfully',
                data: {
                    requestId: joinRequest.id,
                    clanName: joinRequest.clan.name,
                    status: joinRequest.status,
                    message: joinRequest.message,
                    createdAt: joinRequest.createdAt
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in requestToJoinClan:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit join request',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Delete a clan
    async deleteClan(req, res) {
        try {
            const { clanId } = req.params;
            const prisma = await databaseService.getClient();

            await prisma.clan.delete({
                where: { id: clanId }
            });

            res.json({
                success: true,
                message: 'Clan deleted successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new ClanController();
