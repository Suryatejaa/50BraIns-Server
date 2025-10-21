/**
 * Clan controller for handling clan-related HTTP requests
 */

const { ClanService } = require('../services/clan.service');
const { ClanMemberService } = require('../services/clanMember.service');

class ClanController {
    constructor() {
        this.clanService = new ClanService();
        this.memberService = new ClanMemberService();
    }

    /**
     * Get all clans with filtering and pagination
     */
    async getClans(req, res) {
        try {
            const filters = {
                category: req.query.category,
                location: req.query.location,
                visibility: req.query.visibility,
                isVerified: req.query.isVerified,
                minMembers: req.query.minMembers,
                maxMembers: req.query.maxMembers,
                sortBy: req.query.sortBy || 'reputationScore',
                order: req.query.order || 'desc',
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const clans = await this.clanService.getClans(filters);
            res.json({ success: true, data: clans });
        } catch (error) {
            console.error('Error getting clans:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get clan feed (enhanced with reputation)
     */
    async getClanFeed(req, res) {
        try {
            const filters = {
                category: req.query.category,
                location: req.query.location,
                visibility: req.query.visibility,
                isVerified: req.query.isVerified,
                minMembers: req.query.minMembers,
                maxMembers: req.query.maxMembers,
                sortBy: req.query.sortBy || 'reputationScore',
                order: req.query.order || 'desc',
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const clans = await this.clanService.getClans(filters);
            res.json({ success: true, data: clans });
        } catch (error) {
            console.error('Error getting clan feed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Create a new clan
     */
    async createClan(req, res) {
        try {
            const clanData = req.body;
            const userId = req.user?.id || req.headers['x-user-id'];

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const clan = await this.clanService.createClan(clanData, userId);
            res.status(201).json({ success: true, data: clan });
        } catch (error) {
            console.error('Error creating clan:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Get clan by ID
     */
    async getClan(req, res) {
        try {
            const { clanId } = req.params;
            const clan = await this.clanService.getClanById(clanId);
            res.json({ success: true, data: clan });
        } catch (error) {
            console.error('Error getting clan:', error);
            if (error.message === 'Clan not found') {
                res.status(404).json({ success: false, error: error.message });
            } else {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    }

    /**
     * Update clan
     */
    async updateClan(req, res) {
        try {
            const { clanId } = req.params;
            const updateData = req.body;
            const userId = req.user?.id || req.headers['x-user-id'];

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const updatedClan = await this.clanService.updateClan(clanId, updateData, userId);
            res.json({ success: true, data: updatedClan });
        } catch (error) {
            console.error('Error updating clan:', error);
            if (error.message === 'Clan not found') {
                res.status(404).json({ success: false, error: error.message });
            } else if (error.message.includes('Only clan head can update clan')) {
                res.status(403).json({ success: false, error: error.message });
            } else {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    }

    /**
     * Delete clan
     */
    async deleteClan(req, res) {
        try {
            const { clanId } = req.params;
            const userId = req.user?.id || req.headers['x-user-id'];

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.clanService.deleteClan(clanId, userId);
            res.json({ success: true, data: result.message });
        } catch (error) {
            console.error('Error deleting clan:', error);
            if (error.message === 'Clan not found') {
                res.status(404).json({ success: false, error: error.message });
            } else if (error.message.includes('Only clan head can delete clan')) {
                res.status(403).json({ success: false, error: error.message });
            } else {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    }

    /**
 * Get user's clans
 */
    async getUserClans(req, res) {
        try {
            const userId = req.user?.id || req.headers['x-user-id'];

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const memberships = await this.memberService.getUserMemberships(userId);

            if (!memberships || memberships.length === 0) {
                return res.json({ success: true, clans: [] });
            }

            const clans = memberships.map(m => m.clan);
            res.json({ success: true, data: clans });
        } catch (error) {
            console.error('Error getting user clans:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get featured clans
     */
    async getFeaturedClans(req, res) {
        try {
            const featuredClans = await this.clanService.getFeaturedClans();
            res.json({ success: true, data: featuredClans });
        } catch (error) {
            console.error('Error getting featured clans:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Update clan reputation (called by reputation service)
     */
    async updateReputation(req, res) {
        try {
            const { clanId } = req.params;
            let memberScores = req.body;

            // Handle both direct array and wrapped object formats
            if (req.body.memberScores) {
                memberScores = req.body.memberScores;
            }

            const updatedClan = await this.clanService.updateReputation(clanId, memberScores);
            res.json({ success: true, data: updatedClan });
        } catch (error) {
            console.error('Error updating reputation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get pending join requests for a clan (clan-level operation)
     */
    async getPendingRequests(req, res) {
        try {
            const { clanId } = req.params;
            const userId = req.user?.id || req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const pendingRequests = await this.memberService.getPendingRequests(clanId, userId);

            res.json({
                success: true,
                data: pendingRequests
            });
        } catch (error) {
            console.error('Error getting pending requests:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Approve a join request (clan-level operation)
     */
    async approveRequest(req, res) {
        try {
            const { clanId, userId } = req.params;
            const approvedByUserId = req.user?.id || req.headers['x-user-id'];

            if (!approvedByUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.memberService.approveRequest(clanId, userId, approvedByUserId);

            res.json({
                success: true,
                message: 'Join request approved successfully',
                data: result
            });
        } catch (error) {
            console.error('Error approving join request:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Reject a join request (clan-level operation)
     */
    async rejectRequest(req, res) {
        try {
            const { clanId, userId } = req.params;
            const rejectedByUserId = req.user?.id || req.headers['x-user-id'];

            if (!rejectedByUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.memberService.rejectRequest(clanId, userId, rejectedByUserId);

            res.json({
                success: true,
                message: 'Join request rejected successfully',
                data: result
            });
        } catch (error) {
            console.error('Error rejecting join request:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = { ClanController };
