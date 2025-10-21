// src/routes/analytics.routes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// Public analytics endpoints (no authentication required)
router.get('/trending-influencers', analyticsController.getTrendingInfluencers);
router.get('/popular-brands', analyticsController.getPopularBrands);
router.get('/search-trends', analyticsController.getSearchTrends);

// Protected analytics endpoints (gateway handles authentication)
router.get('/dashboard', analyticsController.getDashboard);
router.get('/profile-views/:userId', analyticsController.getProfileViews);
router.get('/user-insights/:userId', analyticsController.getUserInsights);

module.exports = router;
