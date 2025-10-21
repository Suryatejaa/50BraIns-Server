// src/controllers/search.controller.js
const { StatusCodes } = require('http-status-codes');
const searchService = require('../services/search.service');
const logger = require('../utils/logger');

/**
 * Search users by name/username
 */
const searchUsers = async (req, res) => {
    const { query, page = 1, limit = 10 } = req.query;

    logger.info('Searching users', { query, page, limit });

    const results = await searchService.searchUsers({
        query,
        page: parseInt(page),
        limit: parseInt(limit)
    });

    res.status(StatusCodes.OK).json({
        success: true,
        data: {
            results: results.users,
            pagination: {
                total: results.total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(results.total / parseInt(limit))
            }
        }
    });
};

module.exports = {
    searchUsers
};
