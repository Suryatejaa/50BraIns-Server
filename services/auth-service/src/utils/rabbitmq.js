const amqp = require('amqplib');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.exchangeName = process.env.RABBITMQ_EXCHANGE || 'brains_events';
        // Use admin credentials from environment
        this.url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
    }

    async connect() {
        try {
            console.log('🐰 [Auth Service] Connecting to RabbitMQ...');

            // Add connection timeout
            const connectPromise = amqp.connect(this.url);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('RabbitMQ connection timeout')), 5000)
            );

            // Create connection with timeout
            this.connection = await Promise.race([connectPromise, timeoutPromise]);
            console.log('✅ [Auth Service] RabbitMQ connection established');

            // Create channel
            this.channel = await this.connection.createChannel();
            console.log('✅ [Auth Service] RabbitMQ channel created');

            // Setup exchange
            await this.channel.assertExchange(this.exchangeName, 'topic', {
                durable: true
            });
            console.log(`✅ [Auth Service] Exchange '${this.exchangeName}' asserted`);

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ [Auth Service] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [Auth Service] RabbitMQ connection closed');
                this.isConnected = false;
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    this.connect();
                }, 5000);
            });

            return true; // Return success

        } catch (error) {
            console.error('❌ [Auth Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;

            // Don't attempt to reconnect in development if RabbitMQ is not available
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ [Auth Service] Running in development mode without RabbitMQ');
                return false; // Return failure but don't throw
            }

            // Attempt to reconnect after 5 seconds in production
            setTimeout(() => {
                this.connect();
            }, 5000);

            return false; // Return failure
        }
    }

    async publishEvent(routingKey, eventData) {
        try {
            if (!this.isConnected) {
                console.warn('⚠️ [Auth Service] Not connected to RabbitMQ, skipping event publish');
                return;
            }

            const baseEvent = {
                ...eventData,
                eventType: routingKey, // Include the specific event type
                timestamp: new Date().toISOString(),
                eventId: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'auth-service'
            };

            const message = JSON.stringify(baseEvent);
            await this.channel.publish(this.exchangeName, routingKey, Buffer.from(message));
            console.log(`📤 [Auth Service] Published event to ${this.exchangeName}.${routingKey}:`, baseEvent.eventId);

        } catch (error) {
            console.error('❌ [Auth Service] Error publishing event:', error);
            // Don't throw error in development mode to prevent login failures
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ [Auth Service] Event publish failed but continuing in development mode');
                return;
            }
            throw error;
        }
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            console.log('🔌 [Auth Service] RabbitMQ connection closed');
        } catch (error) {
            console.error('❌ [Auth Service] Error closing RabbitMQ connection:', error);
        }
    }
}

// Export singleton instance
module.exports = new RabbitMQService();
