const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const { requireAuth, asyncHandler } = require('../middleware'); // Add requireAuth import
const workHistoryController = require('../controllers/workHistoryController');
const campaignHistoryController = require('../controllers/campaignHistoryController');
const gig_controller = require('../controllers/gig.controller');
const applicationController = require('../controllers/application.controller');
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware');

{/***********************************************
****************gig_controller Routes****************
************************************************/}
// POST /gigs - Create a new gig (authenticated)
router.post('/', requireAuth, asyncHandler(gig_controller.createGig));

// POST /gigs/:gigId/change-status - Change gig status (authenticated)
router.post('/:gigId/change-status', requireAuth, asyncHandler(gig_controller.changeGigStatus));

// PUT /:gigId/change-visibility - Change gig visibility (authenticated)
router.put('/:gigId/change-visibility', requireAuth, asyncHandler(gig_controller.changeGigVisibility));

// POST /gigs/draft - Save gig as draft (authenticated)
router.post('/draft', requireAuth, asyncHandler(gig_controller.saveDraft));

// GET /gigs - List all gigs with advanced sorting and filtering (public)
router.get('/', asyncHandler(gig_controller.getGigs));

// GET /gigs/feed - Enhanced gigs feed (alias for main route)
router.get('/feed', asyncHandler(gig_controller.getGigs));

// GET /gigs/my-drafts - Get user's draft gigs (authenticated)
router.get('/my-drafts', requireAuth, asyncHandler(gig_controller.getMyDrafts));


{/***************************************************************
    ****************gig Routes****************
    ************************************************/   }
// GET /gigs/my-posted - Get user's posted gigs (authenticated)
router.get('/my-posted', requireAuth, asyncHandler(gigController.getMyPostedGigs));

// POST /gigs/draft/:id/publish - Publish a draft gig (authenticated)
router.post('/draft/:id/publish', requireAuth, asyncHandler(gigController.publishDraft));

// DELETE /gigs/draft/:id - Delete a draft gig (authenticated)
router.delete('/draft/:id', requireAuth, asyncHandler(gigController.deleteDraft));

// GET /gigs/draft/:id - Get a specific draft gig (authenticated)
router.get('/draft/:id', requireAuth, asyncHandler(gigController.getDraftGig));

// GET /gigs/my/stats - Get user's gig statistics (authenticated)
router.get('/my/stats', requireAuth, asyncHandler(gigController.getMyGigStats));

// GET /gigs/my/active - Get user's active gigs (authenticated)
router.get('/my/active', requireAuth, asyncHandler(gigController.getMyActiveGigs));

// GET /gigs/my/completed - Get user's completed gigs (authenticated)
router.get('/my/completed', requireAuth, asyncHandler(gigController.getMyCompletedGigs));

// GET /gigs/public/search - Search gigs (public)
router.get('/public/search', asyncHandler(gigController.searchGigs));

// GET /gigs/public/featured - Get featured gigs (public)
router.get('/public/featured', asyncHandler(gigController.getFeaturedGigs));

// GET /gigs/public/categories - Get all categories (public)
router.get('/public/categories', asyncHandler(gigController.getCategories));

// GET /gigs/public/skills - Get popular skills (public)
router.get('/public/skills', asyncHandler(gigController.getPopularSkills));

// PUT /gigs/:id - Update a gig (authenticated, gig owner only)
router.put('/:id', requireAuth, asyncHandler(gigController.updateGig));

// DELETE /gigs/:id - Delete a gig (authenticated, gig owner only)
router.delete('/:id', requireAuth, asyncHandler(gigController.deleteGig));

// PATCH /gigs/:id/publish - Publish a gig (authenticated, gig owner only)
router.patch('/:id/publish', requireAuth, asyncHandler(gigController.publishGig));

// PATCH /gigs/:id/close - Close a gig (authenticated, gig owner only)
router.patch('/:id/close', requireAuth, asyncHandler(gigController.closeGig));


{/***************************************************************
****************applicationController Routes****************
************************************************/   }

// POST /gigs/:id/apply - Apply to a gig (authenticated) - THIS IS THE KEY FIX
router.post('/:id/apply', requireAuth, asyncHandler(applicationController.applyToGig));

// POST /gigs/:id/assign - Send gig invitation (authenticated, gig owner only)
router.post('/:id/assign', requireAuth, asyncHandler(applicationController.assignGig));

// POST /gigs/:id/submit - Submit work for a gig (assigned applicant only)
router.post('/:id/submit', requireAuth, asyncHandler(applicationController.submitWork));

// POST /gigs/submissions/:id/review - Review a submission (gig owner only)
router.post('/submissions/:id/review', requireAuth, asyncHandler(applicationController.reviewSubmission));

// DELETE /gigs/applications/:id - Withdraw an application (applicant only)
router.delete('/applications/:id', requireAuth, asyncHandler(applicationController.withdrawApplication));

// POST /gigs/applications/:id/accept - Accept a specific application (gig owner only)
router.post('/applications/:id/approve', requireAuth, asyncHandler(applicationController.approveApplication));

// POST /gigs/applications/:id/reject - Reject a specific application (gig owner only)
router.post('/applications/:id/reject', requireAuth, asyncHandler(applicationController.rejectApplication));

// POST /gigs/applications/:id/accept-invitation - User accepts gig invitation
router.post('/applications/:id/accept-invitation', requireAuth, asyncHandler(applicationController.acceptInvitation));

// POST /gigs/applications/:id/reject-invitation - User rejects gig invitation
router.post('/applications/:id/reject-invitation', requireAuth, asyncHandler(applicationController.rejectInvitation));

// GET /gigs/my-applications - Get user's applications (authenticated)
router.get('/my-applications', requireAuth, asyncHandler(applicationController.getMyApplications));

//GET /gigs/applications/received - Get received applications for gig owner
router.get('/applications/received', requireAuth, asyncHandler(applicationController.getReceivedApplications));

// PUT /gigs/applications/:id - Update an application (applicant only)
router.put('/applications/:id', requireAuth, asyncHandler(applicationController.updateApplication));


{/***************************************************************
****************gigController Routes****************
************************************************/   }

// GET /gigs/:id - Get detailed gig view (public) - MOVED HERE TO FIX ROUTE ORDERING
router.get('/:id', asyncHandler(gig_controller.getGigById));

// GET /gigs/:id/applications - Get applications for a gig (gig owner only)
router.get('/:gigId/applications', requireAuth, asyncHandler(gigController.getGigApplications));

// GET /gigs/:id/submissions - Get submissions for a gig (gig owner only)
router.get('/:id/submissions', requireAuth, asyncHandler(gigController.getGigSubmissions));

// PUT /gigs/:id/status - Update gig status (gig owner only)
router.put('/:id/status', requireAuth, asyncHandler(gigController.updateGigStatus));

// PUT /gigs/submissions/:id - Update a submission (submitter only)
router.put('/submissions/:id', requireAuth, asyncHandler(gigController.updateSubmission));

// *******************************************
// *************** UNNECESSARY ROUTES ****************
// *******************************************

// POST /gigs/:gigId/milestones - Create a milestone for a gig
router.post('/:gigId/milestones', requireAuth, asyncHandler(gigController.createMilestone));

// POST /gigs/:gigId/milestones/:milestoneId/submit - Submit milestone for approval
router.post('/:gigId/milestones/:milestoneId/submit', requireAuth, asyncHandler(gigController.submitMilestone));

// POST /gigs/:gigId/milestones/:milestoneId/approve - Approve milestone (brand only)
router.post('/:gigId/milestones/:milestoneId/approve', requireAuth, asyncHandler(gigController.approveMilestone));

// POST /gigs/:gigId/tasks - Create a task for a gig
router.post('/:gigId/tasks', requireAuth, asyncHandler(gigController.createTask));

// PATCH /gigs/:gigId/tasks/:taskId - Update task status
router.patch('/:gigId/tasks/:taskId', requireAuth, asyncHandler(gigController.updateTask));

// NEW: Get gig assignments by clan
router.get('/assignments/by-clan/:clanId', requireAuth, asyncHandler(gigController.getGigAssignmentsByClan));

// NEW: Get gigs by clan (for clan service integration)
router.get('/by-clan/:clanId', requireAuth, asyncHandler(gigController.getGigsByClan));

// NEW: Get milestones for a specific gig
router.get('/:gigId/milestones', requireAuth, asyncHandler(gigController.getGigMilestones));

// NEW: Get tasks for a specific gig
router.get('/:gigId/tasks', requireAuth, asyncHandler(gigController.getGigTasks));

// POST /gigs/:id/boost - Boost a gig (authenticated, gig owner only)
router.post('/:id/boost', requireAuth, asyncHandler(gigController.boostGig));

// GET /gigs/:id/boosts - Get gig boosts (authenticated, gig owner only)
router.get('/:id/boosts', requireAuth, asyncHandler(gigController.getGigBoosts));
//*************************************************/
//*************** UNNECESSARY ROUTES ****************
//*************************************************/

// Work History Routes
router.get('/work-history/applicant/:applicantId/earnings', workHistoryController.getApplicantEarnings);
router.patch('/work-history/application/:applicationId', workHistoryController.updateWorkHistory);
router.get('/work-history/applicant/:applicantId', workHistoryController.getApplicantHistory);

// Campaign History Routes
router.get('/campaigns/brand/:brandId', campaignHistoryController.getBrandCampaigns);
router.get('/campaigns/brand/:brandId/analytics', campaignHistoryController.getCampaignAnalytics);
router.patch('/campaigns/:gigId/metrics', campaignHistoryController.updateCampaignMetrics);

// ============================================================================
// GIG MANAGEMENT ROUTES
// ============================================================================



/**
 * GET /admin/dashboard/overview
 * Get comprehensive gig service overview for admin dashboard
 */
router.get('/admin/dashboard/overview', requireAuth, requireAdmin, adminController.getDashboardOverview);

/**
 * GET /admin/gigs
 * Get all gigs with advanced filtering, pagination and search
 * Query params: status, category, dateRange, sortBy, order, page, limit, search
 */
router.get('/admin/gigs', requireAuth, requireAdmin, adminController.getAllGigs);

/**
 * GET /admin/gigs/:gigId
 * Get detailed gig information for admin review
 */
router.get('/admin/gigs/:gigId', requireAuth, requireAdmin, adminController.getGigDetails);

/**
 * POST /admin/gigs/:gigId/approve
 * Approve a pending gig
 */
router.post('/admin/gigs/:gigId/approve', requireAuth, requireAdmin, adminController.approveGig);

/**
 * POST /admin/gigs/:gigId/reject
 * Reject a gig with reason
 * Body: { reason: string, feedback?: string }
 */
router.post('/admin/gigs/:gigId/reject', requireAuth, requireAdmin, adminController.rejectGig);

/**
 * PUT /admin/gigs/:gigId/status
 * Change gig status (DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED)
 * Body: { status: string, reason?: string }
 */
router.put('/admin/gigs/:gigId/status', requireAuth, requireAdmin, adminController.updateGigStatus);

/**
 * POST /admin/gigs/:gigId/feature
 * Feature/unfeature a gig for promotion
 * Body: { featured: boolean, featuredUntil?: Date }
 */
router.post('/admin/gigs/:gigId/feature', requireAuth, requireAdmin, adminController.toggleGigFeature);

// ============================================================================
// APPLICATION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/applications
 * Get all applications with filtering and pagination
 * Query params: status, gigId, applicantId, dateRange, sortBy, order, page, limit
 */
router.get('/admin/applications', requireAuth, requireAdmin, adminController.getAllApplications);

/**
 * GET /admin/applications/:applicationId
 * Get detailed application information
 */
router.get('/admin/applications/:applicationId', requireAuth, requireAdmin, adminController.getApplicationDetails);

/**
 * POST /admin/applications/:applicationId/override-decision
 * Override brand's application decision (approve/reject)
 * Body: { decision: 'APPROVED' | 'REJECTED', reason: string }
 */
router.post('/admin/applications/:applicationId/override-decision', requireAuth, requireAdmin, adminController.overrideApplicationDecision);

// ============================================================================
// FINANCIAL MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/financial/overview
 * Get financial overview dashboard
 */
router.get('/admin/financial/overview', requireAuth, requireAdmin, adminController.getFinancialOverview);

/**
 * GET /admin/financial/transactions
 * Get all platform transactions
 * Query params: type, status, dateRange, userId, gigId, page, limit
 */
router.get('/admin/financial/transactions', requireAuth, requireAdmin, adminController.getAllTransactions);

/**
 * GET /admin/financial/revenue
 * Get platform revenue analytics
 * Query params: period (daily, weekly, monthly), startDate, endDate
 */
router.get('/admin/financial/revenue', requireAuth, requireAdmin, adminController.getRevenueAnalytics);

/**
 * POST /admin/financial/payments/:paymentId/process
 * Manually process a payment
 * Body: { action: 'approve' | 'reject' | 'hold', reason?: string }
 */
router.post('/admin/financial/payments/:paymentId/process', requireAuth, requireAdmin, adminController.processPayment);

/**
 * POST /admin/financial/refunds
 * Process refund request
 * Body: { gigId: string, amount: number, reason: string, refundToInfluencer: boolean }
 */
router.post('/admin/financial/refunds', requireAuth, requireAdmin, adminController.processRefund);

// ============================================================================
// DISPUTE MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/disputes
 * Get all disputes and conflicts
 * Query params: status, type, priority, assignedTo, page, limit
 */
router.get('/admin/disputes', requireAuth, requireAdmin, adminController.getAllDisputes);

/**
 * GET /admin/disputes/:disputeId
 * Get detailed dispute information
 */
router.get('/admin/disputes/:disputeId', requireAuth, requireAdmin, adminController.getDisputeDetails);

/**
 * POST /admin/disputes/:disputeId/resolve
 * Resolve a dispute
 * Body: { resolution: string, compensationAmount?: number, refundAmount?: number, notes?: string }
 */
router.post('/admin/disputes/:disputeId/resolve', requireAuth, requireAdmin, adminController.resolveDispute);

/**
 * PUT /admin/disputes/:disputeId/assign
 * Assign dispute to admin
 * Body: { assignedTo: string }
 */
router.put('/admin/disputes/:disputeId/assign', requireAuth, requireAdmin, adminController.assignDispute);

// ============================================================================
// USER MANAGEMENT ROUTES (GIG-SPECIFIC)
// ============================================================================

/**
 * GET /admin/users/brands
 * Get all brand users with gig statistics
 * Query params: status, verificationStatus, sortBy, order, page, limit
 */
router.get('/admin/users/brands', requireAuth, requireAdmin, adminController.getAllBrands);

/**
 * GET /admin/users/influencers
 * Get all influencer users with performance metrics
 * Query params: status, verificationStatus, performanceLevel, sortBy, order, page, limit
 */
router.get('/admin/users/influencers', requireAuth, requireAdmin, adminController.getAllInfluencers);

/**
 * GET /admin/users/:userId/gig-history
 * Get complete gig history for a user
 */
router.get('/admin/users/:userId/gig-history', requireAuth, requireAdmin, adminController.getUserGigHistory);

/**
 * POST /admin/users/:userId/verify
 * Manually verify a brand or influencer account
 * Body: { verificationType: 'BRAND' | 'INFLUENCER', verificationNotes?: string }
 */
router.post('/admin/users/:userId/verify', requireAuth, requireAdmin, adminController.verifyUser);

/**
 * POST /admin/users/:userId/suspend
 * Suspend user from creating/applying to gigs
 * Body: { reason: string, suspensionDuration?: number, suspensionUntil?: Date }
 */
router.post('/admin/users/:userId/suspend', requireAuth, requireAdmin, adminController.suspendUser);

// ============================================================================
// ANALYTICS AND REPORTING ROUTES
// ============================================================================

/**
 * GET /admin/analytics/platform-stats
 * Get comprehensive platform statistics
 * Query params: period, startDate, endDate
 */
router.get('/admin/analytics/platform-stats', requireAuth, requireAdmin, adminController.getPlatformStats);

/**
 * GET /admin/analytics/performance
 * Get platform performance metrics
 * Query params: metrics, period, compareWith
 */
router.get('/admin/analytics/performance', requireAuth, requireAdmin, adminController.getPerformanceMetrics);

/**
 * GET /admin/analytics/trends
 * Get trending gigs, categories, and user behavior
 */
router.get('/admin/analytics/trends', requireAuth, requireAdmin, adminController.getTrends);

/**
 * POST /admin/reports/generate
 * Generate custom reports
 * Body: { reportType: string, parameters: object, format: 'PDF' | 'CSV' | 'JSON' }
 */
router.post('/admin/reports/generate', requireAuth, requireAdmin, adminController.generateReport);

/**
 * GET /admin/reports/:reportId/download
 * Download generated report
 */
router.get('/admin/reports/:reportId/download', requireAuth, requireAdmin, adminController.downloadReport);

// ============================================================================
// SYSTEM MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/system/health
 * Get gig service health status
 */
router.get('/admin/system/health', requireAuth, requireAdmin, adminController.getSystemHealth);

/**
 * GET /admin/system/logs
 * Get system logs with filtering
 * Query params: level, startDate, endDate, limit, search
 */
router.get('/admin/system/logs', requireAuth, requireAdmin, adminController.getSystemLogs);

/**
 * POST /admin/system/cache/clear
 * Clear system cache
 * Body: { cacheType?: 'all' | 'gigs' | 'users' | 'analytics' }
 */
router.post('/admin/system/cache/clear', requireAuth, requireAdmin, adminController.clearCache);

/**
 * GET /admin/system/database/stats
 * Get database statistics and performance metrics
 */
router.get('/admin/system/database/stats', requireAuth, requireAdmin, adminController.getDatabaseStats);

// ============================================================================
// BULK OPERATIONS ROUTES
// ============================================================================

/**
 * POST /admin/bulk/gigs/action
 * Perform bulk actions on multiple gigs
 * Body: { gigIds: string[], action: string, parameters?: object }
 */
router.post('/admin/bulk/gigs/action', requireAuth, requireAdmin, adminController.bulkGigAction);

/**
 * POST /admin/bulk/applications/action
 * Perform bulk actions on multiple applications
 * Body: { applicationIds: string[], action: string, parameters?: object }
 */
router.post('/admin/bulk/applications/action', requireAuth, requireAdmin, adminController.bulkApplicationAction);

/**
 * POST /admin/bulk/export
 * Export data in bulk
 * Body: { dataType: string, filters: object, format: 'CSV' | 'JSON' | 'PDF' }
 */
router.post('/admin/bulk/export', requireAuth, requireAdmin, adminController.bulkExport);

// ============================================================================
// CONFIGURATION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/config/platform-settings
 * Get platform configuration settings
 */
router.get('/admin/config/platform-settings', requireAuth, requireAdmin, adminController.getPlatformSettings);

/**
 * PUT /admin/config/platform-settings
 * Update platform configuration settings
 * Body: { settings: object }
 */
router.put('/admin/config/platform-settings', requireAuth, requireAdmin, adminController.updatePlatformSettings);

/**
 * GET /admin/config/commission-rates
 * Get current commission rates
 */
router.get('/admin/config/commission-rates', requireAuth, requireAdmin, adminController.getCommissionRates);

/**
 * PUT /admin/config/commission-rates
 * Update commission rates
 * Body: { rates: object }
 */
router.put('/admin/config/commission-rates', requireAuth, requireAdmin, adminController.updateCommissionRates);



module.exports = router;