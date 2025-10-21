const { ClanMemberService } = require('../services/clanMember.service');

class ClanMemberController {
    constructor() {
        this.clanMemberService = new ClanMemberService();
    }

    /**
     * Get clan members
     */
    async getClanMembers(req, res) {
        try {
            const { clanId } = req.params;
            const members = await this.clanMemberService.getClanMembers(clanId);
            
            res.json({
                success: true,
                members
            });
        } catch (error) {
            console.error('Error getting clan members:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Join a clan
     */
    async joinClan(req, res) {
        try {
            const { clanId } = req.params;
            const userId = req.user?.id || req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.clanMemberService.joinClan(clanId, userId);
            
            res.json({
                success: true,
                message: 'Successfully joined clan',
                member: result
            });
        } catch (error) {
            console.error('Error joining clan:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Leave a clan
     */
    async leaveClan(req, res) {
        try {
            const { clanId } = req.params;
            const userId = req.user?.id || req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.clanMemberService.leaveClan(clanId, userId);
            
            res.json({
                success: true,
                message: 'Successfully left clan',
                member: result
            });
        } catch (error) {
            console.error('Error leaving clan:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update member role
     */
    async updateMemberRole(req, res) {
        try {
            const { clanId, userId } = req.params;
            const { role } = req.body;
            const updatedByUserId = req.user?.id || req.headers['x-user-id'];
            
            if (!updatedByUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            if (!role || !['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid role is required (OWNER, ADMIN, MEMBER)'
                });
            }

            const result = await this.clanMemberService.updateMemberRole(clanId, userId, role, updatedByUserId);
            
            res.json({
                success: true,
                message: 'Member role updated successfully',
                member: result
            });
        } catch (error) {
            console.error('Error updating member role:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Remove member from clan
     */
    async removeMember(req, res) {
        try {
            const { clanId, userId } = req.params;
            const removedByUserId = req.user?.id || req.headers['x-user-id'];
            
            if (!removedByUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.clanMemberService.removeMember(clanId, userId, removedByUserId);
            
            res.json({
                success: true,
                message: 'Member removed successfully',
                result
            });
        } catch (error) {
            console.error('Error removing member:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Add admin to clan
     */
    async addAdmin(req, res) {
        try {
            const { clanId, userId } = req.params;
            const addedByUserId = req.user?.id || req.headers['x-user-id'];
            
            if (!addedByUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.clanMemberService.addAdmin(clanId, userId, addedByUserId);
            
            res.json({
                success: true,
                message: 'Admin added successfully',
                result
            });
        } catch (error) {
            console.error('Error adding admin:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Remove admin from clan
     */
    async removeAdmin(req, res) {
        try {
            const { clanId, userId } = req.params;
            const removedByUserId = req.user?.id || req.headers['x-user-id'];
            
            if (!removedByUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.clanMemberService.removeAdmin(clanId, userId, removedByUserId);
            
            res.json({
                success: true,
                message: 'Admin removed successfully',
                result
            });
        } catch (error) {
            console.error('Error removing admin:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Transfer clan ownership
     */
    async transferOwnership(req, res) {
        try {
            const { clanId } = req.params;
            const { newOwnerId } = req.body;
            const transferredByUserId = req.user?.id || req.headers['x-user-id'];
            
            if (!transferredByUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            if (!newOwnerId) {
                return res.status(400).json({
                    success: false,
                    error: 'New owner ID is required'
                });
            }

            const result = await this.clanMemberService.transferOwnership(clanId, newOwnerId, transferredByUserId);
            
            res.json({
                success: true,
                message: 'Ownership transferred successfully',
                result
            });
        } catch (error) {
            console.error('Error transferring ownership:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Request to join a clan
     */
    async requestJoin(req, res) {
        try {
            const { clanId } = req.params;
            const userId = req.user?.id || req.headers['x-user-id'];
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const result = await this.clanMemberService.requestJoin(clanId, userId);
            
            res.json({
                success: true,
                message: 'Join request sent successfully',
                result
            });
        } catch (error) {
            console.error('Error requesting to join clan:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Approve a join request
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

            const result = await this.clanMemberService.approveRequest(clanId, userId, approvedByUserId);
            
            res.json({
                success: true,
                message: 'Join request approved successfully',
                result
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
     * Reject a join request
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

            const result = await this.clanMemberService.rejectRequest(clanId, userId, rejectedByUserId);
            
            res.json({
                success: true,
                message: 'Join request rejected successfully',
                result
            });
        } catch (error) {
            console.error('Error rejecting join request:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get pending join requests
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

            const pendingRequests = await this.clanMemberService.getPendingRequests(clanId, userId);
            
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
}

module.exports = { ClanMemberController };
