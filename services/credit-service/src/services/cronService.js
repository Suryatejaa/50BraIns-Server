const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const rabbitmqService = require('./rabbitmqService');

class CronService {
    constructor() {
        this.prisma = new PrismaClient();
        this.jobs = [];
    }

    // Start all cron jobs
    start() {
        console.log('Starting Credit Service cron jobs...');

        // Check for expired boosts every minute
        const expiredBoostsJob = cron.schedule('* * * * *', async () => {
            await this.processExpiredBoosts();
        }, {
            scheduled: false,
            timezone: "UTC"
        });

        // Clean up old transactions every day at 2 AM
        const cleanupJob = cron.schedule('0 2 * * *', async () => {
            await this.cleanupOldData();
        }, {
            scheduled: false,
            timezone: "UTC"
        });

        // Generate daily reports every day at 1 AM
        const reportsJob = cron.schedule('0 1 * * *', async () => {
            await this.generateDailyReports();
        }, {
            scheduled: false,
            timezone: "UTC"
        });

        this.jobs = [
            { name: 'expiredBoosts', job: expiredBoostsJob },
            { name: 'cleanup', job: cleanupJob },
            { name: 'reports', job: reportsJob }
        ];

        // Start all jobs
        this.jobs.forEach(({ name, job }) => {
            job.start();
            console.log(`✅ Started cron job: ${name}`);
        });

        console.log(`🕒 Total ${this.jobs.length} cron jobs started`);
    }

    // Stop all cron jobs
    stop() {
        console.log('Stopping all cron jobs...');
        this.jobs.forEach(({ name, job }) => {
            job.stop();
            console.log(`❌ Stopped cron job: ${name}`);
        });
    }

    // Process expired boosts
    async processExpiredBoosts() {
        try {
            const now = new Date();

            // Find expired boosts that are still active
            const expiredBoosts = await this.prisma.boostRecord.findMany({
                where: {
                    isActive: true,
                    endTime: {
                        lte: now
                    }
                },
                include: {
                    wallet: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            if (expiredBoosts.length === 0) {
                return; // No expired boosts
            }

            console.log(`🔍 Found ${expiredBoosts.length} expired boosts`);

            // Process each expired boost
            for (const boost of expiredBoosts) {
                await this.prisma.$transaction(async (tx) => {
                    // Deactivate the boost
                    await tx.boostRecord.update({
                        where: { id: boost.id },
                        data: { isActive: false }
                    });

                    // Create transaction record for boost expiration
                    await tx.creditTransaction.create({
                        data: {
                            walletId: boost.walletId,
                            type: 'BOOST_EXPIRED',
                            amount: 0, // No credits involved
                            balanceBefore: boost.wallet.balance,
                            balanceAfter: boost.wallet.balance,
                            relatedId: boost.targetId,
                            relatedType: boost.targetType,
                            description: `${boost.boostType} boost expired for ${boost.targetType}`,
                            metadata: {
                                boostId: boost.id,
                                originalDuration: boost.duration,
                                actualEndTime: now.toISOString()
                            }
                        }
                    });
                });

                // Publish boost expiration event to RabbitMQ
                try {
                    await rabbitmqService.publishBoostEvent({
                        eventType: 'BOOST_EXPIRED',
                        boostType: boost.boostType,
                        targetId: boost.targetId,
                        targetType: boost.targetType,
                        boostId: boost.id,
                        duration: boost.duration,
                        endTime: boost.endTime,
                        actualEndTime: now.toISOString(),
                        userId: boost.wallet.userId,
                        timestamp: now.toISOString()
                    });

                    console.log(`📤 Published boost expiration event for boost ${boost.id}`);
                } catch (mqError) {
                    console.error(`❌ Failed to publish boost expiration event for boost ${boost.id}:`, mqError);
                }
            }

            console.log(`✅ Processed ${expiredBoosts.length} expired boosts`);

        } catch (error) {
            console.error('❌ Error processing expired boosts:', error);
        }
    }

    // Clean up old data (older than 90 days)
    async cleanupOldData() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90);

            console.log(`🧹 Starting cleanup of data older than ${cutoffDate.toISOString()}`);

            // Clean up old inactive boost records
            const deletedBoosts = await this.prisma.boostRecord.deleteMany({
                where: {
                    isActive: false,
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });

            // Clean up old completed payment records
            const deletedPayments = await this.prisma.paymentRecord.deleteMany({
                where: {
                    status: 'COMPLETED',
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });

            // Clean up old credit transactions (keep for audit purposes, just mark as archived)
            const archivedTransactions = await this.prisma.creditTransaction.updateMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    },
                    metadata: {
                        not: {
                            path: ['archived'],
                            equals: true
                        }
                    }
                },
                data: {
                    metadata: {
                        archived: true,
                        archivedAt: new Date().toISOString()
                    }
                }
            });

            console.log(`✅ Cleanup completed:
            - Deleted ${deletedBoosts.count} old boost records
            - Deleted ${deletedPayments.count} old payment records  
            - Archived ${archivedTransactions.count} old transactions`);

        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    // Generate daily reports
    async generateDailyReports() {
        try {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);

            console.log(`📊 Generating daily report for ${yesterday.toDateString()}`);

            // Get daily statistics
            const [
                totalTransactions,
                totalCreditsEarned,
                totalCreditsSpent,
                totalBoosts,
                activeBoosts,
                totalRevenue
            ] = await Promise.all([
                // Total transactions yesterday
                this.prisma.creditTransaction.count({
                    where: {
                        createdAt: {
                            gte: yesterday,
                            lt: todayStart
                        }
                    }
                }),

                // Total credits earned yesterday
                this.prisma.creditTransaction.aggregate({
                    where: {
                        createdAt: {
                            gte: yesterday,
                            lt: todayStart
                        },
                        amount: { gt: 0 }
                    },
                    _sum: { amount: true }
                }),

                // Total credits spent yesterday
                this.prisma.creditTransaction.aggregate({
                    where: {
                        createdAt: {
                            gte: yesterday,
                            lt: todayStart
                        },
                        amount: { lt: 0 }
                    },
                    _sum: { amount: true }
                }),

                // Total boosts created yesterday
                this.prisma.boostRecord.count({
                    where: {
                        createdAt: {
                            gte: yesterday,
                            lt: todayStart
                        }
                    }
                }),

                // Currently active boosts
                this.prisma.boostRecord.count({
                    where: {
                        isActive: true,
                        endTime: { gt: new Date() }
                    }
                }),

                // Total revenue yesterday
                this.prisma.paymentRecord.aggregate({
                    where: {
                        createdAt: {
                            gte: yesterday,
                            lt: todayStart
                        },
                        status: 'COMPLETED'
                    },
                    _sum: { amount: true }
                })
            ]);

            const report = {
                date: yesterday.toDateString(),
                transactions: {
                    total: totalTransactions,
                    creditsEarned: totalCreditsEarned._sum.amount || 0,
                    creditsSpent: Math.abs(totalCreditsSpent._sum.amount || 0)
                },
                boosts: {
                    created: totalBoosts,
                    currentlyActive: activeBoosts
                },
                revenue: {
                    total: totalRevenue._sum.amount || 0
                },
                timestamp: new Date().toISOString()
            };

            // Log the report
            console.log(`📈 Daily Report for ${report.date}:`, JSON.stringify(report, null, 2));

            // Optionally publish to RabbitMQ for other services
            try {
                await rabbitmqService.publishCreditEvent({
                    eventType: 'DAILY_REPORT',
                    report,
                    timestamp: new Date().toISOString()
                });
            } catch (mqError) {
                console.error('❌ Failed to publish daily report:', mqError);
            }

        } catch (error) {
            console.error('❌ Error generating daily report:', error);
        }
    }
}

module.exports = new CronService();
