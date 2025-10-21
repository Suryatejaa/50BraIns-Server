const { PrismaClient } = require('@prisma/client');

class CreditEventConsumer {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async handleMessage(eventData) {
        try {
            console.log('🎯 [Gig Service] Processing credit event:', eventData);

            switch (eventData.type) {
                case 'gig_boost':
                    await this.handleGigBoost(eventData);
                    break;
                case 'credit_spent':
                    // Check if it's gig-related
                    if (eventData.targetType === 'gig') {
                        await this.handleGigCreditEvent(eventData);
                    }
                    break;
                case 'gig_payment':
                    await this.handleGigPayment(eventData);
                    break;
                default:
                    console.log(`⚠️ [Gig Service] Event not relevant for gig service: ${eventData.type}`);
            }
        } catch (error) {
            console.error('❌ [Gig Service] Error handling credit event:', error);
            throw error; // Re-throw to trigger message nack
        }
    }

    async handleGigBoost(eventData) {
        try {
            const { userId, targetId, amount, duration, eventId, timestamp } = eventData;

            // Calculate expiry time
            const expiresAt = new Date(timestamp);
            expiresAt.setHours(expiresAt.getHours() + duration);

            // Store gig boost event
            await this.prisma.gigBoostEvent.create({
                data: {
                    gigId: targetId, // The gig that was boosted
                    boosterId: userId, // Who initiated the boost
                    amount: amount,
                    duration: duration,
                    eventId: eventId,
                    isActive: true,
                    expiresAt: expiresAt
                }
            });

            // Update gig boost status and priority
            await this.updateGigPriority(targetId, amount, duration);

            console.log(`✅ [Gig Service] Gig boost recorded for gig ${targetId}`);

        } catch (error) {
            console.error('❌ [Gig Service] Error handling gig boost:', error);
            throw error;
        }
    }

    async handleGigCreditEvent(eventData) {
        try {
            const { userId, targetId, amount, eventId, description } = eventData;

            // Store gig-related credit event
            await this.prisma.gigCreditEvent.create({
                data: {
                    gigId: targetId,
                    userId: userId,
                    eventType: 'gig_boost',
                    amount: amount,
                    description: description || 'Gig boost payment',
                    eventId: eventId,
                    metadata: {
                        originalEvent: eventData
                    }
                }
            });

            console.log(`✅ [Gig Service] Gig credit event recorded for gig ${targetId}`);

        } catch (error) {
            console.error('❌ [Gig Service] Error handling gig credit event:', error);
            throw error;
        }
    }

    async handleGigPayment(eventData) {
        try {
            const { userId, gigId, amount, eventId, description } = eventData;

            // Store gig payment event
            await this.prisma.gigCreditEvent.create({
                data: {
                    gigId: gigId,
                    userId: userId,
                    eventType: 'gig_payment',
                    amount: amount,
                    description: description || 'Gig payment received',
                    eventId: eventId,
                    metadata: {
                        originalEvent: eventData
                    }
                }
            });

            console.log(`✅ [Gig Service] Gig payment recorded for gig ${gigId}`);

        } catch (error) {
            console.error('❌ [Gig Service] Error handling gig payment:', error);
            throw error;
        }
    }

    async updateGigPriority(gigId, boostAmount, duration) {
        try {
            // Calculate priority boost based on amount and duration
            const priorityScore = Math.floor((boostAmount * duration) / 100);

            console.log(`📊 [Gig Service] Gig ${gigId} priority boosted by ${priorityScore} points for ${duration} hours`);

            // Here you can implement your gig ranking algorithm
            // For example, you might want to:
            // 1. Update a priority score in the gig record
            // 2. Add the gig to a "featured" list
            // 3. Increase its visibility in search results

            // Example implementation:
            // const gig = await this.prisma.gig.findUnique({ where: { id: gigId } });
            // if (gig) {
            //     await this.prisma.gig.update({
            //         where: { id: gigId },
            //         data: {
            //             priorityScore: { increment: priorityScore },
            //             isBoosted: true,
            //             boostedUntil: new Date(Date.now() + duration * 60 * 60 * 1000)
            //         }
            //     });
            // }

        } catch (error) {
            console.error('❌ [Gig Service] Error updating gig priority:', error);
        }
    }

    async cleanup() {
        try {
            // Clean up expired boost events
            const expiredBoosts = await this.prisma.gigBoostEvent.updateMany({
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
                console.log(`🧹 [Gig Service] Deactivated ${expiredBoosts.count} expired gig boost events`);

                // Also update the actual gigs to remove boost status
                const expiredGigIds = await this.prisma.gigBoostEvent.findMany({
                    where: {
                        isActive: false,
                        expiresAt: {
                            lt: new Date()
                        }
                    },
                    select: { gigId: true }
                });

                for (const boost of expiredGigIds) {
                    await this.removeGigBoostStatus(boost.gigId);
                }
            }

        } catch (error) {
            console.error('❌ [Gig Service] Error during cleanup:', error);
        }
    }

    async removeGigBoostStatus(gigId) {
        try {
            console.log(`🔄 [Gig Service] Removing boost status from gig ${gigId}`);

            // Here you would reset the gig's boost-related fields
            // Example:
            // await this.prisma.gig.update({
            //     where: { id: gigId },
            //     data: {
            //         isBoosted: false,
            //         boostedUntil: null,
            //         priorityScore: 0
            //     }
            // });

        } catch (error) {
            console.error('❌ [Gig Service] Error removing gig boost status:', error);
        }
    }
}

module.exports = CreditEventConsumer;
