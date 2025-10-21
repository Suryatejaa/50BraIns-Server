/**
 * Authentication middleware for clan service
 * Handles user authentication via headers
 */

const requireAuth = (req, res, next) => {
    let userId = req.headers['x-user-id'];
    
    // If no x-user-id, try to extract from Authorization header
    if (!userId && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
            // For JWT tokens, we need to decode them or use a different approach
            // For now, we'll use the x-user-id header approach
            userId = null;
        }
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized - x-user-id header required'
        });
    }

    // Set user context for downstream middleware/controllers
    req.user = { id: userId };
    next();
};

/**
 * Optional authentication middleware
 * Sets user context if available, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.headers['authorization']?.split(' ')[1];

    if (userId) {
        req.user = { id: userId };
    }

    next();
};

/**
 * Check if user is clan member
 */
const requireClanMembership = async (req, res, next) => {
    try {
        const { clanId } = req.params;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        // Import here to avoid circular dependencies
        const { ClanMemberService } = require('../services/clanMember.service');
        const memberService = new ClanMemberService();

        const member = await memberService.getMemberByUserAndClan(userId, clanId);

        if (!member) {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this clan'
            });
        }

        req.clanMember = member;
        next();
    } catch (error) {
        console.error('Error in requireClanMembership middleware:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Check if user is clan owner/admin
 */
const requireClanOwnership = async (req, res, next) => {
    try {
        const { clanId } = req.params;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        // Import here to avoid circular dependencies
        const { ClanMemberService } = require('../services/clanMember.service');
        const memberService = new ClanMemberService();

        const member = await memberService.getMemberByUserAndClan(userId, clanId);

        if (!member) {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this clan'
            });
        }

        if (!['OWNER', 'ADMIN'].includes(member.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions - Owner or Admin required'
            });
        }

        req.clanMember = member;
        next();
    } catch (error) {
        console.error('Error in requireClanOwnership middleware:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    requireAuth,
    optionalAuth,
    requireClanMembership,
    requireClanOwnership
};
