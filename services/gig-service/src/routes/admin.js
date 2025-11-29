const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const payoutController = require('../controllers/payout.controller');
const submissionController = require('../controllers/submission.controller');
// Use Railway-optimized cron scheduler in production, regular one in development
const cronScheduler = process.env.RAILWAY_ENVIRONMENT
    ? require('../services/railwayCronScheduler')
    : require('../services/cronScheduler');
const { requireAuth, requireAdmin } = require('../middleware');

// ============================================================================
// GIG MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/dashboard/overview
 * Get comprehensive gig service overview for admin dashboard
 */
router.get('/dashboard/overview', requireAuth, requireAdmin, adminController.getDashboardOverview);

/**
 * GET /admin/gigs
 * Get all gigs with advanced filtering, pagination and search
 * Query params: status, category, dateRange, sortBy, order, page, limit, search
 */
router.get('/gigs', requireAuth, requireAdmin, adminController.getAllGigs);

/**
 * GET /admin/gigs/:gigId
 * Get detailed gig information for admin review
 */
router.get('/gigs/:gigId', requireAuth, requireAdmin, adminController.getGigDetails);

/**
 * POST /admin/gigs/:gigId/approve
 * Approve a pending gig
 */
router.post('/gigs/:gigId/approve', requireAuth, requireAdmin, adminController.approveGig);

/**
 * POST /admin/gigs/:gigId/reject
 * Reject a gig with reason
 * Body: { reason: string, feedback?: string }
 */
router.post('/gigs/:gigId/reject', requireAuth, requireAdmin, adminController.rejectGig);

/**
 * PUT /admin/gigs/:gigId/status
 * Change gig status (DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED)
 * Body: { status: string, reason?: string }
 */
router.put('/gigs/:gigId/status', requireAuth, requireAdmin, adminController.updateGigStatus);

/**
 * POST /admin/gigs/:gigId/feature
 * Feature/unfeature a gig for promotion
 * Body: { featured: boolean, featuredUntil?: Date }
 */
router.post('/gigs/:gigId/feature', requireAuth, requireAdmin, adminController.toggleGigFeature);

// ============================================================================
// APPLICATION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/applications
 * Get all applications with filtering and pagination
 * Query params: status, gigId, applicantId, dateRange, sortBy, order, page, limit
 */
router.get('/applications', requireAuth, requireAdmin, adminController.getAllApplications);

/**
 * GET /admin/applications/:applicationId
 * Get detailed application information
 */
router.get('/applications/:applicationId', requireAuth, requireAdmin, adminController.getApplicationDetails);

/**
 * POST /admin/applications/:applicationId/override-decision
 * Override brand's application decision (approve/reject)
 * Body: { decision: 'APPROVED' | 'REJECTED', reason: string }
 */
router.post('/applications/:applicationId/override-decision', requireAuth, requireAdmin, adminController.overrideApplicationDecision);

// ============================================================================
// FINANCIAL MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/financial/overview
 * Get financial overview dashboard
 */
router.get('/financial/overview', requireAuth, requireAdmin, adminController.getFinancialOverview);

/**
 * GET /admin/financial/transactions
 * Get all platform transactions
 * Query params: type, status, dateRange, userId, gigId, page, limit
 */
router.get('/financial/transactions', requireAuth, requireAdmin, adminController.getAllTransactions);

/**
 * GET /admin/financial/revenue
 * Get platform revenue analytics
 * Query params: period (daily, weekly, monthly), startDate, endDate
 */
router.get('/financial/revenue', requireAuth, requireAdmin, adminController.getRevenueAnalytics);

/**
 * POST /admin/financial/payments/:paymentId/process
 * Manually process a payment
 * Body: { action: 'approve' | 'reject' | 'hold', reason?: string }
 */
router.post('/financial/payments/:paymentId/process', requireAuth, requireAdmin, adminController.processPayment);

/**
 * POST /admin/financial/refunds
 * Process refund request
 * Body: { gigId: string, amount: number, reason: string, refundToInfluencer: boolean }
 */
router.post('/financial/refunds', requireAuth, requireAdmin, adminController.processRefund);

// ============================================================================
// PAYOUT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/payouts/pending
 * Get pending payouts that need to be processed
 * Query params: days (default: 1)
 */
router.get('/payouts/pending', requireAuth, requireAdmin, payoutController.getPendingPayouts);

/**
 * POST /admin/payouts/process-daily
 * Daily cron job to process payouts for approved submissions
 * This endpoint should be called by a cron job every 24 hours
 */
router.post('/payouts/process-daily', requireAuth, requireAdmin, payoutController.processDailyPayouts);

/**
 * GET /admin/payouts/approved-submissions
 * Get list of approved submissions ready for manual payout
 * Query params: page, limit, status
 */
router.get('/payouts/approved-submissions', requireAuth, requireAdmin, payoutController.getApprovedSubmissions);

/**
 * POST /admin/payouts/:paymentId/mark-paid
 * Mark payment as manually paid and notify users
 * Body: { transactionId: string, paymentMethod?: string, notes?: string, notifyUsers?: boolean }
 */
router.post('/payouts/:paymentId/mark-paid', requireAuth, requireAdmin, payoutController.markPaymentAsPaid);

// ============================================================================
// DISPUTE MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/disputes
 * Get all disputes and conflicts
 * Query params: status, type, priority, assignedTo, page, limit
 */
router.get('/disputes', requireAuth, requireAdmin, adminController.getAllDisputes);

/**
 * GET /admin/disputes/:disputeId
 * Get detailed dispute information
 */
router.get('/disputes/:disputeId', requireAuth, requireAdmin, adminController.getDisputeDetails);

/**
 * POST /admin/disputes/:disputeId/resolve
 * Resolve a dispute
 * Body: { resolution: string, compensationAmount?: number, refundAmount?: number, notes?: string }
 */
router.post('/disputes/:disputeId/resolve', requireAuth, requireAdmin, adminController.resolveDispute);

/**
 * PUT /admin/disputes/:disputeId/assign
 * Assign dispute to admin
 * Body: { assignedTo: string }
 */
router.put('/disputes/:disputeId/assign', requireAuth, requireAdmin, adminController.assignDispute);

// USER MANAGEMENT ROUTES MOVED TO USER-SERVICE
// All user-related operations (brands, influencers, verification, suspension)
// are handled by the user-service, not the gig-service

// ============================================================================
// ANALYTICS AND REPORTING ROUTES
// ============================================================================

/**
 * GET /admin/analytics/platform-stats
 * Get comprehensive platform statistics
 * Query params: period, startDate, endDate
 */
router.get('/analytics/platform-stats', requireAuth, requireAdmin, adminController.getPlatformStats);

/**
 * GET /admin/analytics/performance
 * Get platform performance metrics
 * Query params: metrics, period, compareWith
 */
router.get('/analytics/performance', requireAuth, requireAdmin, adminController.getPerformanceMetrics);

/**
 * GET /admin/analytics/trends
 * Get trending gigs, categories, and user behavior
 */
router.get('/analytics/trends', requireAuth, requireAdmin, adminController.getTrends);

/**
 * POST /admin/reports/generate
 * Generate custom reports
 * Body: { reportType: string, parameters: object, format: 'PDF' | 'CSV' | 'JSON' }
 */
router.post('/reports/generate', requireAuth, requireAdmin, adminController.generateReport);

/**
 * GET /admin/reports/:reportId/download
 * Download generated report
 */
router.get('/reports/:reportId/download', requireAuth, requireAdmin, adminController.downloadReport);

// ============================================================================
// SYSTEM MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/system/health
 * Get gig service health status
 */
router.get('/system/health', requireAuth, requireAdmin, adminController.getSystemHealth);

/**
 * GET /admin/system/logs
 * Get system logs with filtering
 * Query params: level, startDate, endDate, limit, search
 */
router.get('/system/logs', requireAuth, requireAdmin, adminController.getSystemLogs);

/**
 * POST /admin/system/cache/clear
 * Clear system cache
 * Body: { cacheType?: 'all' | 'gigs' | 'users' | 'analytics' }
 */
router.post('/system/cache/clear', requireAuth, requireAdmin, adminController.clearCache);

/**
 * GET /admin/system/database/stats
 * Get database statistics and performance metrics
 */
router.get('/system/database/stats', requireAuth, requireAdmin, adminController.getDatabaseStats);

// ============================================================================
// BULK OPERATIONS ROUTES
// ============================================================================

/**
 * POST /admin/bulk/gigs/action
 * Perform bulk actions on multiple gigs
 * Body: { gigIds: string[], action: string, parameters?: object }
 */
router.post('/bulk/gigs/action', requireAuth, requireAdmin, adminController.bulkGigAction);

/**
 * POST /admin/bulk/applications/action
 * Perform bulk actions on multiple applications
 * Body: { applicationIds: string[], action: string, parameters?: object }
 */
router.post('/bulk/applications/action', requireAuth, requireAdmin, adminController.bulkApplicationAction);

/**
 * POST /admin/bulk/export
 * Export data in bulk
 * Body: { dataType: string, filters: object, format: 'CSV' | 'JSON' | 'PDF' }
 */
router.post('/bulk/export', requireAuth, requireAdmin, adminController.bulkExport);

// ============================================================================
// CONFIGURATION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/config/platform-settings
 * Get platform configuration settings
 */
router.get('/config/platform-settings', requireAuth, requireAdmin, adminController.getPlatformSettings);

/**
 * PUT /admin/config/platform-settings
 * Update platform configuration settings
 * Body: { settings: object }
 */
router.put('/config/platform-settings', requireAuth, requireAdmin, adminController.updatePlatformSettings);

/**
 * GET /admin/config/commission-rates
 * Get current commission rates
 */
router.get('/config/commission-rates', requireAuth, requireAdmin, adminController.getCommissionRates);

/**
 * PUT /admin/config/commission-rates
 * Update commission rates
 * Body: { rates: object }
 */
router.put('/config/commission-rates', requireAuth, requireAdmin, adminController.updateCommissionRates);

// ============================================================================
// CRON JOB MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/cron/status
 * Get cron scheduler status and job information
 */
router.get('/cron/status', requireAuth, requireAdmin, (req, res) => {
    try {
        const status = cronScheduler.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get cron status',
            details: error.message
        });
    }
});

/**
 * POST /admin/cron/trigger-payouts
 * Manually trigger daily payout processing
 */
router.post('/cron/trigger-payouts', requireAuth, requireAdmin, async (req, res) => {
    try {
        await cronScheduler.triggerDailyPayouts();
        res.json({
            success: true,
            message: 'Daily payout processing triggered successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to trigger payout processing',
            details: error.message
        });
    }
});

/**
 * POST /admin/cron/trigger-submission-reminders
 * Manually trigger submission reminder cron job
 */
router.post('/cron/trigger-submission-reminders', requireAuth, requireAdmin, async (req, res) => {
    try {
        await submissionController.triggerSubmissionReminders();
        res.json({
            success: true,
            message: 'Submission reminder job triggered successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to trigger submission reminders',
            details: error.message
        });
    }
});

/**
 * POST /admin/cron/trigger-auto-approvals
 * Manually trigger auto-approval cron job
 */
router.post('/cron/trigger-auto-approvals', requireAuth, requireAdmin, async (req, res) => {
    try {
        await submissionController.triggerAutoApprovals();
        res.json({
            success: true,
            message: 'Auto-approval job triggered successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to trigger auto-approvals',
            details: error.message
        });
    }
});

// ============================================================================
// SUBMISSION MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /admin/submissions/send-reminders
 * Manually trigger submission reminder notifications
 */
router.post('/submissions/send-reminders', requireAuth, requireAdmin, submissionController.sendSubmissionReminders);

/**
 * POST /admin/submissions/auto-approve
 * Manually trigger auto-approval of overdue submissions
 */
router.post('/submissions/auto-approve', requireAuth, requireAdmin, submissionController.processAutoApprovals);

module.exports = router;