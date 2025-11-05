const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AdminService {

    // ============================================================================
    // DASHBOARD OVERVIEW
    // ============================================================================

    async getDashboardOverview() {
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Get basic counts
            const [
                totalGigs,
                activeGigs,
                totalApplications,
                pendingApplications,
                todayGigs,
                weekGigs,
                monthGigs,
                totalRevenue
            ] = await Promise.all([
                prisma.gig.count(),
                prisma.gig.count({ where: { status: 'ACTIVE' } }),
                prisma.application.count(),
                prisma.application.count({ where: { status: 'PENDING' } }),
                prisma.gig.count({ where: { createdAt: { gte: startOfDay } } }),
                prisma.gig.count({ where: { createdAt: { gte: startOfWeek } } }),
                prisma.gig.count({ where: { createdAt: { gte: startOfMonth } } }),
                this.calculateTotalRevenue()
            ]);

            // Get status distribution
            const gigStatusDistribution = await prisma.gig.groupBy({
                by: ['status'],
                _count: { status: true }
            });

            const applicationStatusDistribution = await prisma.application.groupBy({
                by: ['status'],
                _count: { status: true }
            });

            // Get category distribution
            const categoryDistribution = await prisma.gig.groupBy({
                by: ['category'],
                _count: { category: true },
                orderBy: { _count: { category: 'desc' } },
                take: 10
            });

            // Get recent activity
            const recentGigs = await prisma.gig.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    budget: true,
                    createdAt: true,
                    brand: {
                        select: {
                            email: true,
                            username: true
                        }
                    }
                }
            });

            const recentApplications = await prisma.application.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    gig: {
                        select: {
                            title: true
                        }
                    },
                    influencer: {
                        select: {
                            email: true,
                            username: true
                        }
                    }
                }
            });

            return {
                stats: {
                    totalGigs,
                    activeGigs,
                    totalApplications,
                    pendingApplications,
                    totalRevenue
                },
                growth: {
                    todayGigs,
                    weekGigs,
                    monthGigs
                },
                distributions: {
                    gigStatus: gigStatusDistribution,
                    applicationStatus: applicationStatusDistribution,
                    categories: categoryDistribution
                },
                recentActivity: {
                    recentGigs,
                    recentApplications
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting dashboard overview:', error);
            throw new Error('Failed to retrieve dashboard overview');
        }
    }

    async calculateTotalRevenue() {
        try {
            // This would depend on your payment/transaction model
            // Placeholder calculation - adjust based on your schema
            const completedGigs = await prisma.gig.findMany({
                where: { status: 'COMPLETED' },
                select: { budget: true }
            });

            const total = completedGigs.reduce((sum, gig) => {
                const budget = parseFloat(gig.budget || 0);
                return sum + (budget * 0.1); // Assuming 10% platform fee
            }, 0);

            return total;
        } catch (error) {
            console.error('Error calculating total revenue:', error);
            return 0;
        }
    }

    // ============================================================================
    // GIG MANAGEMENT
    // ============================================================================

    async getAllGigs(filters, pagination) {
        try {
            const { status, category, dateRange, search } = filters;
            const { page, limit, sortBy, order } = pagination;

            // Build where clause
            const where = {};

            if (status) where.status = status;
            if (category) where.category = category;
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { brand: { email: { contains: search, mode: 'insensitive' } } }
                ];
            }
            if (dateRange) {
                // Parse dateRange if provided (e.g., "2024-01-01,2024-12-31")
                const [startDate, endDate] = dateRange.split(',');
                if (startDate && endDate) {
                    where.createdAt = {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    };
                }
            }

            // Get total count
            const totalCount = await prisma.gig.count({ where });

            // Get gigs with pagination
            const gigs = await prisma.gig.findMany({
                where,
                include: {
                    brand: {
                        select: {
                            id: true,
                            email: true,
                            username: true
                        }
                    },
                    _count: {
                        select: {
                            applications: true
                        }
                    }
                },
                orderBy: { [sortBy]: order },
                skip: (page - 1) * limit,
                take: limit
            });

            return {
                gigs,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPreviousPage: page > 1
                }
            };
        } catch (error) {
            console.error('Error getting all gigs:', error);
            throw new Error('Failed to retrieve gigs');
        }
    }

    async getGigDetails(gigId) {
        try {
            const gig = await prisma.gig.findUnique({
                where: { id: gigId },
                include: {
                    brand: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            createdAt: true
                        }
                    },
                    applications: {
                        include: {
                            influencer: {
                                select: {
                                    id: true,
                                    email: true,
                                    username: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    submissions: {
                        include: {
                            submittedBy: {
                                select: {
                                    id: true,
                                    email: true,
                                    username: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!gig) {
                throw new Error('Gig not found');
            }

            // Add additional metrics
            const metrics = {
                totalApplications: gig.applications.length,
                approvedApplications: gig.applications.filter(app => app.status === 'APPROVED').length,
                pendingApplications: gig.applications.filter(app => app.status === 'PENDING').length,
                totalSubmissions: gig.submissions.length,
                approvedSubmissions: gig.submissions.filter(sub => sub.status === 'APPROVED').length
            };

            return {
                ...gig,
                metrics
            };
        } catch (error) {
            console.error('Error getting gig details:', error);
            throw error;
        }
    }

    async approveGig(gigId, adminId, data = {}) {
        try {
            const gig = await prisma.gig.findUnique({
                where: { id: gigId }
            });

            if (!gig) {
                throw new Error('Gig not found');
            }

            const updatedGig = await prisma.gig.update({
                where: { id: gigId },
                data: {
                    status: 'ACTIVE',
                    approvedAt: new Date(),
                    approvedBy: adminId
                }
            });

            // Log admin action
            await this.logAdminAction(adminId, 'APPROVE_GIG', gigId, `Approved gig: ${gig.title}`);

            console.info(`Admin ${adminId} approved gig ${gigId}`);
            return updatedGig;
        } catch (error) {
            console.error('Error approving gig:', error);
            throw error;
        }
    }

    async rejectGig(gigId, adminId, { reason, feedback }) {
        try {
            const gig = await prisma.gig.findUnique({
                where: { id: gigId }
            });

            if (!gig) {
                throw new Error('Gig not found');
            }

            const updatedGig = await prisma.gig.update({
                where: { id: gigId },
                data: {
                    status: 'REJECTED',
                    rejectedAt: new Date(),
                    rejectedBy: adminId,
                    rejectionReason: reason,
                    rejectionFeedback: feedback
                }
            });

            // Log admin action
            await this.logAdminAction(adminId, 'REJECT_GIG', gigId, `Rejected gig: ${gig.title}. Reason: ${reason}`);

            console.info(`Admin ${adminId} rejected gig ${gigId}`);
            return updatedGig;
        } catch (error) {
            console.error('Error rejecting gig:', error);
            throw error;
        }
    }

    async updateGigStatus(gigId, adminId, { status, reason }) {
        try {
            const gig = await prisma.gig.findUnique({
                where: { id: gigId }
            });

            if (!gig) {
                throw new Error('Gig not found');
            }

            const updatedGig = await prisma.gig.update({
                where: { id: gigId },
                data: {
                    status,
                    updatedAt: new Date()
                }
            });

            // Log admin action
            await this.logAdminAction(adminId, 'UPDATE_GIG_STATUS', gigId,
                `Changed gig status from ${gig.status} to ${status}. ${reason ? `Reason: ${reason}` : ''}`);

            console.info(`Admin ${adminId} updated gig ${gigId} status to ${status}`);
            return updatedGig;
        } catch (error) {
            console.error('Error updating gig status:', error);
            throw error;
        }
    }

    async toggleGigFeature(gigId, adminId, { featured, featuredUntil }) {
        try {
            const gig = await prisma.gig.findUnique({
                where: { id: gigId }
            });

            if (!gig) {
                throw new Error('Gig not found');
            }

            const updateData = {
                featured,
                updatedAt: new Date()
            };

            if (featured && featuredUntil) {
                updateData.featuredUntil = new Date(featuredUntil);
            }

            const updatedGig = await prisma.gig.update({
                where: { id: gigId },
                data: updateData
            });

            // Log admin action
            await this.logAdminAction(adminId, 'TOGGLE_GIG_FEATURE', gigId,
                `${featured ? 'Featured' : 'Unfeatured'} gig: ${gig.title}`);

            console.info(`Admin ${adminId} ${featured ? 'featured' : 'unfeatured'} gig ${gigId}`);
            return updatedGig;
        } catch (error) {
            console.error('Error toggling gig feature:', error);
            throw error;
        }
    }

    // ============================================================================
    // APPLICATION MANAGEMENT
    // ============================================================================

    async getAllApplications(filters, pagination) {
        try {
            const { status, gigId, applicantId, dateRange } = filters;
            const { page, limit, sortBy, order } = pagination;

            // Build where clause
            const where = {};

            if (status) where.status = status;
            if (gigId) where.gigId = gigId;
            if (applicantId) where.influencerId = applicantId;
            if (dateRange) {
                const [startDate, endDate] = dateRange.split(',');
                if (startDate && endDate) {
                    where.createdAt = {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    };
                }
            }

            // Get total count
            const totalCount = await prisma.application.count({ where });

            // Get applications with pagination
            const applications = await prisma.application.findMany({
                where,
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            budget: true,
                            status: true
                        }
                    },
                    influencer: {
                        select: {
                            id: true,
                            email: true,
                            username: true
                        }
                    }
                },
                orderBy: { [sortBy]: order },
                skip: (page - 1) * limit,
                take: limit
            });

            return {
                applications,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPreviousPage: page > 1
                }
            };
        } catch (error) {
            console.error('Error getting all applications:', error);
            throw new Error('Failed to retrieve applications');
        }
    }

    async getApplicationDetails(applicationId) {
        try {
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    gig: {
                        include: {
                            brand: {
                                select: {
                                    id: true,
                                    email: true,
                                    username: true
                                }
                            }
                        }
                    },
                    influencer: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            createdAt: true
                        }
                    }
                }
            });

            if (!application) {
                throw new Error('Application not found');
            }

            return application;
        } catch (error) {
            console.error('Error getting application details:', error);
            throw error;
        }
    }

    async overrideApplicationDecision(applicationId, adminId, { decision, reason }) {
        try {
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    gig: { select: { title: true } },
                    influencer: { select: { email: true } }
                }
            });

            if (!application) {
                throw new Error('Application not found');
            }

            const updatedApplication = await prisma.application.update({
                where: { id: applicationId },
                data: {
                    status: decision,
                    adminOverride: true,
                    adminOverrideBy: adminId,
                    adminOverrideReason: reason,
                    adminOverrideAt: new Date()
                }
            });

            // Log admin action
            await this.logAdminAction(adminId, 'OVERRIDE_APPLICATION', applicationId,
                `Overrode application decision to ${decision}. Reason: ${reason}`);

            console.info(`Admin ${adminId} overrode application ${applicationId} decision to ${decision}`);
            return updatedApplication;
        } catch (error) {
            console.error('Error overriding application decision:', error);
            throw error;
        }
    }

    // ============================================================================
    // FINANCIAL MANAGEMENT
    // ============================================================================

    async getFinancialOverview() {
        try {
            // This is a basic implementation - adjust based on your payment schema
            const overview = {
                totalRevenue: await this.calculateTotalRevenue(),
                pendingPayments: 0, // Implement based on payment schema
                processedPayments: 0, // Implement based on payment schema
                refundsProcessed: 0, // Implement based on refund schema
                platformFees: 0, // Implement based on fee calculation
                timestamp: new Date().toISOString()
            };

            return overview;
        } catch (error) {
            console.error('Error getting financial overview:', error);
            throw new Error('Failed to retrieve financial overview');
        }
    }

    async getAllTransactions(filters, pagination) {
        try {
            // Placeholder implementation - implement based on your transaction schema
            return {
                transactions: [],
                pagination: {
                    currentPage: pagination.page,
                    totalPages: 0,
                    totalCount: 0,
                    hasNextPage: false,
                    hasPreviousPage: false
                }
            };
        } catch (error) {
            console.error('Error getting all transactions:', error);
            throw new Error('Failed to retrieve transactions');
        }
    }

    async getRevenueAnalytics({ period, startDate, endDate }) {
        try {
            // Placeholder implementation - implement based on your analytics needs
            return {
                period,
                revenue: [],
                growth: 0,
                comparison: {},
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting revenue analytics:', error);
            throw new Error('Failed to retrieve revenue analytics');
        }
    }

    async processPayment(paymentId, adminId, { action, reason }) {
        try {
            // Placeholder implementation - implement based on your payment processing
            await this.logAdminAction(adminId, 'PROCESS_PAYMENT', paymentId,
                `Payment ${action}. ${reason ? `Reason: ${reason}` : ''}`);

            return { success: true, action, reason };
        } catch (error) {
            console.error('Error processing payment:', error);
            throw new Error('Failed to process payment');
        }
    }

    async processRefund(adminId, { gigId, amount, reason, refundToInfluencer }) {
        try {
            // Placeholder implementation - implement based on your refund processing
            await this.logAdminAction(adminId, 'PROCESS_REFUND', gigId,
                `Processed refund of ${amount}. Reason: ${reason}`);

            return { success: true, amount, reason, refundToInfluencer };
        } catch (error) {
            console.error('Error processing refund:', error);
            throw new Error('Failed to process refund');
        }
    }

    // ============================================================================
    // ADMIN ACTION LOGGING
    // ============================================================================

    async logAdminAction(adminId, action, targetId = null, details = null) {
        try {
            // This assumes you have an adminLogs table - adjust based on your schema
            const logEntry = {
                adminId,
                action,
                targetId,
                details,
                timestamp: new Date(),
                ip: null, // Could be passed from request if needed
                userAgent: null // Could be passed from request if needed
            };

            // If you have an adminLogs table:
            // await prisma.adminLog.create({ data: logEntry });

            // For now, just log to console/file
            console.info('Admin Action:', logEntry);

            return logEntry;
        } catch (error) {
            console.error('Error logging admin action:', error);
            // Don't throw here to avoid breaking main operations
        }
    }
}

module.exports = new AdminService();