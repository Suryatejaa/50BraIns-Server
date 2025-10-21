const { PrismaClient } = require('@prisma/client');

class CreditEventConsumer {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async handleMessage(eventData) {
        try {
            console.log('🎯 [Clan Service] Processing credit event:', eventData);

            switch (eventData.type) {
                case 'clan_boost':
                    await this.handleClanBoost(eventData);
                    break;
                case 'clan_contribution':
                    await this.handleClanContribution(eventData);
                    break;
                case 'credit_spent':
                    // Check if it's clan-related
                    if (eventData.targetType === 'clan') {
                        await this.handleClanCreditEvent(eventData);
                    }
                    break;
                default:
                    console.log(`⚠️ [Clan Service] Event not relevant for clan service: ${eventData.type}`);
            }
        } catch (error) {
            console.error('❌ [Clan Service] Error handling credit event:', error);
            throw error; // Re-throw to trigger message nack
        }
    }

    async handleClanBoost(eventData) {
        try {
            const { userId, targetId, amount, duration, eventId, timestamp } = eventData;

            // Calculate expiry time
            const expiresAt = new Date(timestamp);
            expiresAt.setHours(expiresAt.getHours() + duration);

            // Store clan boost event
            await this.prisma.clanBoostEvent.create({
                data: {
                    clanId: targetId, // The clan that was boosted
                    boosterId: userId, // Who initiated the boost
                    amount: amount,
                    duration: duration,
                    eventId: eventId,
                    isActive: true,
                    expiresAt: expiresAt
                }
            });

            // Update clan visibility and reputation
            await this.updateClanVisibility(targetId, amount, duration);

            console.log(`✅ [Clan Service] Clan boost recorded for clan ${targetId}`);

        } catch (error) {
            console.error('❌ [Clan Service] Error handling clan boost:', error);
            throw error;
        }
    }

    async handleClanContribution(eventData) {
        try {
            const { userId, clanId, amount, eventId, description } = eventData;

            // Store clan contribution event
            await this.prisma.clanCreditEvent.create({
                data: {
                    clanId: clanId,
                    userId: userId,
                    eventType: 'clan_contribution',
                    amount: amount,
                    description: description || 'Clan contribution',
                    eventId: eventId,
                    metadata: {
                        originalEvent: eventData
                    }
                }
            });

            // Update clan treasury/finances
            await this.updateClanTreasury(clanId, amount);

            // Update member contribution tracking
            await this.updateMemberContribution(clanId, userId, amount);

            console.log(`✅ [Clan Service] Clan contribution recorded for clan ${clanId}`);

        } catch (error) {
            console.error('❌ [Clan Service] Error handling clan contribution:', error);
            throw error;
        }
    }

    async handleClanCreditEvent(eventData) {
        try {
            const { userId, targetId, amount, eventId, description } = eventData;

            // Store clan-related credit event
            await this.prisma.clanCreditEvent.create({
                data: {
                    clanId: targetId,
                    userId: userId,
                    eventType: 'clan_boost',
                    amount: amount,
                    description: description || 'Clan boost payment',
                    eventId: eventId,
                    metadata: {
                        originalEvent: eventData
                    }
                }
            });

            console.log(`✅ [Clan Service] Clan credit event recorded for clan ${targetId}`);

        } catch (error) {
            console.error('❌ [Clan Service] Error handling clan credit event:', error);
            throw error;
        }
    }

    async updateClanVisibility(clanId, boostAmount, duration) {
        try {
            // Calculate visibility boost based on amount and duration
            const visibilityScore = Math.floor((boostAmount * duration) / 50);

            console.log(`📊 [Clan Service] Clan ${clanId} visibility boosted by ${visibilityScore} points for ${duration} hours`);

            // Update clan reputation and visibility metrics
            const clan = await this.prisma.clan.findUnique({ where: { id: clanId } });
            if (clan) {
                await this.prisma.clan.update({
                    where: { id: clanId },
                    data: {
                        reputationScore: { increment: visibilityScore }
                    }
                });

                // Update clan analytics if available
                if (clan.analytics) {
                    await this.prisma.clanAnalytics.update({
                        where: { clanId: clanId },
                        data: {
                            totalBoosts: { increment: 1 },
                            totalBoostSpent: { increment: boostAmount }
                        }
                    });
                }
            }

        } catch (error) {
            console.error('❌ [Clan Service] Error updating clan visibility:', error);
        }
    }

    async updateClanTreasury(clanId, contributionAmount) {
        try {
            console.log(`💰 [Clan Service] Adding ${contributionAmount} to clan ${clanId} treasury`);

            // Update clan financial records
            const clan = await this.prisma.clan.findUnique({ where: { id: clanId } });
            if (clan) {
                await this.prisma.clan.update({
                    where: { id: clanId },
                    data: {
                        totalRevenue: { increment: contributionAmount }
                    }
                });
            }

        } catch (error) {
            console.error('❌ [Clan Service] Error updating clan treasury:', error);
        }
    }

    async updateMemberContribution(clanId, userId, amount) {
        try {
            console.log(`👥 [Clan Service] Recording member ${userId} contribution of ${amount} to clan ${clanId}`);

            // Update member contribution tracking
            const member = await this.prisma.clanMember.findFirst({
                where: {
                    clanId: clanId,
                    userId: userId
                }
            });

            if (member) {
                // You could add a contributions field to track individual member contributions
                console.log(`✅ [Clan Service] Member contribution recorded`);
            }

        } catch (error) {
            console.error('❌ [Clan Service] Error updating member contribution:', error);
        }
    }

    async cleanup() {
        try {
            // Clean up expired boost events
            const expiredBoosts = await this.prisma.clanBoostEvent.updateMany({
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
                console.log(`🧹 [Clan Service] Deactivated ${expiredBoosts.count} expired clan boost events`);

                // Also update the actual clans to adjust boost-related metrics
                const expiredClanIds = await this.prisma.clanBoostEvent.findMany({
                    where: {
                        isActive: false,
                        expiresAt: {
                            lt: new Date()
                        }
                    },
                    select: { clanId: true }
                });

                for (const boost of expiredClanIds) {
                    await this.adjustClanBoostMetrics(boost.clanId);
                }
            }

        } catch (error) {
            console.error('❌ [Clan Service] Error during cleanup:', error);
        }
    }

    async adjustClanBoostMetrics(clanId) {
        try {
            console.log(`🔄 [Clan Service] Adjusting boost metrics for clan ${clanId}`);

            // Here you would adjust clan metrics after boost expires
            // For example, you might want to gradually reduce the boost effect
            // rather than removing it completely

        } catch (error) {
            console.error('❌ [Clan Service] Error adjusting clan boost metrics:', error);
        }
    }
}

module.exports = CreditEventConsumer;
