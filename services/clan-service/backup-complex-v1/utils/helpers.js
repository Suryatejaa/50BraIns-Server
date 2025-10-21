/**
 * Utility functions for the Clan Service
 */

const slugify = require('slugify');
const { prisma } = require('../config/database');

// Generate unique slug for clan
async function generateUniqueSlug(name, clanId = null) {
    let baseSlug = slugify(name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
    });

    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existingClan = await prisma.clan.findUnique({
            where: { slug },
            select: { id: true }
        });

        // If no existing clan or it's the same clan being updated
        if (!existingClan || (clanId && existingClan.id === clanId)) {
            break;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
}

// Calculate clan reputation score
function calculateReputationScore(data) {
    const {
        totalGigs = 0,
        completedGigs = 0,
        averageRating = 0,
        memberCount = 1,
        isVerified = false,
        accountAge = 0 // in months
    } = data;

    let score = 0;

    // Base score from completed gigs (max 300 points)
    score += Math.min(completedGigs * 10, 300);

    // Completion rate bonus (max 100 points)
    if (totalGigs > 0) {
        const completionRate = completedGigs / totalGigs;
        score += completionRate * 100;
    }

    // Rating bonus (max 200 points)
    score += averageRating * 40;

    // Team size bonus (max 50 points)
    score += Math.min(memberCount * 5, 50);

    // Verification bonus (100 points)
    if (isVerified) {
        score += 100;
    }

    // Account age bonus (max 50 points)
    score += Math.min(accountAge * 2, 50);

    return Math.round(score);
}

// Format clan data for public view
function formatClanForPublic(clan) {
    const {
        id,
        name,
        slug,
        description,
        tagline,
        visibility,
        isVerified,
        primaryCategory,
        categories,
        skills,
        location,
        timezone,
        website,
        instagramHandle,
        twitterHandle,
        linkedinHandle,
        portfolioImages,
        totalGigs,
        completedGigs,
        averageRating,
        reputationScore,
        createdAt,
        updatedAt,
        ...privateFields
    } = clan;

    return {
        id,
        name,
        slug,
        description,
        tagline,
        visibility,
        isVerified,
        primaryCategory,
        categories,
        skills,
        location,
        timezone,
        website,
        instagramHandle,
        twitterHandle,
        linkedinHandle,
        portfolioImages: portfolioImages?.slice(0, 3) || [], // Limit to 3 images
        totalGigs,
        completedGigs,
        averageRating,
        reputationScore,
        createdAt,
        updatedAt
    };
}

// Check if user can view clan
async function canViewClan(clanId, userId = null) {
    const clan = await prisma.clan.findUnique({
        where: { id: clanId },
        select: {
            visibility: true,
            clanHeadId: true,
            isActive: true
        }
    });

    if (!clan || !clan.isActive) {
        return false;
    }

    // Public clans can be viewed by anyone
    if (clan.visibility === 'PUBLIC') {
        return true;
    }

    // Private clans require authentication
    if (!userId) {
        return false;
    }

    // Clan head can always view
    if (clan.clanHeadId === userId) {
        return true;
    }

    // Check if user is a member
    const membership = await prisma.clanMember.findUnique({
        where: {
            userId_clanId: {
                userId,
                clanId
            }
        },
        select: { status: true }
    });

    return membership && membership.status === 'ACTIVE';
}

// Get user's role in clan
async function getUserClanRole(clanId, userId) {
    if (!userId) {
        return null;
    }

    // Check if clan head
    const clan = await prisma.clan.findUnique({
        where: { id: clanId },
        select: { clanHeadId: true }
    });

    if (clan?.clanHeadId === userId) {
        return 'HEAD';
    }

    // Check membership
    const membership = await prisma.clanMember.findUnique({
        where: {
            userId_clanId: {
                userId,
                clanId
            }
        },
        select: { role: true, status: true }
    });

    return membership?.status === 'ACTIVE' ? membership.role : null;
}

// Validate social media handles
function validateSocialHandles(data) {
    const errors = [];

    if (data.instagramHandle && !/^[a-zA-Z0-9._]+$/.test(data.instagramHandle)) {
        errors.push('Invalid Instagram handle format');
    }

    if (data.twitterHandle && !/^[a-zA-Z0-9_]+$/.test(data.twitterHandle)) {
        errors.push('Invalid Twitter handle format');
    }

    if (data.website && !/^https?:\/\/.+/.test(data.website)) {
        errors.push('Website must include http:// or https://');
    }

    return errors;
}

// Get clan member hierarchy
function getMemberHierarchy() {
    return {
        'HEAD': 6,
        'CO_HEAD': 5,
        'ADMIN': 4,
        'SENIOR_MEMBER': 3,
        'MEMBER': 2,
        'TRAINEE': 1
    };
}

// Check if user can modify another user's role
function canModifyMemberRole(userRole, targetRole) {
    const hierarchy = getMemberHierarchy();
    return hierarchy[userRole] > hierarchy[targetRole];
}

// Generate pagination metadata
function generatePagination(page, limit, total) {
    const pages = Math.ceil(total / limit);

    return {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
        nextPage: page < pages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
    };
}

// Format error response
function formatErrorResponse(message, details = null, code = null) {
    return {
        success: false,
        error: {
            message,
            code,
            details,
            timestamp: new Date().toISOString()
        }
    };
}

// Format success response
function formatSuccessResponse(data, message = null, meta = null) {
    const response = {
        success: true,
        data
    };

    if (message) {
        response.message = message;
    }

    if (meta) {
        response.meta = meta;
    }

    return response;
}

module.exports = {
    generateUniqueSlug,
    calculateReputationScore,
    formatClanForPublic,
    canViewClan,
    getUserClanRole,
    validateSocialHandles,
    getMemberHierarchy,
    canModifyMemberRole,
    generatePagination,
    formatErrorResponse,
    formatSuccessResponse
};
