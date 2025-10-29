// src/controllers/search.controller.js
const { StatusCodes } = require('http-status-codes');
const searchService = require('../services/search.service');
const userCacheService = require('../services/userCacheService');
const DatabaseOptimizer = require('../utils/databaseOptimizer');
const logger = require('../utils/logger');

/**
 * Search users by name/username
 */
const searchUsers = DatabaseOptimizer.withPerformanceMonitoring(
    'searchUsers',
    async (req, res) => {
        const { query, page = 1, limit = 10 } = req.query;

        logger.info('Searching users', { query, page, limit });

        // Optimize pagination
        const pagination = DatabaseOptimizer.optimizePagination(page, limit, 50);

        // Create cache key
        const cacheKey = `search:users:${query}:${pagination.page}:${pagination.limit}`;

        const results = await userCacheService.getList(
            cacheKey,
            async () => {
                return await searchService.searchUsersOptimized({
                    query,
                    page: pagination.page,
                    limit: pagination.limit
                });
            },
            300 // 5 minutes cache for search results
        );

        const cleanedResults = DatabaseOptimizer.cleanResponse(results);

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                results: cleanedResults.users,
                pagination: {
                    total: cleanedResults.total,
                    page: pagination.page,
                    limit: pagination.limit,
                    pages: Math.ceil(cleanedResults.total / pagination.limit)
                }
            }
        });
    }
);

module.exports = {
    searchUsers
};
