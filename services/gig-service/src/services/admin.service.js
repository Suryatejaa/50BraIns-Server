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

            console.log('📊 Starting dashboard overview calculation...');

            // Get basic counts with individual error handling
            let totalGigs = 0, activeGigs = 0, totalApplications = 0, pendingApplications = 0;
            let todayGigs = 0, weekGigs = 0, monthGigs = 0, totalRevenue = 0;

            try {
                totalGigs = await prisma.gig.count();
                console.log('✅ Total gigs count:', totalGigs);
            } catch (error) {
                console.error('❌ Error getting total gigs:', error.message);
            }

            try {
                activeGigs = await prisma.gig.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }); // Using 'OPEN' instead of 'ACTIVE'
                console.log('✅ Active gigs count:', activeGigs);
            } catch (error) {
                console.error('❌ Error getting active gigs:', error.message);
            }

            try {
                totalApplications = await prisma.application.count();
                console.log('✅ Total applications count:', totalApplications);
            } catch (error) {
                console.error('❌ Error getting total applications:', error.message);
            }

            try {
                pendingApplications = await prisma.application.count({ where: { status: 'PENDING' } });
                console.log('✅ Pending applications count:', pendingApplications);
            } catch (error) {
                console.error('❌ Error getting pending applications:', error.message);
            }

            try {
                todayGigs = await prisma.gig.count({ where: { createdAt: { gte: startOfDay } } });
                weekGigs = await prisma.gig.count({ where: { createdAt: { gte: startOfWeek } } });
                monthGigs = await prisma.gig.count({ where: { createdAt: { gte: startOfMonth } } });
                console.log('✅ Time-based gig counts - Today:', todayGigs, 'Week:', weekGigs, 'Month:', monthGigs);
            } catch (error) {
                console.error('❌ Error getting time-based gig counts:', error.message);
            }

            try {
                totalRevenue = await this.calculateTotalRevenue();
                console.log('✅ Total revenue calculated:', totalRevenue);
            } catch (error) {
                console.error('❌ Error calculating total revenue:', error.message);
            }

            // Get status distribution with error handling
            let gigStatusDistribution = [];
            let applicationStatusDistribution = [];
            let categoryDistribution = [];

            try {
                gigStatusDistribution = await prisma.gig.groupBy({
                    by: ['status'],
                    _count: { status: true }
                });
                console.log('✅ Gig status distribution:', gigStatusDistribution);
            } catch (error) {
                console.error('❌ Error getting gig status distribution:', error.message);
            }

            try {
                applicationStatusDistribution = await prisma.application.groupBy({
                    by: ['status'],
                    _count: { status: true }
                });
                console.log('✅ Application status distribution:', applicationStatusDistribution);
            } catch (error) {
                console.error('❌ Error getting application status distribution:', error.message);
            }

            try {
                categoryDistribution = await prisma.gig.groupBy({
                    by: ['category'],
                    _count: { category: true },
                    orderBy: { _count: { category: 'desc' } },
                    take: 10
                });
                console.log('✅ Category distribution:', categoryDistribution);
            } catch (error) {
                console.error('❌ Error getting category distribution:', error.message);
            }

            // Get recent activity with error handling
            let recentGigs = [];
            let recentApplications = [];

            try {
                recentGigs = await prisma.gig.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        budgetMin: true,
                        budgetMax: true,
                        createdAt: true,
                        brandName: true,
                        brandUsername: true
                    }
                });
                console.log('✅ Recent gigs:', recentGigs.length);
            } catch (error) {
                console.error('❌ Error getting recent gigs:', error.message);
            }

            try {
                recentApplications = await prisma.application.findMany({
                    take: 5,
                    orderBy: { appliedAt: 'desc' }, // Use appliedAt instead of createdAt
                    select: {
                        id: true,
                        status: true,
                        appliedAt: true,
                        gig: {
                            select: {
                                title: true
                            }
                        }
                    }
                });
                console.log('✅ Recent applications:', recentApplications.length);
            } catch (error) {
                console.error('❌ Error getting recent applications:', error.message);
            }

            const dashboardData = {
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

            console.log('🎯 Dashboard overview completed successfully:', JSON.stringify(dashboardData, null, 2));
            return dashboardData;
        } catch (error) {
            console.error('Error getting dashboard overview:', error);
            throw new Error('Failed to retrieve dashboard overview');
        }
    }

    async calculateTotalRevenue() {
        try {
            // Calculate revenue from completed gigs using budgetMax as the basis
            const completedGigs = await prisma.gig.findMany({
                where: { status: 'COMPLETED' },
                select: { budgetMin: true, budgetMax: true }
            });

            const total = completedGigs.reduce((sum, gig) => {
                // Use budgetMax if available, otherwise budgetMin, otherwise 0
                const budget = parseFloat(gig.budgetMax || gig.budgetMin || 0);
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
                    { brandName: { contains: search, mode: 'insensitive' } },
                    { brandUsername: { contains: search, mode: 'insensitive' } }
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
                select: {
                    id: true,
                    title: true,
                    description: true,
                    budgetMin: true,
                    budgetMax: true,
                    status: true,
                    category: true,
                    brandName: true,
                    brandUsername: true,
                    createdAt: true,
                    updatedAt: true,
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
                    applications: {
                        orderBy: { appliedAt: 'desc' }
                    },
                    submissions: {
                        orderBy: { submittedAt: 'desc' }
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

            // Fix sortBy for applications - use appliedAt instead of createdAt
            const validSortBy = sortBy === 'createdAt' ? 'appliedAt' : sortBy;

            // Build where clause
            const where = {};

            if (status) where.status = status;
            if (gigId) where.gigId = gigId;
            if (applicantId) where.applicantId = applicantId;
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
                            budgetMin: true,
                            budgetMax: true,
                            status: true
                        }
                    }
                },
                orderBy: { [validSortBy]: order },
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
                        select: {
                            id: true,
                            title: true,
                            budgetMin: true,
                            budgetMax: true,
                            status: true,
                            brandName: true,
                            brandUsername: true
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
                    gig: { select: { title: true } }
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

    async getPaidRecords(filters = {}, pagination = {}) {
        try {
            const {
                creatorId,
                brandId,
                gigId,
                dateRange,
                minAmount,
                maxAmount
            } = filters;

            const {
                sortBy = 'releasedAt',
                order = 'desc',
                page = 1,
                limit = 20
            } = pagination;

            // Build where clause - only RELEASED payments
            const where = {
                status: 'RELEASED'
            };

            if (creatorId) where.paidTo = creatorId;
            if (brandId) where.paidBy = brandId;
            if (gigId) where.gigId = gigId;

            if (minAmount || maxAmount) {
                where.totalAmount = {};
                if (minAmount) where.totalAmount.gte = parseFloat(minAmount);
                if (maxAmount) where.totalAmount.lte = parseFloat(maxAmount);
            }

            if (dateRange) {
                const { startDate, endDate } = dateRange;
                if (startDate || endDate) {
                    where.releasedAt = {};
                    if (startDate) where.releasedAt.gte = new Date(startDate);
                    if (endDate) where.releasedAt.lte = new Date(endDate);
                }
            }

            // Get total count
            const totalCount = await prisma.payment.count({ where });

            // Get released payments with related data
            const paidRecords = await prisma.payment.findMany({
                where,
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            brandName: true,
                            budgetMin: true,
                            budgetMax: true
                        }
                    },
                    application: {
                        select: {
                            id: true,
                            applicantId: true,
                            quotedPrice: true,
                            estimatedTime: true
                        }
                    }
                },
                orderBy: { [sortBy]: order },
                skip: (page - 1) * limit,
                take: limit
            });

            console.log(`📋 Fetched ${paidRecords.length} released payment records for admin`);

            return {
                records: paidRecords,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPreviousPage: page > 1
                },
                summary: {
                    totalReleased: totalCount,
                    totalAmount: paidRecords.reduce((sum, record) => sum + record.totalAmount, 0)
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting paid records:', error);
            throw new Error('Failed to retrieve paid records');
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
    // SYSTEM MANAGEMENT
    // ============================================================================

    async getSystemHealth() {
        try {
            const dbHealth = await this.checkDatabaseHealth();
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime();

            return {
                status: dbHealth.connected ? 'healthy' : 'unhealthy',
                database: dbHealth,
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024),
                    unit: 'MB'
                },
                uptime: {
                    seconds: Math.floor(uptime),
                    formatted: this.formatUptime(uptime)
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting system health:', error);
            throw new Error('Failed to retrieve system health');
        }
    }

    async checkDatabaseHealth() {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return {
                connected: true,
                latency: null // Could implement latency check here
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }

    async clearCache(cacheType = 'all') {
        try {
            // Since we don't have a specific caching system implemented,
            // this is a placeholder that could integrate with Redis or similar
            const clearedItems = [];

            switch (cacheType) {
                case 'gigs':
                    clearedItems.push('gig_cache');
                    break;
                case 'users':
                    clearedItems.push('user_cache');
                    break;
                case 'analytics':
                    clearedItems.push('analytics_cache');
                    break;
                case 'all':
                default:
                    clearedItems.push('gig_cache', 'user_cache', 'analytics_cache');
                    break;
            }

            console.log(`Cache cleared: ${clearedItems.join(', ')}`);

            return {
                cacheType,
                clearedItems,
                cleared: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error clearing cache:', error);
            throw new Error('Failed to clear cache');
        }
    }

    async getDatabaseStats() {
        try {
            const [gigCount, applicationCount, submissionCount, paymentCount] = await Promise.all([
                prisma.gig.count(),
                prisma.application.count(),
                prisma.submission.count(),
                prisma.payment.count().catch(() => 0) // In case payment table doesn't exist yet
            ]);

            // Get table sizes (approximate)
            const tableStats = {
                gigs: gigCount,
                applications: applicationCount,
                submissions: submissionCount,
                payments: paymentCount
            };

            return {
                totalRecords: Object.values(tableStats).reduce((sum, count) => sum + count, 0),
                tableStats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            throw new Error('Failed to retrieve database statistics');
        }
    }

    async getPlatformStats({ period = 'monthly', startDate, endDate }) {
        try {
            const now = new Date();
            let start, end;

            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
            } else {
                switch (period) {
                    case 'daily':
                        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        end = now;
                        break;
                    case 'weekly':
                        start = new Date(now.setDate(now.getDate() - now.getDay()));
                        end = new Date();
                        break;
                    case 'monthly':
                    default:
                        start = new Date(now.getFullYear(), now.getMonth(), 1);
                        end = new Date();
                        break;
                }
            }

            const [totalGigs, activeGigs, completedGigs, totalApplications, approvedApplications] = await Promise.all([
                prisma.gig.count({ where: { createdAt: { gte: start, lte: end } } }),
                prisma.gig.count({ where: { status: 'OPEN', createdAt: { gte: start, lte: end } } }),
                prisma.gig.count({ where: { status: 'COMPLETED', createdAt: { gte: start, lte: end } } }),
                prisma.application.count({ where: { appliedAt: { gte: start, lte: end } } }),
                prisma.application.count({ where: { status: 'APPROVED', appliedAt: { gte: start, lte: end } } })
            ]);

            const successRate = totalApplications > 0 ? (approvedApplications / totalApplications * 100).toFixed(2) : 0;
            const completionRate = totalGigs > 0 ? (completedGigs / totalGigs * 100).toFixed(2) : 0;

            return {
                period,
                dateRange: { start, end },
                metrics: {
                    totalGigs,
                    activeGigs,
                    completedGigs,
                    totalApplications,
                    approvedApplications,
                    successRate: parseFloat(successRate),
                    completionRate: parseFloat(completionRate)
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting platform stats:', error);
            throw new Error('Failed to retrieve platform statistics');
        }
    }

    // ============================================================================
    // BULK OPERATIONS
    // ============================================================================

    async bulkGigAction(gigIds, action, parameters, adminId) {
        try {
            const results = [];
            const errors = [];

            for (const gigId of gigIds) {
                try {
                    let result;
                    switch (action) {
                        case 'approve':
                            result = await this.approveGig(gigId, adminId);
                            break;
                        case 'reject':
                            result = await this.rejectGig(gigId, adminId, parameters);
                            break;
                        case 'updateStatus':
                            result = await this.updateGigStatus(gigId, adminId, parameters);
                            break;
                        case 'feature':
                            result = await this.toggleGigFeature(gigId, adminId, parameters);
                            break;
                        default:
                            throw new Error(`Unknown action: ${action}`);
                    }
                    results.push({ gigId, success: true, result });
                } catch (error) {
                    errors.push({ gigId, error: error.message });
                }
            }

            return {
                processed: gigIds.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            };
        } catch (error) {
            console.error('Error performing bulk gig action:', error);
            throw new Error('Failed to perform bulk gig action');
        }
    }

    async bulkApplicationAction(applicationIds, action, parameters, adminId) {
        try {
            const results = [];
            const errors = [];

            for (const applicationId of applicationIds) {
                try {
                    let result;
                    switch (action) {
                        case 'override':
                            result = await this.overrideApplicationDecision(applicationId, adminId, parameters);
                            break;
                        default:
                            throw new Error(`Unknown action: ${action}`);
                    }
                    results.push({ applicationId, success: true, result });
                } catch (error) {
                    errors.push({ applicationId, error: error.message });
                }
            }

            return {
                processed: applicationIds.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            };
        } catch (error) {
            console.error('Error performing bulk application action:', error);
            throw new Error('Failed to perform bulk application action');
        }
    }

    // ============================================================================
    // CONFIGURATION MANAGEMENT
    // ============================================================================

    async getPlatformSettings() {
        try {
            // Default gig service settings
            const defaultSettings = {
                gig: {
                    maxApplications: 50,
                    autoApprovalDays: 7,
                    maxDeadlineDays: 90,
                    allowedCategories: [
                        'content-creation',
                        'video-editing',
                        'photography',
                        'social-media',
                        'writing',
                        'design'
                    ]
                },
                payment: {
                    escrowDays: 7,
                    refundDays: 30
                },
                submission: {
                    maxRevisions: 3,
                    autoApprovalHours: 168 // 7 days
                }
            };

            // In a real implementation, you might store these in a database table
            // For now, return the defaults
            return defaultSettings;
        } catch (error) {
            console.error('Error getting platform settings:', error);
            throw new Error('Failed to retrieve platform settings');
        }
    }

    async updatePlatformSettings(settings, adminId) {
        try {
            // In a real implementation, you would update these in a database table
            // For now, just log the update and return the settings
            await this.logAdminAction(adminId, 'UPDATE_PLATFORM_SETTINGS', null,
                `Updated platform settings: ${JSON.stringify(settings)}`);

            return {
                ...settings,
                updatedBy: adminId,
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error updating platform settings:', error);
            throw new Error('Failed to update platform settings');
        }
    }

    async getCommissionRates() {
        try {
            // Default commission rates for the gig service
            const defaultRates = {
                creator: {
                    rate: 0.05, // 5% fee from creator
                    description: 'Platform fee deducted from creator earnings'
                },
                brand: {
                    rate: 0.05, // 5% fee from brand
                    description: 'Platform fee charged to brand'
                },
                gst: {
                    rate: 0.18, // 18% GST on platform fees
                    description: 'GST on platform fees'
                },
                minAmount: 100, // Minimum transaction amount
                maxAmount: 1000000, // Maximum transaction amount
                currency: 'INR'
            };

            return defaultRates;
        } catch (error) {
            console.error('Error getting commission rates:', error);
            throw new Error('Failed to retrieve commission rates');
        }
    }

    async updateCommissionRates(rates, adminId) {
        try {
            // In a real implementation, you would update these in a database table
            // For now, just log the update and return the rates
            await this.logAdminAction(adminId, 'UPDATE_COMMISSION_RATES', null,
                `Updated commission rates: ${JSON.stringify(rates)}`);

            return {
                ...rates,
                updatedBy: adminId,
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error updating commission rates:', error);
            throw new Error('Failed to update commission rates');
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