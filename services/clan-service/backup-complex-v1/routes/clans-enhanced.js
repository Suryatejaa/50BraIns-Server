const express = require('express');
const router = express.Router();
const clanController = require('../controllers/clanController');
const { requireAuth } = require('../middleware');
const {
    validateRequest,
    validateQuery,
    validateParams,
    handleClanError
} = require('../utils/errorHandler');
const {
    createClanSchema,
    updateClanSchema,
    getClansQuerySchema,
    clanIdSchema
} = require('../validations/clanValidations');

// GET /clans - Get all clans with filtering and ranking
router.get('/',
    requireAuth,
    validateQuery(getClansQuerySchema),
    clanController.getClans
);

// GET /clans/feed - Enhanced clans feed with reputation integration
router.get('/feed',
    validateQuery(getClansQuerySchema),
    clanController.getClansAdvanced
);

// POST /clans - Create a new clan
router.post('/',
    requireAuth,
    validateRequest(createClanSchema),
    clanController.createClan
);

// GET /clans/:clanId - Get a single clan by ID
router.get('/:clanId',
    validateParams(clanIdSchema),
    clanController.getClanById
);

// PUT /clans/:clanId - Update a clan
router.put('/:clanId',
    requireAuth,
    validateParams(clanIdSchema),
    validateRequest(updateClanSchema),
    clanController.updateClan
);

// DELETE /clans/:clanId - Delete a clan
router.delete('/:clanId',
    requireAuth,
    validateParams(clanIdSchema),
    clanController.deleteClan
);

// Error handling middleware
router.use(handleClanError);

module.exports = router; 