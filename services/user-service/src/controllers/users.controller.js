const { validateInput } = require('../../../auth-service/src/utils/validation.utils');
const logger = require('../../../auth-service/src/utils/logger.utils');
const UserService = require('../../../auth-service/src/services/user.service');

// All profile management logic removed. Use user-service for profile CRUD.

// Search users
const searchUsers = async (req, res) => {
    try {
        const { q, limit = 10, offset = 0 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: { message: 'Search query is required' }
            });
        }

        const results = await UserService.searchUsers(q, parseInt(limit), parseInt(offset));

        if (!results || !Array.isArray(results.users)) {
            return res.status(200).json({
                success: true,
                data: {
                    users: [],
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        total: 0
                    }
                }
            });
        }

        // Only return public fields for each user
        const publicUsers = results.users.map(u => ({
            id: u.id,
            username: u.username,
            createdAt: u.createdAt
        }));

        res.status(200).json({
            success: true,
            data: {
                users: publicUsers,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: results.total || publicUsers.length
                }
            }
        });

    } catch (error) {
        logger.error('Search users error:', error);
        if (error && error.stack) {
            console.error('Search users error stack:', error.stack);
        }
        try { console.error('Search users error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get user by ID (public profile)
const getUserById = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await UserService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Only return public fields
        const publicUser = {
            id: user.id,
            username: user.username,
            createdAt: user.createdAt
        };
        res.status(200).json({ success: true, data: { user: publicUser } });
    } catch (error) {
        logger.error('Get user by ID error:', error);
        if (error && error.stack) {
            console.error('Get user by ID error stack:', error.stack);
        }
        try { console.error('Get user by ID error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Get user activity log
const getActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;

        const results = await UserService.getUserActivity(userId, parseInt(limit), parseInt(offset));

        res.status(200).json({
            success: true,
            data: {
                activities: results.activities,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: results.total
                }
            }
        });

    } catch (error) {
        logger.error('Get activity error:', error);
        if (error && error.stack) {
            console.error('Get activity error stack:', error.stack);
        }
        try { console.error('Get activity error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get user sessions
const getSessions = async (req, res) => {
    try {
        const userId = req.user.id;

        const sessions = await UserService.getUserSessions(userId);

        res.status(200).json({
            success: true,
            data: { sessions }
        });

    } catch (error) {
        logger.error('Get sessions error:', error);
        if (error && error.stack) {
            console.error('Get sessions error stack:', error.stack);
        }
        try { console.error('Get sessions error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Revoke specific session
const revokeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

        const revoked = await UserService.revokeSessionById(userId, sessionId);

        if (!revoked) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Session revoked successfully'
        });

    } catch (error) {
        logger.error('Revoke session error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    searchUsers,
    getUserById,
    getActivity,
    getSessions,
    revokeSession
};
