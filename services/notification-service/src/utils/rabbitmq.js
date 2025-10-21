// services/notification-service/src/utils/rabbitmq.js
const amqp = require('amqplib');
const logger = require('./logger');

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
            // Connect to RabbitMQ
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();

            // Assert all exchanges that other services use
            const exchanges = [
                { name: 'gig_events', type: 'topic' },
                { name: 'brains_events', type: 'topic' },
                { name: '50brains-events', type: 'topic' },
                { name: 'reputation_events', type: 'topic' },
                { name: 'credit_events', type: 'topic' },
                { name: 'notifications', type: 'topic' } // Our own exchange
            ];

            for (const exchange of exchanges) {
                await this.channel.assertExchange(exchange.name, exchange.type, { durable: true });
                logger.info(`📡 Exchange "${exchange.name}" ready`);
            }

            // Create notification queues that bind to actual events from other services
            await this.setupNotificationQueues();

            this.isConnected = true;
            logger.info('✅ [Notification Service] Connected to RabbitMQ');

            // Handle connection events
            this.connection.on('error', (err) => {
                logger.error('❌ [Notification Service] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                logger.info('🔌 [Notification Service] RabbitMQ connection closed');
                this.isConnected = false;
            });

        } catch (error) {
            logger.error('❌ [Notification Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async setupNotificationQueues() {
        // Create notification-specific queues
        const notificationQueues = [
            'notifications.gig.events',
            'notifications.clan.events',
            'notifications.user.events',
            'notifications.reputation.events',
            'notifications.credit.events'
        ];

        for (const queueName of notificationQueues) {
            await this.channel.assertQueue(queueName, {
                durable: true,
                arguments: {
                    'x-message-ttl': 7 * 24 * 60 * 60 * 1000 // 7 days TTL
                }
            });
        }

        // Bind queues to actual events from other services
        await this.bindToActualEvents();
        logger.info('✅ [Notification Service] Notification queues setup complete');
    }

    async bindToActualEvents() {
        // Bind to specific Gig Service events (these are the actual routing keys Gig Service publishes)
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_created');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_updated');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_deleted');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_published');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_closed');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'application_submitted');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'application_accepted');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'application_rejected');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_assigned');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_boosted');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_gig_approved');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_milestone_created');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_task_assigned');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_gig_approved_member_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_milestone_created_member_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_milestone_approved_member_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_task_assigned_member_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_task_status_updated_member_notification');

        // NEW: Bind to work submission and application notification events
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'work_submitted');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'work_submitted_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'submission_reviewed');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'submission_reviewed_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'application_confirmed');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'new_application_received');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'application_withdrawn');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'application_withdrawn_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'application_approved_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'work_submission_confirmed');

        // NEW: Bind to invitation events
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_invitation_sent');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_invitation_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_invitation_accepted');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_invitation_accepted_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_invitation_rejected');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'gig_invitation_rejected_notification');
        await this.channel.bindQueue('notifications.gig.events', 'gig_events', 'clan_gig_invitation_accepted_member_notification');

        // Note: Removed generic 'gig.event' binding to prevent duplicate processing
        // All events now use specific routing keys (application_submitted, application_confirmed, etc.)

        // Bind to specific Clan Service events
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.created');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.member.joined');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.member.left');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.join.request');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.join.request.approved');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.join.request.rejected');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.member.role.updated');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.member.removed');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.admin.added');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.admin.removed');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.ownership.transferred');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.message.sent');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.reputation.updated');
        await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.updated');

        // Bind to specific User/Auth Service events
        await this.channel.bindQueue('notifications.user.events', 'brains_events', 'user.registered');
        await this.channel.bindQueue('notifications.user.events', 'brains_events', 'user.login');
        await this.channel.bindQueue('notifications.user.events', 'brains_events', 'user.password_reset');

        // Bind to Reputation Service events
        await this.channel.bindQueue('notifications.reputation.events', 'reputation_events', 'gig.completed');
        await this.channel.bindQueue('notifications.reputation.events', 'reputation_events', 'user.tier.changed');

        // Bind to Credit Service events
        await this.channel.bindQueue('notifications.credit.events', 'credit_events', 'boost_event');
        await this.channel.bindQueue('notifications.credit.events', 'credit_events', 'credit_event');

        logger.info('✅ [Notification Service] Event bindings established');
    }

    async startConsumers() {
        if (!this.isConnected) {
            throw new Error('Not connected to RabbitMQ');
        }



        // Start consuming from all notification queues
        const queues = [
            'notifications.user.events',
            'notifications.clan.events',
            'notifications.gig.events',
            'notifications.credit.events',
            'notifications.reputation.events'
        ];

        for (const queueName of queues) {

            await this.channel.consume(queueName, async (message) => {
                if (message) {
                    try {
                        const content = JSON.parse(message.content.toString());
                        const routingKey = message.fields.routingKey;

                        console.log('📨 [Notification Service] Received event:', {
                            routingKey: routingKey,
                            eventData: content,
                            timestamp: new Date().toISOString()
                        });

                        logger.info(`📨 [Notification Service] Received event: ${routingKey}`, content);

                        // Process the notification based on routing key
                        await this.processNotificationEvent(routingKey, content);

                        this.channel.ack(message);
                        console.log('✅ [Notification Service] Successfully processed event:', routingKey);
                        logger.info(`✅ [Notification Service] Processed event: ${routingKey}`);

                    } catch (error) {
                        console.error('❌ [Notification Service] Error processing message:', error);
                        logger.error('❌ [Notification Service] Error processing message:', error);
                        this.channel.nack(message, false, false); // Don't requeue failed messages
                    }
                }
            });
        }

        logger.info('🎧 [Notification Service] All consumers started');
    }

    async processNotificationEvent(routingKey, eventData) {
        const { NotificationConsumer } = require('../consumers/notificationConsumer');
        const consumer = new NotificationConsumer();

        // Debug logging to see what routing key is being processed
        console.log(`🔍 [Notification Service] Processing event with routing key: "${routingKey}"`);
        console.log(`🔍 [Notification Service] Event data eventType: "${eventData.eventType}"`);

        // Note: Removed generic gig.event handling to prevent duplicate processing
        // All events now use specific routing keys directly

        // Map actual events to notification handlers
        switch (routingKey) {
            // User Events - direct routing keys
            case 'user.registered':
                await consumer.handleUserRegistered(eventData);
                break;
            case 'user.login':
                await consumer.handleUserLogin(eventData);
                break;
            case 'user.password_reset':
                await consumer.handlePasswordReset(eventData);
                break;

            // Clan Events - direct routing keys
            case 'clan.created':
                await consumer.handleClanCreated(eventData);
                break;
            case 'clan.member.joined':
                await consumer.handleClanJoined(eventData);
                break;
            case 'clan.member.left':
                await consumer.handleClanLeft(eventData);
                break;
            case 'clan.join.request':
                await consumer.handleClanJoinRequest(eventData);
                break;
            case 'clan.join.request.approved':
                await consumer.handleClanJoinRequestApproved(eventData);
                break;
            case 'clan.join.request.rejected':
                await consumer.handleClanJoinRequestRejected(eventData);
                break;
            case 'clan.member.role.updated':
                await consumer.handleClanMemberRoleUpdated(eventData);
                break;
            case 'clan.member.removed':
                await consumer.handleClanMemberRemoved(eventData);
                break;
            case 'clan.admin.added':
                await consumer.handleClanAdminAdded(eventData);
                break;
            case 'clan.admin.removed':
                await consumer.handleClanAdminRemoved(eventData);
                break;
            case 'clan.ownership.transferred':
                await consumer.handleClanOwnershipTransferred(eventData);
                break;
            case 'clan.message.sent':
                await consumer.handleClanMessageSent(eventData);
                break;
            case 'clan.reputation.updated':
                await consumer.handleClanReputationUpdated(eventData);
                break;
            case 'clan.updated':
                await consumer.handleClanUpdated(eventData);
                break;

            // Gig Events - direct routing keys
            case 'gig_created':
                await consumer.handleGigCreated(eventData);
                break;
            case 'gig_updated':
                await consumer.handleGigUpdated(eventData);
                break;
            case 'gig_deleted':
                await consumer.handleGigDeleted(eventData);
                break;
            case 'gig_published':
                await consumer.handleGigPublished(eventData);
                break;
            case 'gig_closed':
                await consumer.handleGigClosed(eventData);
                break;
            case 'application_submitted':
                await consumer.handleGigApplied(eventData);
                break;
            case 'application_accepted':
                await consumer.handleGigApplicationAccepted(eventData);
                break;
            case 'application_rejected':
                await consumer.handleGigApplicationRejected(eventData);
                break;
            case 'gig_assigned':
                await consumer.handleGigAssigned(eventData);
                break;
            case 'gig_boosted':
                await consumer.handleGigBoosted(eventData);
                break;
            case 'gig_milestone_created':
                await consumer.handleGigMilestoneCreated(eventData);
                break;
            case 'gig_task_created':
                await consumer.handleGigTaskCreated(eventData);
                break;
            case 'gig_task_updated':
                await consumer.handleGigTaskUpdated(eventData);
                break;

            // Credit Events - direct routing keys
            case 'boost_event':
                await consumer.handleBoostEvent(eventData);
                break;
            case 'credit_event':
                await consumer.handleCreditEvent(eventData);
                break;

            // Reputation Events - direct routing keys
            case 'reputation_updated':
                await consumer.handleReputationUpdated(eventData);
                break;
            case 'user.tier.changed':
                await consumer.handleReputationUpdated(eventData);
                break;



            // Clan Gig Events - direct routing keys from gig service
            case 'clan_gig_approved_member_notification':
                await consumer.handleClanGigApprovedMemberNotification(eventData);
                break;
            case 'clan_gig_approved':
                await consumer.handleClanGigApproved(eventData);
                break;
            case 'clan_milestone_created_member_notification':
                await consumer.handleClanMilestoneCreatedMemberNotification(eventData);
                break;
            case 'clan_milestone_approved_member_notification':
                await consumer.handleClanMilestoneApprovedMemberNotification(eventData);
                break;
            case 'clan_task_assigned_member_notification':
                await consumer.handleClanTaskAssignedMemberNotification(eventData);
                break;
            case 'clan_task_status_updated_member_notification':
                await consumer.handleClanTaskStatusUpdatedMemberNotification(eventData);
                break;

            // NEW: Work submission and application notification events
            case 'work_submitted':
                await consumer.handleWorkSubmitted(eventData);
                break;
            case 'work_submitted_notification':
                await consumer.handleWorkSubmittedNotification(eventData);
                break;
            case 'submission_reviewed':
                await consumer.handleSubmissionReviewed(eventData);
                break;
            case 'submission_reviewed_notification':
                await consumer.handleSubmissionReviewedNotification(eventData);
                break;
            case 'application_confirmed':
                await consumer.handleApplicationConfirmed(eventData);
                break;
            case 'new_application_received':
                await consumer.handleNewApplicationReceived(eventData);
                break;
            case 'application_withdrawn':
                await consumer.handleApplicationWithdrawn(eventData);
                break;
            case 'application_withdrawn_notification':
                await consumer.handleApplicationWithdrawnNotification(eventData);
                break;
            case 'application_approved_notification':
                await consumer.handleApplicationApprovedNotification(eventData);
                break;
            case 'work_submission_confirmed':
                await consumer.handleWorkSubmissionConfirmed(eventData);
                break;

            // NEW: Invitation Events
            case 'gig_invitation_sent':
                await consumer.handleGigInvitationSent(eventData);
                break;
            case 'gig_invitation_notification':
                await consumer.handleGigInvitationNotification(eventData);
                break;
            case 'gig_invitation_accepted':
                await consumer.handleGigInvitationAccepted(eventData);
                break;
            case 'gig_invitation_accepted_notification':
                await consumer.handleGigInvitationAcceptedNotification(eventData);
                break;
            case 'gig_invitation_rejected':
                await consumer.handleGigInvitationRejected(eventData);
                break;
            case 'gig_invitation_rejected_notification':
                await consumer.handleGigInvitationRejectedNotification(eventData);
                break;
            case 'clan_gig_invitation_accepted_member_notification':
                await consumer.handleClanGigInvitationAcceptedMemberNotification(eventData);
                break;

            default:
                console.log(`⚠️ [Notification Service] Unhandled event: ${routingKey}`);
        }
    }

    async publishNotification(routingKey, message, options = {}) {
        if (!this.isConnected) {
            logger.warn('⚠️ [Notification Service] Not connected to RabbitMQ');
            return false;
        }

        try {
            const messageBuffer = Buffer.from(JSON.stringify(message));
            await this.channel.publish(
                'notifications',
                routingKey,
                messageBuffer,
                {
                    persistent: true,
                    timestamp: Date.now(),
                    ...options
                }
            );

            logger.info(`📤 [Notification Service] Published notification: ${routingKey}`);
            return true;
        } catch (error) {
            logger.error('❌ [Notification Service] Failed to publish notification:', error);
            return false;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.close();
            this.isConnected = false;
            logger.info('🔌 [Notification Service] Disconnected from RabbitMQ');
        }
    }
}

module.exports = new RabbitMQService();