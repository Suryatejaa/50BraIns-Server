/**
 * Health check routes
 */

const express = require('express');
const HealthController = require('../controllers/health.controller');

const router = express.Router();

// Basic health check
router.get('/', HealthController.getHealth);

// Detailed health check
router.get('/detailed', HealthController.getDetailedHealth);

// WebSocket health check
router.get('/websocket', HealthController.getWebSocketHealth);

module.exports = router;
