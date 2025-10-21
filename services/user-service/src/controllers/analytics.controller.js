// src/controllers/analytics.controller.js
const analyticsService = require('../services/analytics.service');
const logger = require('../utils/logger');
const { StatusCodes } = require('http-status-codes');

/**
 * Get trending influencers based on profile views and engagement
 */
const getTrendingInfluencers = async (req, res) => {
    try {
        const { limit = 10, timeframe = '7d' } = req.query;

        const trending = await analyticsService.getTrendingInfluencers({
            limit: parseInt(limit),
            timeframe
        });

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                influencers: trending,
                timeframe,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error getting trending influencers:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch trending influencers'
        });
    }
};

/**
 * Get popular brands based on search frequency and engagement
 */
const getPopularBrands = async (req, res) => {
    try {
        const { limit = 10, industry } = req.query;

        const popular = await analyticsService.getPopularBrands({
            limit: parseInt(limit),
            industry
        });

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                brands: popular,
                filters: { industry },
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error getting popular brands:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch popular brands'
        });
    }
};

/**
 * Get search trends and analytics
 */
const getSearchTrends = async (req, res) => {
    try {
        const { timeframe = '30d', type } = req.query;

        const trends = await analyticsService.getSearchTrends({
            timeframe,
            type
        });

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                trends,
                timeframe,
                type,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error getting search trends:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch search trends'
        });
    }
};

/**
 * Get profile view analytics for a specific user
 */
const getProfileViews = async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeframe = '30d' } = req.query;

        // Check if user is requesting their own data or is admin
        if (req.user && req.user.id !== userId && (!Array.isArray(req.user.roles) || !req.user.roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r)))) {
            return res.status(StatusCodes.FORBIDDEN).json({
                success: false,
                error: 'Access denied'
            });
        }

        const analytics = await analyticsService.getProfileViews(userId, timeframe);

        res.status(StatusCodes.OK).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        logger.error('Error getting profile views:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch profile analytics'
        });
    }
};

/**
 * Get comprehensive user insights
 */
const getUserInsights = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user is requesting their own data or is admin
        if (req.user && req.user.id !== userId && (!Array.isArray(req.user.roles) || !req.user.roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r)))) {
            return res.status(StatusCodes.FORBIDDEN).json({
                success: false,
                error: 'Access denied'
            });
        }

        const insights = await analyticsService.getUserInsights(userId);

        res.status(StatusCodes.OK).json({
            success: true,
            data: insights
        });
    } catch (error) {
        logger.error('Error getting user insights:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch user insights'
        });
    }
};

/**
 * Get dashboard analytics for authenticated user
 */
const getDashboard = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const userId = req.user.id;

        // Get user insights and analytics
        const insights = await analyticsService.getUserInsights(userId);

        // Get trending influencers and popular brands for the dashboard
        const trending = await analyticsService.getTrendingInfluencers({ limit: 5 });
        const popularBrands = await analyticsService.getPopularBrands({ limit: 5 });

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                userInsights: insights,
                trending: {
                    influencers: trending,
                    brands: popularBrands
                },
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error getting dashboard analytics:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch dashboard analytics'
        });
    }
};

module.exports = {
    getTrendingInfluencers,
    getPopularBrands,
    getSearchTrends,
    getProfileViews,
    getUserInsights,
    getDashboard
};
