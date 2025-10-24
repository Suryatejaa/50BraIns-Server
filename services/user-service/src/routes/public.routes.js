// src/routes/public.routes.js
const express = require('express');
const publicController = require('../controllers/public.controller');

const router = express.Router();

// Public profile routes (no authentication required)
router.get('/users/:userId', publicController.getPublicUserProfile);
router.get('/influencers/:userId', publicController.getPublicInfluencerProfile);
router.get('/brands/:userId', publicController.getPublicBrandProfile);
router.get('/crew/:userId', publicController.getPublicCrewProfile);

// Additional public routes for missing endpoints
router.get('/stats', publicController.getPublicStats);
router.get('/profiles/:userId', publicController.getPublicUserProfile);
// Batch resolve users (for clan member suggest/resolve)
router.post('/profiles/resolve', publicController.resolveUsers);
// Internal batch ids lookup (used by clan-service enrichment)
router.post('/profiles/internal/by-ids', publicController.getUsersByIdsInternal);
router.post('/profiles/internal/by-usernames', publicController.getUsersByUsernamesInternal);

module.exports = router;
