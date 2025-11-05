const adminService = require('../services/admin.service');
const { StatusCodes } = require('http-status-codes');

class AdminController {

    // ============================================================================
    // DASHBOARD OVERVIEW
    // ============================================================================

    async getDashboardOverview(req, res) {
        try {
            const overview = await adminService.getDashboardOverview();

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Dashboard overview retrieved successfully',
                data: overview,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting dashboard overview:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to retrieve dashboard overview',
                timestamp: new Date().toISOString()
            });
        }
    }

    // ============================================================================
    // GIG MANAGEMENT
    // ============================================================================

    async getAllGigs(req, res) {
        try {
            const {
                status,
                category,
                dateRange,
                sortBy = 'createdAt',
                order = 'desc',
                page = 1,
                limit = 20,
                search
            } = req.query;

            const filters = {
                status,
                category,
                dateRange,
                search
            };

            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy,
                order
            };

            const result = await adminService.getAllGigs(filters, pagination);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Gigs retrieved successfully',
                data: result.gigs,
                pagination: result.pagination,
                filters: filters,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting all gigs:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to retrieve gigs',
                timestamp: new Date().toISOString()
            });
        }
    }

    async getGigDetails(req, res) {
        try {
            const { gigId } = req.params;
            const gigDetails = await adminService.getGigDetails(gigId);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Gig details retrieved successfully',
                data: gigDetails,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting gig details:', error);
            const statusCode = error.message.includes('not found') ? StatusCodes.NOT_FOUND : StatusCodes.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to retrieve gig details',
                timestamp: new Date().toISOString()
            });
        }
    }

    async approveGig(req, res) {
        try {
            const { gigId } = req.params;
            const adminId = req.user.id;

            const result = await adminService.approveGig(gigId, adminId, req.body);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Gig approved successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error approving gig:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: error.message || 'Failed to approve gig',
                timestamp: new Date().toISOString()
            });
        }
    }

    async rejectGig(req, res) {
        try {
            const { gigId } = req.params;
            const adminId = req.user.id;
            const { reason, feedback } = req.body;

            const result = await adminService.rejectGig(gigId, adminId, { reason, feedback });

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Gig rejected successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error rejecting gig:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: error.message || 'Failed to reject gig',
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateGigStatus(req, res) {
        try {
            const { gigId } = req.params;
            const adminId = req.user.id;
            const { status, reason } = req.body;

            const result = await adminService.updateGigStatus(gigId, adminId, { status, reason });

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Gig status updated successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating gig status:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: error.message || 'Failed to update gig status',
                timestamp: new Date().toISOString()
            });
        }
    }

    async toggleGigFeature(req, res) {
        try {
            const { gigId } = req.params;
            const adminId = req.user.id;
            const { featured, featuredUntil } = req.body;

            const result = await adminService.toggleGigFeature(gigId, adminId, { featured, featuredUntil });

            res.status(StatusCodes.OK).json({
                success: true,
                message: `Gig ${featured ? 'featured' : 'unfeatured'} successfully`,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error toggling gig feature:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: error.message || 'Failed to toggle gig feature',
                timestamp: new Date().toISOString()
            });
        }
    }

    // ============================================================================
    // APPLICATION MANAGEMENT
    // ============================================================================

    async getAllApplications(req, res) {
        try {
            const {
                status,
                gigId,
                applicantId,
                dateRange,
                sortBy = 'createdAt',
                order = 'desc',
                page = 1,
                limit = 20
            } = req.query;

            const filters = {
                status,
                gigId,
                applicantId,
                dateRange
            };

            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy,
                order
            };

            const result = await adminService.getAllApplications(filters, pagination);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Applications retrieved successfully',
                data: result.applications,
                pagination: result.pagination,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting all applications:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to retrieve applications',
                timestamp: new Date().toISOString()
            });
        }
    }

    async getApplicationDetails(req, res) {
        try {
            const { applicationId } = req.params;
            const applicationDetails = await adminService.getApplicationDetails(applicationId);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Application details retrieved successfully',
                data: applicationDetails,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting application details:', error);
            const statusCode = error.message.includes('not found') ? StatusCodes.NOT_FOUND : StatusCodes.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to retrieve application details',
                timestamp: new Date().toISOString()
            });
        }
    }

    async overrideApplicationDecision(req, res) {
        try {
            const { applicationId } = req.params;
            const adminId = req.user.id;
            const { decision, reason } = req.body;

            const result = await adminService.overrideApplicationDecision(applicationId, adminId, { decision, reason });

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Application decision overridden successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error overriding application decision:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: error.message || 'Failed to override application decision',
                timestamp: new Date().toISOString()
            });
        }
    }

    // ============================================================================
    // FINANCIAL MANAGEMENT
    // ============================================================================

    async getFinancialOverview(req, res) {
        try {
            const overview = await adminService.getFinancialOverview();

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Financial overview retrieved successfully',
                data: overview,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting financial overview:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to retrieve financial overview',
                timestamp: new Date().toISOString()
            });
        }
    }

    async getAllTransactions(req, res) {
        try {
            const {
                type,
                status,
                dateRange,
                userId,
                gigId,
                page = 1,
                limit = 20
            } = req.query;

            const filters = {
                type,
                status,
                dateRange,
                userId,
                gigId
            };

            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const result = await adminService.getAllTransactions(filters, pagination);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Transactions retrieved successfully',
                data: result.transactions,
                pagination: result.pagination,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting all transactions:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to retrieve transactions',
                timestamp: new Date().toISOString()
            });
        }
    }

    async getRevenueAnalytics(req, res) {
        try {
            const { period = 'monthly', startDate, endDate } = req.query;

            const analytics = await adminService.getRevenueAnalytics({ period, startDate, endDate });

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Revenue analytics retrieved successfully',
                data: analytics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting revenue analytics:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to retrieve revenue analytics',
                timestamp: new Date().toISOString()
            });
        }
    }

    async processPayment(req, res) {
        try {
            const { paymentId } = req.params;
            const adminId = req.user.id;
            const { action, reason } = req.body;

            const result = await adminService.processPayment(paymentId, adminId, { action, reason });

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Payment processed successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error processing payment:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: error.message || 'Failed to process payment',
                timestamp: new Date().toISOString()
            });
        }
    }

    async processRefund(req, res) {
        try {
            const adminId = req.user.id;
            const { gigId, amount, reason, refundToInfluencer } = req.body;

            const result = await adminService.processRefund(adminId, { gigId, amount, reason, refundToInfluencer });

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Refund processed successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error processing refund:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: error.message || 'Failed to process refund',
                timestamp: new Date().toISOString()
            });
        }
    }

    // ============================================================================
    // PLACEHOLDER METHODS (TO BE IMPLEMENTED)
    // ============================================================================

    // Dispute Management
    async getAllDisputes(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Dispute management not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getDisputeDetails(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Dispute management not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async resolveDispute(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Dispute management not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async assignDispute(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Dispute management not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    // User Management
    async getAllBrands(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Brand management not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getAllInfluencers(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Influencer management not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getUserGigHistory(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'User gig history not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async verifyUser(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'User verification not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async suspendUser(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'User suspension not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    // Analytics and Reporting
    async getPlatformStats(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Platform statistics not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getPerformanceMetrics(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Performance metrics not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getTrends(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Trends analysis not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async generateReport(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Report generation not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async downloadReport(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Report download not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    // System Management
    async getSystemHealth(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'System health monitoring not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getSystemLogs(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'System logs not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async clearCache(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Cache management not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getDatabaseStats(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Database statistics not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    // Bulk Operations
    async bulkGigAction(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Bulk gig operations not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async bulkApplicationAction(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Bulk application operations not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async bulkExport(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Bulk export not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    // Configuration Management
    async getPlatformSettings(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Platform settings not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async updatePlatformSettings(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Platform settings update not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async getCommissionRates(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Commission rates not yet implemented',
            timestamp: new Date().toISOString()
        });
    }

    async updateCommissionRates(req, res) {
        res.status(StatusCodes.NOT_IMPLEMENTED).json({
            success: false,
            error: 'Commission rates update not yet implemented',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new AdminController();