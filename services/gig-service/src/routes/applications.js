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

// Payment routes
router.post('/payments/orders/:gigId', requireAuth, paymentController.createOrder);

router.post('/payments/verify', requireAuth, paymentController.verifyPayment);

// Razorpay webhook (NO auth required - Razorpay can't send auth headers)
router.post('/webhook/razorpay', webhookController.handleRazorpayWebhook);

module.exports = router;
