const logger = require('../utils/logger');

// Handler for user.registered event
async function handleUserRegistered(data) {
    try {
        logger.info('Processing user.registered event in userSync.consumer', { userId: data.id });

        // Import event handler service dynamically to avoid circular dependencies
        const eventHandlerService = require('../services/eventHandler.service');
        const result = await eventHandlerService.handleUserRegistered(data);

        logger.info('User profile synced from auth-service', { userId: data.id, result });
        return result;
    } catch (err) {
        logger.error('Failed to sync user profile from auth-service', err);
        throw err;
    }
}

function startUserSyncConsumer() {
    try {
        logger.info('Starting user sync consumer...');
        // Note: RabbitMQ connection is now handled in main index.js
        // This function is kept for backward compatibility
        logger.info('User sync consumer setup completed (RabbitMQ handled in main service)');
    } catch (error) {
        logger.error('Error in startUserSyncConsumer:', error);
    }
}

module.exports = { startUserSyncConsumer };
