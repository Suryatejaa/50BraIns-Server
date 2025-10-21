const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware');

// Simplified admin route - placeholder for future implementation
router.get('/', asyncHandler(async (req, res) => {
    res.json({
        success: true,
        message: 'Admin endpoint - coming soon',
        data: {},
        timestamp: new Date().toISOString()
    });
}));

module.exports = router;
