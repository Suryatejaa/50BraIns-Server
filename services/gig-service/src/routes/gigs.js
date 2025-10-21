const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const { requireAuth, asyncHandler } = require('../middleware'); // Add requireAuth import

// POST /gigs - Create a new gig (authenticated)
router.post('/', requireAuth, asyncHandler(gigController.createGig));

// POST /gigs/:gigId/change-status - Change gig status (authenticated)
router.post('/:gigId/change-status', requireAuth, asyncHandler(gigController.changeGigStatus));

// POST /gigs/draft - Save gig as draft (authenticated)
router.post('/draft', requireAuth, asyncHandler(gigController.saveDraft));

// GET /gigs/my-drafts - Get user's draft gigs (authenticated)
router.get('/my-drafts', requireAuth, asyncHandler(gigController.getMyDrafts));

// GET /gigs/my-posted - Get user's posted gigs (authenticated)
router.get('/my-posted', requireAuth, asyncHandler(gigController.getMyPostedGigs));

// GET /gigs/my-applications - Get user's applications (authenticated)
router.get('/my-applications', requireAuth, asyncHandler(gigController.getMyApplications));

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

// GET /gigs - List all gigs with advanced sorting and filtering (public)
router.get('/', asyncHandler(gigController.getGigs));

// GET /gigs/feed - Enhanced gigs feed (alias for main route)
router.get('/feed', asyncHandler(gigController.getGigs));

// GET /gigs/:id - Get detailed gig view (public)
router.get('/:id', asyncHandler(gigController.getGigById));

// PUT /gigs/:id - Update a gig (authenticated, gig owner only)
router.put('/:id', requireAuth, asyncHandler(gigController.updateGig));

// DELETE /gigs/:id - Delete a gig (authenticated, gig owner only)
router.delete('/:id', requireAuth, asyncHandler(gigController.deleteGig));

// PATCH /gigs/:id/publish - Publish a gig (authenticated, gig owner only)
router.patch('/:id/publish', requireAuth, asyncHandler(gigController.publishGig));

// PATCH /gigs/:id/close - Close a gig (authenticated, gig owner only)
router.patch('/:id/close', requireAuth, asyncHandler(gigController.closeGig));

// POST /gigs/:id/boost - Boost a gig (authenticated, gig owner only)
router.post('/:id/boost', requireAuth, asyncHandler(gigController.boostGig));

// GET /gigs/:id/boosts - Get gig boosts (authenticated, gig owner only)
router.get('/:id/boosts', requireAuth, asyncHandler(gigController.getGigBoosts));

// POST /gigs/:id/apply - Apply to a gig (authenticated) - THIS IS THE KEY FIX
router.post('/:id/apply', requireAuth, asyncHandler(gigController.applyToGig));

// POST /gigs/:id/assign - Send gig invitation (authenticated, gig owner only)
router.post('/:id/assign', requireAuth, asyncHandler(gigController.assignGig));

// GET /gigs/:id/applications - Get applications for a gig (gig owner only)
router.get('/:gigId/applications', requireAuth, asyncHandler(gigController.getGigApplications));

// POST /gigs/:id/submit - Submit work for a gig (assigned applicant only)
router.post('/:id/submit', requireAuth, asyncHandler(gigController.submitWork));

// GET /gigs/:id/submissions - Get submissions for a gig (gig owner only)
router.get('/:id/submissions', requireAuth, asyncHandler(gigController.getGigSubmissions));

// PUT /gigs/:id/status - Update gig status (gig owner only)
router.put('/:id/status', requireAuth, asyncHandler(gigController.updateGigStatus));

// POST /gigs/applications/:id/accept - Accept a specific application (gig owner only)
router.post('/applications/:id/approve', requireAuth, asyncHandler(gigController.approveApplication));

// POST /gigs/applications/:id/reject - Reject a specific application (gig owner only)
router.post('/applications/:id/reject', requireAuth, asyncHandler(gigController.rejectApplication));

// POST /gigs/applications/:id/accept-invitation - User accepts gig invitation
router.post('/applications/:id/accept-invitation', requireAuth, asyncHandler(gigController.acceptInvitation));

// POST /gigs/applications/:id/reject-invitation - User rejects gig invitation
router.post('/applications/:id/reject-invitation', requireAuth, asyncHandler(gigController.rejectInvitation));

// PUT /gigs/applications/:id - Update an application (applicant only)
router.put('/applications/:id', requireAuth, asyncHandler(gigController.updateApplication));

// DELETE /gigs/applications/:id - Withdraw an application (applicant only)
router.delete('/applications/:id', requireAuth, asyncHandler(gigController.withdrawApplication));

// PUT /gigs/submissions/:id - Update a submission (submitter only)
router.put('/submissions/:id', requireAuth, asyncHandler(gigController.updateSubmission));

// POST /gigs/submissions/:id/review - Review a submission (gig owner only)
router.post('/submissions/:id/review', requireAuth, asyncHandler(gigController.reviewSubmission));

// Clan gig workflow routes
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

module.exports = router;