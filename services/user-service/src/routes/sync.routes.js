// src/routes/sync.routes.js
const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');

// Endpoints for synchronizing data between auth-service and user-service
// These should be called by auth-service when user data changes

// Webhook endpoint for auth-service to notify user-service of changes
router.post('/user-updated', syncController.handleUserUpdate);
router.post('/user-created', syncController.handleUserCreate);
router.post('/user-deleted', syncController.handleUserDelete);

// Manual sync endpoints (gateway handles admin authorization)
router.post('/sync-all-users', syncController.syncAllUsers);
router.post('/sync-user/:userId', syncController.syncSingleUser);

// Health check for sync status (gateway handles admin authorization)
router.get('/sync-status', syncController.getSyncStatus);

module.exports = router;
