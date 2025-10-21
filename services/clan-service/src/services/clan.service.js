/**
 * Clan service for handling clan business logic
 */

const { getDatabaseService } = require('./database.service');

class ClanService {
    constructor() {
        this.db = getDatabaseService();
    }

    /**
     * Get all clans with filtering and pagination
     */
    async getClans(filters = {}) {
        const prisma = this.db.getClient();

        const {
            category,
            location,
            visibility,
            isVerified,
            minMembers,
            maxMembers,
            sortBy = 'reputationScore',
            order = 'desc',
            page = 1,
            limit = 20
        } = filters;

        // Build where clause
        const where = { isActive: true };
        if (category && category.trim() !== '') where.primaryCategory = category.trim();
        if (location && location.trim() !== '') where.location = location.trim();
        if (visibility) where.visibility = visibility;
        if (isVerified !== undefined) where.isVerified = isVerified === 'true';
        if (minMembers) where.memberCount = { gte: parseInt(minMembers) };
        if (maxMembers) where.memberCount = { ...where.memberCount, lte: parseInt(maxMembers) };

        // Build order clause - handle 'score' as alias for 'reputationScore'
        const orderBy = {};
        const normalizedSortBy = sortBy === 'score' ? 'reputationScore' : sortBy;

        if (normalizedSortBy === 'reputationScore') orderBy.reputationScore = order;
        else if (normalizedSortBy === 'name') orderBy.name = order;
        else if (normalizedSortBy === 'createdAt') orderBy.createdAt = order;
        else if (normalizedSortBy === 'memberCount') orderBy.memberCount = order;
        else if (normalizedSortBy === 'rank') orderBy.reputationScore = order; // Rank is based on reputation score
        else if (normalizedSortBy === 'totalGigs') orderBy.reputationScore = order; // For now, sort by reputation (will be updated when gig integration is added)
        else if (normalizedSortBy === 'averageRating') orderBy.reputationScore = order; // For now, sort by reputation (will be updated when rating system is added)
        else orderBy.reputationScore = 'desc'; // Default fallback

        const clans = await prisma.clan.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                tagline: true,
                visibility: true,
                isVerified: true,
                isActive: true,
                primaryCategory: true,
                categories: true,
                skills: true,
                location: true,
                timezone: true,
                headId: true,
                admins: true,
                memberIds: true,
                pendingRequests: true,
                memberCount: true,
                maxMembers: true,
                reputationScore: true,
                portfolioImages: true,
                portfolioVideos: true,
                showcaseProjects: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        members: true
                    }
                }
            },
            orderBy,
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        // Transform to match frontend types
        return clans.map(clan => ({
            ...clan,
            stats: {
                totalMembers: clan.memberCount || clan._count?.members || 0,
                totalGigs: 0, // Will be updated when gig integration is added
                averageRating: 0, // Will be updated when rating system is added
                reputationScore: clan.reputationScore || 0
            }
        }));
    }

    /**
     * Get clan by ID
     */
    async getClanById(clanId) {
        const prisma = this.db.getClient();

        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            select: {
                id: true,
                name: true,
                description: true,
                tagline: true,
                visibility: true,
                isVerified: true,
                isActive: true,
                email: true,
                website: true,
                instagramHandle: true,
                twitterHandle: true,
                linkedinHandle: true,
                requiresApproval: true,
                isPaidMembership: true,
                membershipFee: true,
                headId: true,
                admins: true,
                memberIds: true,
                pendingRequests: true,
                maxMembers: true,
                primaryCategory: true,
                categories: true,
                skills: true,
                location: true,
                timezone: true,
                memberCount: true,
                reputationScore: true,
                portfolioImages: true,
                portfolioVideos: true,
                showcaseProjects: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        members: true
                    }
                },
                members: {
                    select: {
                        id: true,
                        clanId: true,
                        userId: true,
                        role: true,
                        joinedAt: true
                    }
                }
            }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        // Transform to match frontend types
        return {
            ...clan,
            headId: clan.headId || clan.members?.find(m => m.role === 'OWNER')?.userId || null,
            admins: clan.admins || [],
            stats: {
                totalMembers: clan.memberCount || 0,
                totalGigs: 0,
                averageRating: 0,
                reputationScore: clan.reputationScore || 0
            }
        };
    }

    /**
     * Create a new clan
     */
    async createClan(clanData, userId) {
        const prisma = this.db.getClient();

        const {
            name,
            description,
            tagline,
            visibility = 'PUBLIC',
            isVerified = false,
            isActive = true,
            email,
            website,
            instagramHandle,
            twitterHandle,
            linkedinHandle,
            requiresApproval = true,
            isPaidMembership = false,
            membershipFee,
            maxMembers = 50,
            primaryCategory = 'General',
            categories = [],
            skills = [],
            location,
            timezone,
            portfolioImages = [],
            portfolioVideos = [],
            showcaseProjects = []
        } = clanData;

        if (!name || !description) {
            throw new Error('Name and description are required');
        }

        // Use transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            const clan = await tx.clan.create({
                data: {
                    name,
                    description,
                    tagline,
                    visibility,
                    isVerified,
                    isActive,
                    email,
                    website,
                    instagramHandle,
                    twitterHandle,
                    linkedinHandle,
                    requiresApproval,
                    isPaidMembership,
                    membershipFee: membershipFee ? parseFloat(membershipFee) : null,
                    maxMembers: parseInt(maxMembers),
                    primaryCategory,
                    categories,
                    skills,
                    location,
                    timezone,
                    portfolioImages,
                    portfolioVideos,
                    showcaseProjects,
                    headId: userId,
                    admins: [userId], // Creator becomes first admin
                    memberIds: [userId], // Creator becomes first member
                    memberCount: 1,
                    reputationScore: 0
                }
            });

            // Add creator as first member
            await tx.clanMember.create({
                data: {
                    userId,
                    clanId: clan.id,
                    role: 'OWNER',
                    status: 'ACTIVE'
                }
            });

            return clan;
        });

        return result;
    }

    /**
     * Update clan
     */
    async updateClan(clanId, updateData, userId) {
        const prisma = this.db.getClient();

        // Check if user is clan head
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        const isClanHead = clan.members?.some(m => m.userId === userId && m.role === 'OWNER');
        if (!isClanHead) {
            throw new Error('Only clan head can update clan');
        }

        return await prisma.clan.update({
            where: { id: clanId },
            data: updateData
        });
    }

    /**
     * Delete clan
     */
    async deleteClan(clanId, userId) {
        const prisma = this.db.getClient();

        // Check if user is clan head
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        const isClanHead = clan.members?.some(m => m.userId === userId && m.role === 'OWNER');
        if (!isClanHead) {
            throw new Error('Only clan head can delete clan');
        }

        await prisma.clan.delete({
            where: { id: clanId }
        });

        return { message: 'Clan deleted successfully' };
    }

    /**
     * Get featured clans
     */
    async getFeaturedClans() {
        const prisma = this.db.getClient();

        return await prisma.clan.findMany({
            where: {
                isActive: true,
                isVerified: true,
                reputationScore: { gte: 50 }
            },
            select: {
                id: true,
                name: true,
                description: true,
                primaryCategory: true,
                memberCount: true,
                reputationScore: true,
                createdAt: true
            },
            orderBy: { reputationScore: 'desc' },
            take: 10
        });
    }

    /**
     * Update clan reputation
     */
    async updateReputation(clanId, memberScores) {
        const prisma = this.db.getClient();

        // Validate input
        if (!memberScores || !Array.isArray(memberScores)) {
            throw new Error('Member scores array is required');
        }

        if (memberScores.length === 0) {
            // If no scores, set reputation to 0
            return await prisma.clan.update({
                where: { id: clanId },
                data: { reputationScore: 0 }
            });
        }

        // Calculate average score
        const totalScore = memberScores.reduce((sum, member) => {
            if (member && typeof member.score === 'number') {
                return sum + member.score;
            }
            return sum;
        }, 0);

        const averageScore = totalScore / memberScores.length;

        return await prisma.clan.update({
            where: { id: clanId },
            data: { reputationScore: Math.round(averageScore) }
        });
    }
}

module.exports = { ClanService };
