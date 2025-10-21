const express = require('express');
const router = express.Router();
const CreditController = require('../controllers/creditController');
const { requireAdmin, asyncHandler } = require('../middleware');

// Lazy initialize the controller to avoid database connection issues during startup
let creditController;

const getCreditController = () => {
    if (!creditController) {
        creditController = new CreditController();
    }
    return creditController;
};

// Admin-only routes
router.get('/statistics', requireAdmin, asyncHandler((req, res) => getCreditController().getStatistics(req, res)));

module.exports = router;
