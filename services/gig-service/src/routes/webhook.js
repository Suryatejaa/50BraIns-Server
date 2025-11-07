// routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Razorpay webhook (NO auth required - Razorpay can't send auth headers)
router.post('/razorpay', webhookController.handleRazorpayWebhook);

module.exports = router;
