const express = require('express');
const router = express.Router();
const CreditController = require('../controllers/creditController');
const { asyncHandler } = require('../middleware');

// Lazy initialize the controller to avoid database connection issues during startup
let creditController;

const getCreditController = () => {
    if (!creditController) {
        creditController = new CreditController();
    }
    return creditController;
};

// Public endpoints - no authentication required
router.get('/packages', asyncHandler((req, res) => getCreditController().getCreditPackages(req, res)));
router.get('/boost-pricing', asyncHandler((req, res) => getCreditController().getBoostPricing(req, res)));

module.exports = router;
