const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const { requireAuth, asyncHandler } = require('../middleware');
const applicationController = require('../controllers/application.controller');
const paymentController = require('../controllers/payment.controller');
const webhookController = require('../controllers/webhook.controller');

// Application routes
// GET /applications/received - Get all applications received for user's gigs
router.get('/received', requireAuth, asyncHandler(applicationController.getReceivedApplications));

// POST /applications/:id/approve - Approve a specific application
router.post('/:id/approve', requireAuth, asyncHandler(applicationController.approveApplication));

// POST /applications/:id/reject - Reject a specific application
router.post('/:id/reject', requireAuth, asyncHandler(applicationController.rejectApplication));

// Escrow Payment routes
// POST /applications/:applicationId/payment/create - Create escrow payment order
router.post('/:applicationId/payment/create', requireAuth, asyncHandler(paymentController.createEscrowOrder));

// GET /applications/:applicationId/payment - Get payment status
router.get('/:applicationId/payment', requireAuth, asyncHandler(paymentController.getPaymentStatus));

// Payment verification
router.post('/payments/verify', requireAuth, asyncHandler(paymentController.verifyPayment));

// Manual payment verification for failed client verifications  
router.post('/:applicationId/payment/verify-manual', requireAuth, asyncHandler(paymentController.verifyPaymentManual));

// Admin payment management
router.post('/payments/:paymentId/release', requireAuth, asyncHandler(paymentController.releasePayment));

// Admin auto-approval (for cron job)
router.post('/admin/payments/auto-approve', asyncHandler(paymentController.autoApproveExpiredSubmissions));

// Razorpay webhook (NO auth required - Razorpay can't send auth headers)
router.post('/webhook/razorpay', webhookController.handleRazorpayWebhook);

module.exports = router;
