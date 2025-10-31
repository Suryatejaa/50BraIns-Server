const express = require('express');
const router = express.Router();
const internalController = require('../controllers/internal.controller');
const { internalServiceAuth } = require('../middleware/internal.middleware');

// Internal service endpoints (authenticated via X-Internal-Service header)
router.get('/users', internalServiceAuth, internalController.getAllUsers);
router.get('/users/:userId', internalServiceAuth, internalController.getUserById);

module.exports = router;