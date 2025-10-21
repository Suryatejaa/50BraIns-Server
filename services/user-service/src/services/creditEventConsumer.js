const { PrismaClient } = require('@prisma/client');

class CreditEventConsumer {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async handleMessage(eventData) {
        try {
            console.log('🎯 [User Service] Processing credit event:', eventData);

            switch (eventData.type) {
                case 'profile_boost':
                    await this.handleProfileBoost(eventData);
                    break;
                case 'credit_purchase':
                    await this.handleCreditPurchase(eventData);
                    break;
                case 'credit_spent':
                    await this.handleCreditSpent(eventData);
                    break;
                case 'credit_earned':
                    await this.handleCreditEarned(eventData);
                    break;
                default:
                    console.log(`⚠️ [User Service] Unknown event type: ${eventData.type}`);
            }
        } catch (error) {
            console.error('❌ [User Service] Error handling credit event:', error);
            throw error; // Re-throw to trigger message nack
        }
    }

    async handleProfileBoost(eventData) {
        try {
            const { userId, targetId, amount, duration, eventId, timestamp } = eventData;

            // Calculate expiry time
            const expiresAt = new Date(timestamp);
            expiresAt.setHours(expiresAt.getHours() + duration);

            // Store boost event in user service database
            await this.prisma.userBoostEvent.create({
                data: {
                    userId: targetId, // The user whose profile was boosted
                    boostType: 'profile_boost',
                    boosterId: userId, // Who initiated the boost
                    amount: amount,
                    duration: duration,
                    eventId: eventId,
                    isActive: true,
                    expiresAt: expiresAt
                }
            });

            // Update user visibility/boost status if needed
            await this.updateUserVisibilityScore(targetId, amount);

            console.log(`✅ [User Service] Profile boost recorded for user ${targetId}`);

        } catch (error) {
            console.error('❌ [User Service] Error handling profile boost:', error);
            throw error;
        }
    }

    async handleCreditPurchase(eventData) {
        try {
            const { userId, amount, eventId, description } = eventData;

            // Store credit event
            await this.prisma.userCreditEvent.create({
                data: {
                    userId: userId,
                    eventType: 'credit_purchase',
                    amount: amount,
                    description: description || 'Credits purchased',
                    eventId: eventId,
                    metadata: {
                        originalEvent: eventData
                    }
                }
            });

            console.log(`✅ [User Service] Credit purchase recorded for user ${userId}`);

        } catch (error) {
            console.error('❌ [User Service] Error handling credit purchase:', error);
            throw error;
        }
    }

    async handleCreditSpent(eventData) {
        try {
            const { userId, amount, eventId, description, targetType, targetId } = eventData;

            // Store credit event
            await this.prisma.userCreditEvent.create({
                data: {
                    userId: userId,
                    eventType: 'credit_spent',
                    amount: amount,
                    description: description || 'Credits spent',
                    eventId: eventId,
                    metadata: {
                        targetType: targetType,
                        targetId: targetId,
                        originalEvent: eventData
                    }
                }
            });

            console.log(`✅ [User Service] Credit spending recorded for user ${userId}`);

        } catch (error) {
            console.error('❌ [User Service] Error handling credit spending:', error);
            throw error;
        }
    }

    async handleCreditEarned(eventData) {
        try {
            const { userId, amount, eventId, description, source } = eventData;

            // Store credit event
            await this.prisma.userCreditEvent.create({
                data: {
                    userId: userId,
                    eventType: 'credit_earned',
                    amount: amount,
                    description: description || 'Credits earned',
                    eventId: eventId,
                    metadata: {
                        source: source,
                        originalEvent: eventData
                    }
                }
            });

            console.log(`✅ [User Service] Credit earning recorded for user ${userId}`);

        } catch (error) {
            console.error('❌ [User Service] Error handling credit earning:', error);
            throw error;
        }
    }

    async updateUserVisibilityScore(userId, boostAmount) {
        try {
            // Calculate boost score based on amount spent
            const boostScore = Math.floor(boostAmount / 10); // 1 point per 10 credits

            // Here you can implement your visibility algorithm
            // For now, we'll just log it
            console.log(`📊 [User Service] User ${userId} visibility boosted by ${boostScore} points`);

            // You could update user analytics, ranking, or other metrics here
            // Example:
            // await this.prisma.user.update({
            //     where: { id: userId },
            //     data: {
            //         visibilityScore: { increment: boostScore }
            //     }
            // });

        } catch (error) {
            console.error('❌ [User Service] Error updating user visibility:', error);
        }
    }

    async cleanup() {
        try {
            // Clean up expired boost events
            const expiredBoosts = await this.prisma.userBoostEvent.updateMany({
                where: {
                    isActive: true,
                    expiresAt: {
                        lt: new Date()
                    }
                },
                data: {
                    isActive: false
                }
            });

            if (expiredBoosts.count > 0) {
                console.log(`🧹 [User Service] Deactivated ${expiredBoosts.count} expired boost events`);
            }

        } catch (error) {
            console.error('❌ [User Service] Error during cleanup:', error);
        }
    }
}

module.exports = CreditEventConsumer;
