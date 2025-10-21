/**
 * Simple test controller to debug the socket hang up issue
 */
const logger = require('../utils/logger.utils');
const { catchAsync, ValidationError } = require('../utils/errors.utils');

const simpleRegister = catchAsync(async (req, res) => {
    logger.info('Simple register endpoint hit', {
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Simple validation
    if (!req.body.email || !req.body.password) {
        throw new ValidationError('Email and password are required');
    }

    // Simulate some async work without database
    await new Promise(resolve => setTimeout(resolve, 100));

    logger.info('Returning response from simple register');

    res.status(201).json({
        success: true,
        message: 'Simple register test successful',
        data: {
            email: req.body.email,
            message: 'This is a test response'
        }
    });
});

module.exports = {
    simpleRegister
};
