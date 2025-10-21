/**
 * Public Routes
 * Handles public clan endpoints for browsing and searching
 */

const express = require('express');
const router = express.Router();
const {
    getTrendingClans,
    getClanBySlug,
    getClanCategories,
    getClanStats,
    getFeaturedClans,
    searchClans
} = require('../controllers/publicController');

// Public clan endpoints
router.get('/', getFeaturedClans); // Root endpoint for public clan listing
router.get('/trending', getTrendingClans);
router.get('/featured', getFeaturedClans);
router.get('/search', searchClans);
router.get('/categories', getClanCategories);
router.get('/stats', getClanStats);
router.get('/slug/:slug', getClanBySlug);

module.exports = router;