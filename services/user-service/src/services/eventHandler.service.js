const { syncUserFromAuthService, createUserCache, deactivateUserCache, reactivateUserCache, deleteUserCache } = require('./sync.service');
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

        // Handle user deactivation events
        this.handlers.set('user.deactivated', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.deactivated event:', eventData);
                await deactivateUserCache(eventData.userId);
                console.log('✅ [Event Handler] User deactivation processed successfully');
                return { success: true, message: 'User deactivation processed successfully' };
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.deactivated event:', error);
                throw error;
            }
        });

        // Handle user reactivation events
        this.handlers.set('user.reactivated', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.reactivated event:', eventData);
                await reactivateUserCache(eventData.userId);
                console.log('✅ [Event Handler] User reactivation processed successfully');
                return { success: true, message: 'User reactivation processed successfully' };
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.reactivated event:', error);
                throw error;
            }
        });

        // Handle user deletion events
        this.handlers.set('user.deleted', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.deleted event:', eventData);
                await deleteUserCache(eventData.userId);
                console.log('✅ [Event Handler] User deletion processed successfully');

                return { success: true, message: 'User deletion processed successfully' };
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.deleted event:', error);
                throw error;
            }
        });

        // Handle email verification events
        this.handlers.set('user.email_verified', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.email_verified event:', eventData);

                // Update user's email verification status in user service
                const { syncEmailVerification } = require('./sync.service');
                const result = await syncEmailVerification(eventData.userId, {
                    emailVerified: true,
                    emailVerifiedAt: eventData.verifiedAt
                });

                console.log('✅ [Event Handler] Email verification status updated successfully:', result);
                return { success: true, message: 'Email verification status updated successfully' };
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.email_verified event:', error);
                throw error;
            }
        });

        // Handle user verification events (registration completion)
        this.handlers.set('user.verified', async (eventData) => {
            try {
                console.log('🔄 [Event Handler] Processing user.verified event:', eventData);

                // Update user's verification status and email verification in user service
                const { syncEmailVerification } = require('./sync.service');
                const result = await syncEmailVerification(eventData.userId, {
                    emailVerified: true,
                    emailVerifiedAt: eventData.verifiedAt
                });

                console.log('✅ [Event Handler] User verification status updated successfully:', result);
                return { success: true, message: 'User verification status updated successfully' };
            } catch (error) {
                console.error('❌ [Event Handler] Error processing user.verified event:', error);
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

    async handleUserDeactivated(userData) {
        return this.handleEvent(userData, 'user.deactivated');
    }

    async handleUserReactivated(userData) {
        return this.handleEvent(userData, 'user.reactivated');
    }

    async handleUserDeleted(userData) {
        return this.handleEvent(userData, 'user.deleted');
    }

    async handleEmailVerified(userData) {
        return this.handleEvent(userData, 'user.email_verified');
    }

    async handleUserVerified(userData) {
        return this.handleEvent(userData, 'user.verified');
    }
}

module.exports = new EventHandlerService();
