const { syncUserFromAuthService, createUserCache } = require('./sync.service');
const logger = require('../utils/logger');

class EventHandlerService {
    constructor() {
        this.handlers = new Map();
        this.setupHandlers();
    }

    setupHandlers() {
        // Handle user registration events
        this.handlers.set('user.registered', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.registered event:', eventData);
                
                // Create user cache/profile
                const result = await createUserCache(eventData);
                console.log('✅ [Event Handler] User profile created successfully:', result);
                
                return result;
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.registered event:', error);
                throw error;
            }
        });

        // Handle user update events
        this.handlers.set('user.updated', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.updated event:', eventData);
                
                // Sync updated user data
                const result = await syncUserFromAuthService(eventData);
                console.log('✅ [Event Handler] User profile updated successfully:', result);
                
                return result;
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.updated event:', error);
                throw error;
            }
        });

        // Handle user deletion events
        this.handlers.set('user.deleted', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.deleted event:', eventData);
                
                // TODO: Implement user deletion logic
                console.log('⚠️ [Event Handler] User deletion not yet implemented');
                
                return { success: true, message: 'User deletion not yet implemented' };
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.deleted event:', error);
                throw error;
            }
        });
    }

    async handleEvent(eventData, routingKey) {
        try {
            console.log(`🎯 [Event Handler] Handling event: ${routingKey}`);
            
            const handler = this.handlers.get(routingKey);
            if (!handler) {
                console.warn(`⚠️ [Event Handler] No handler found for routing key: ${routingKey}`);
                return { success: false, message: `No handler for ${routingKey}` };
            }

            const result = await handler(eventData);
            return { success: true, result };
            
        } catch (error) {
            console.error(`❌ [Event Handler] Error handling event ${routingKey}:`, error);
            return { success: false, error: error.message };
        }
    }

    async handleUserRegistered(userData) {
        return this.handleEvent(userData, 'user.registered');
    }

    async handleUserUpdated(userData) {
        return this.handleEvent(userData, 'user.updated');
    }

    async handleUserDeleted(userData) {
        return this.handleEvent(userData, 'user.deleted');
    }
}

module.exports = new EventHandlerService();
