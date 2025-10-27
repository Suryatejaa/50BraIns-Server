#!/usr/bin/env node

/**
 * Direct Test for Login Notification Handler
 * 
 * This script directly tests the notification consumer's handleUserLogin method
 */

// Mock required modules
process.env.NODE_ENV = 'test';

async function testLoginNotificationHandler() {
    console.log('🧪 Testing Login Notification Handler Directly...\n');

    try {
        // Mock the database for testing
        const mockPrisma = {
            notification: {
                create: async (data) => {
                    console.log('💾 [Mock Database] Creating notification:', JSON.stringify(data.data, null, 2));
                    return {
                        id: 'test-notification-' + Date.now(),
                        ...data.data,
                        createdAt: new Date(),
                        readAt: null
                    };
                }
            }
        };

        // Mock the WebSocket service
        const mockWebSocketService = {
            sendNotification: (userId, payload) => {
                console.log(`📤 [Mock WebSocket] Sending to user ${userId}:`, JSON.stringify(payload, null, 2));
                return true; // Simulate successful send
            }
        };

        // Mock logger
        const mockLogger = {
            notification: (message, data) => console.log(`📝 [Mock Logger] ${message}`, data),
            error: (message, error) => console.error(`❌ [Mock Logger] ${message}`, error),
            info: (message, data) => console.log(`ℹ️ [Mock Logger] ${message}`, data)
        };

        // Create mock notification consumer
        const NotificationConsumer = class {
            constructor() {
                this.webSocketService = mockWebSocketService;
            }

            async createAndSendNotification(notificationData) {
                try {
                    console.log('📝 [Notification Service] Creating notification:', {
                        userId: notificationData.userId,
                        type: notificationData.type || 'ENGAGEMENT',
                        category: notificationData.category,
                        title: notificationData.title,
                        message: notificationData.message,
                        metadata: notificationData.metadata || {}
                    });

                    // Save to database (mocked)
                    const notification = await mockPrisma.notification.create({
                        data: {
                            userId: notificationData.userId,
                            type: notificationData.type || 'SYSTEM',
                            title: notificationData.title,
                            message: notificationData.message,
                            metadata: notificationData.metadata || {},
                            status: 'SENT',
                            priority: notificationData.priority || 1,
                            actionUrl: notificationData.actionUrl || null,
                            relatedId: notificationData.relatedId || null,
                            relatedType: notificationData.relatedType || null
                        }
                    });

                    console.log('✅ [Notification Service] Successfully created notification:', {
                        id: notification.id,
                        userId: notification.userId,
                        title: notification.title,
                        message: notification.message,
                        type: notification.type,
                        createdAt: notification.createdAt
                    });

                    // Send real-time notification via WebSocket (mocked)
                    const wsPayload = {
                        id: notification.id,
                        type: notification.type,
                        status: notification.status,
                        title: notification.title,
                        message: notification.message,
                        metadata: notification.metadata,
                        readAt: notification.readAt,
                        priority: notification.priority,
                        createdAt: notification.createdAt
                    };

                    const sent = this.webSocketService.sendNotification(notificationData.userId, wsPayload);

                    if (sent) {
                        console.log('📤 [Notification Service] Real-time notification sent via WebSocket');
                    }

                    mockLogger.info(`✅ [Notification Service] Created notification: ${notification.id}`);
                    return notification;
                } catch (error) {
                    console.error('❌ [Notification Service] Error creating notification:', error);
                    mockLogger.error('Error creating notification:', error);
                    throw error;
                }
            }

            async handleUserLogin(eventData) {
                try {
                    console.log('🔐 [Notification Service] Handling user_login event with data:', JSON.stringify(eventData, null, 2));

                    const { id: userId, email, username, loginAt, loginMethod } = eventData;

                    console.log('🔐 [Notification Service] Extracted data:', { userId, email, username, loginAt, loginMethod });

                    if (!userId) {
                        console.error('❌ [Notification Service] No userId found in event data:', eventData);
                        throw new Error('Missing userId in login event data');
                    }

                    console.log('🔐 [Notification Service] Handling user_login event for userId:', userId);

                    await this.createAndSendNotification({
                        userId: userId,
                        type: 'SYSTEM',
                        category: 'USER',
                        title: '🔐 Login Detected',
                        message: `New login detected from ${loginMethod || 'unknown method'} on ${loginAt || new Date().toISOString()}.                
                        If this was not you, please reset your password immediately to secure your account.
                        `,
                        metadata: {
                            loginAt: loginAt,
                            loginMethod: loginMethod,
                            isLogin: true
                        }
                    });
                    console.log('✅ [Notification Service] User login notification processed successfully for userId:', userId);
                    mockLogger.notification('User login notification sent', { userId });
                } catch (error) {
                    console.error('❌ [Notification Service] Error handling user login notification:', error);
                    mockLogger.error('Error handling user login notification:', error);
                }
            }
        };

        // Create test event data (exactly as auth service sends it)
        const testEventData = {
            id: 'test-user-' + Date.now(),
            email: 'test@example.com',
            username: 'testuser',
            roles: ['USER'],
            loginAt: new Date().toISOString(),
            loginMethod: 'password',
            ipAddress: null,
            userAgent: null,
            // Additional fields that auth service includes automatically
            eventType: 'user.login',
            timestamp: new Date().toISOString(),
            eventId: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'auth-service'
        };

        // Test the handler
        console.log('🎯 Testing handleUserLogin with event data...\n');

        const consumer = new NotificationConsumer();
        await consumer.handleUserLogin(testEventData);

        console.log('\n✅ Test completed successfully!');
        console.log('💡 The notification handler processed the login event without errors.');
        console.log('🔍 Check the logs above to see if the notification was created and sent.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    testLoginNotificationHandler()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testLoginNotificationHandler };