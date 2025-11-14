// services/gig-service/src/services/railwayCronScheduler.js
const cron = require('node-cron');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

class RailwayCronScheduler {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
        this.instanceId = process.env.RAILWAY_REPLICA_ID || `instance-${Date.now()}`;
        this.isMainInstance = true; // Will be determined dynamically
    }

    async start() {
        if (this.isRunning) {
            logger.info('⚠️ Railway Cron scheduler already running');
            return;
        }

        try {
            // Determine if this is the main instance (leader election)
            await this.electLeader();

            if (!this.isMainInstance) {
                logger.info(`📍 Instance ${this.instanceId} is not the leader. Cron jobs disabled.`);
                return;
            }

            logger.info(`👑 Instance ${this.instanceId} elected as leader. Starting cron jobs...`);

            // Schedule daily payout processing at 2:00 AM IST
            const dailyPayoutJob = cron.schedule('0 2 * * *', async () => {
                await this.executeWithLeaderCheck('dailyPayouts', this.processDailyPayouts.bind(this));
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Schedule leader heartbeat every 30 seconds
            const heartbeatJob = cron.schedule('*/30 * * * * *', async () => {
                await this.maintainLeadership();
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Schedule pending payout check every hour (for monitoring)
            const pendingCheckJob = cron.schedule('0 * * * *', async () => {
                await this.executeWithLeaderCheck('pendingCheck', this.checkPendingPayouts.bind(this));
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Schedule submission reminder job - runs every 4 hours to check for 24h+ unreviewed submissions
            const submissionReminderJob = cron.schedule('0 */4 * * *', async () => {
                await this.executeWithLeaderCheck('submissionReminder', this.sendSubmissionReminders.bind(this));
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Schedule auto-approval job - runs every 6 hours to check for 48h+ unreviewed submissions
            const autoApprovalJob = cron.schedule('0 */6 * * *', async () => {
                await this.executeWithLeaderCheck('autoApproval', this.processAutoApprovals.bind(this));
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Store jobs for management
            this.jobs.set('dailyPayouts', dailyPayoutJob);
            this.jobs.set('heartbeat', heartbeatJob);
            this.jobs.set('pendingCheck', pendingCheckJob);
            this.jobs.set('submissionReminder', submissionReminderJob);
            this.jobs.set('autoApproval', autoApprovalJob);

            // Start all jobs
            dailyPayoutJob.start();
            heartbeatJob.start();
            pendingCheckJob.start();
            submissionReminderJob.start();
            autoApprovalJob.start();

            this.isRunning = true;

            logger.info('✅ Railway Cron scheduler started successfully');
            console.log('✅ [Railway Cron] Started with leader election:', {
                instanceId: this.instanceId,
                isLeader: this.isMainInstance,
                jobs: ['dailyPayouts (2:00 AM)', 'heartbeat (30s)', 'pendingCheck (1h)']
            });

        } catch (error) {
            logger.error('❌ Failed to start Railway cron scheduler:', error);
            console.error('❌ [Railway Cron] Failed to start:', error);
        }
    }

    async electLeader() {
        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            // Try to become leader by creating or updating leader record (PostgreSQL UPSERT)
            const result = await prisma.$executeRaw`
                INSERT INTO cron_leader (id, instance_id, last_heartbeat, created_at, updated_at)
                VALUES ('singleton', ${this.instanceId}, ${now}, ${now}, ${now})
                ON CONFLICT (id) DO UPDATE SET 
                    instance_id = CASE 
                        WHEN cron_leader.last_heartbeat < ${fiveMinutesAgo} THEN ${this.instanceId}
                        ELSE cron_leader.instance_id 
                    END,
                    last_heartbeat = CASE 
                        WHEN cron_leader.instance_id = ${this.instanceId} THEN ${now}
                        ELSE cron_leader.last_heartbeat 
                    END,
                    updated_at = ${now}
            `;

            // Check if we are the leader
            const leader = await prisma.cronLeader.findFirst({
                where: { id: 'singleton' },
                select: { instanceId: true }
            });

            this.isMainInstance = leader?.instanceId === this.instanceId;

            logger.info(`🗳️ Leader election result: ${this.isMainInstance ? 'LEADER' : 'FOLLOWER'}`, {
                instanceId: this.instanceId,
                currentLeader: leader?.instanceId
            });

        } catch (error) {
            // If leader election fails, assume we're not the leader
            logger.error('❌ Leader election failed, defaulting to follower:', error);
            this.isMainInstance = false;
        }
    }

    async maintainLeadership() {
        if (!this.isMainInstance) {
            // Check if leadership is available
            await this.electLeader();
            return;
        }

        try {
            const now = new Date();

            // Update heartbeat
            await prisma.cronLeader.update({
                where: {
                    id: 'singleton',
                    instanceId: this.instanceId
                },
                data: {
                    lastHeartbeat: now,
                    updatedAt: now
                }
            });

            // Verify we're still the leader
            const leader = await prisma.cronLeader.findFirst({
                where: { id: 'singleton' },
                select: { instanceId: true }
            });

            if (leader?.instanceId !== this.instanceId) {
                logger.warn('👑 Lost leadership, stopping cron jobs');
                this.isMainInstance = false;
            }

        } catch (error) {
            logger.error('❌ Failed to maintain leadership:', error);
            this.isMainInstance = false;
        }
    }

    async executeWithLeaderCheck(jobName, jobFunction) {
        if (!this.isMainInstance) {
            logger.info(`⏭️ Skipping ${jobName} - not the leader instance`);
            return;
        }

        try {
            logger.info(`🚀 Executing ${jobName} as leader instance ${this.instanceId}`);
            await jobFunction();
        } catch (error) {
            logger.error(`❌ Error executing ${jobName}:`, error);
        }
    }

    async processDailyPayouts() {
        try {
            logger.info('🕐 Starting scheduled daily payout processing...');
            console.log('🕐 [Railway Cron] Daily payout processing started at:', new Date().toISOString());

            const PayoutController = require('../controllers/payout.controller');

            const mockReq = {
                user: { id: 'system-cron' },
                headers: { 'x-internal-service': 'railway-cron-scheduler' }
            };

            const mockRes = {
                json: (data) => {
                    if (data.success) {
                        logger.info('✅ Daily payout processing completed successfully', data.data);
                        console.log('✅ [Railway Cron] Daily payout processing completed:', {
                            totalPayouts: data.data.totalPayouts,
                            successfulPayouts: data.data.successfulPayouts,
                            failedPayouts: data.data.failedPayouts,
                            totalAmountProcessed: data.data.totalAmountProcessed
                        });
                    } else {
                        logger.error('❌ Daily payout processing failed', data);
                        console.error('❌ [Railway Cron] Daily payout processing failed:', data.error);
                    }
                },
                status: (code) => ({
                    json: (data) => {
                        logger.error(`❌ Daily payout processing failed with status ${code}`, data);
                        console.error(`❌ [Railway Cron] Daily payout processing failed (${code}):`, data.error);
                    }
                })
            };

            await PayoutController.processDailyPayouts(mockReq, mockRes);

        } catch (error) {
            logger.error('❌ Error in scheduled daily payout processing:', error);
            console.error('❌ [Railway Cron] Critical error in daily payout processing:', error);
        }
    }

    async checkPendingPayouts() {
        try {
            console.log('🔍 [Railway Cron] Checking for pending payouts...');

            const PayoutController = require('../controllers/payout.controller');
            const mockReq = {
                query: { days: 1 },
                user: { id: 'system-cron' },
                headers: { 'x-internal-service': 'railway-cron-scheduler' }
            };

            const mockRes = {
                json: (data) => {
                    if (data.success && data.data.pendingPayouts > 0) {
                        console.log(`💰 [Railway Cron] Found ${data.data.pendingPayouts} pending payouts (₹${data.data.totalAmount})`);
                        logger.info('Pending payouts detected', data.data);
                    }
                },
                status: () => ({ json: () => { } })
            };

            await PayoutController.getPendingPayouts(mockReq, mockRes);

        } catch (error) {
            console.error('❌ [Railway Cron] Error in pending check:', error);
        }
    }

    async sendSubmissionReminders() {
        try {
            console.log('📬 [Railway Cron] Checking for submissions needing reminders...');

            const SubmissionController = require('../controllers/submission.controller');
            const mockReq = {
                user: { id: 'system-cron' },
                headers: { 'x-internal-service': 'railway-cron-scheduler' }
            };

            const mockRes = {
                json: (data) => {
                    if (data.success) {
                        console.log(`📬 [Railway Cron] Sent ${data.data.remindersSent} submission reminder(s)`);
                        logger.info('Submission reminders processed', data.data);
                    } else {
                        console.error('❌ [Railway Cron] Submission reminder failed:', data.error);
                    }
                },
                status: (code) => ({
                    json: (data) => {
                        console.error(`❌ [Railway Cron] Submission reminder error (${code}):`, data.error);
                    }
                })
            };

            await SubmissionController.sendSubmissionReminders(mockReq, mockRes);

        } catch (error) {
            console.error('❌ [Railway Cron] Error in submission reminder job:', error);
        }
    }

    async processAutoApprovals() {
        try {
            console.log('⏰ [Railway Cron] Checking for submissions to auto-approve...');

            const SubmissionController = require('../controllers/submission.controller');
            const mockReq = {
                user: { id: 'system-cron' },
                headers: { 'x-internal-service': 'railway-cron-scheduler' }
            };

            const mockRes = {
                json: (data) => {
                    if (data.success) {
                        console.log(`⏰ [Railway Cron] Auto-approved ${data.data.autoApprovalsProcessed} submission(s)`);
                        logger.info('Auto approvals processed', data.data);
                    } else {
                        console.error('❌ [Railway Cron] Auto approval failed:', data.error);
                    }
                },
                status: (code) => ({
                    json: (data) => {
                        console.error(`❌ [Railway Cron] Auto approval error (${code}):`, data.error);
                    }
                })
            };

            await SubmissionController.processAutoApprovals(mockReq, mockRes);

        } catch (error) {
            console.error('❌ [Railway Cron] Error in auto approval job:', error);
        }
    }

    async stop() {
        try {
            // Release leadership
            if (this.isMainInstance) {
                await prisma.cronLeader.deleteMany({
                    where: {
                        id: 'singleton',
                        instanceId: this.instanceId
                    }
                });
                logger.info('👑 Released leadership');
            }

            // Stop all jobs
            this.jobs.forEach((job, name) => {
                job.destroy();
                logger.info(`🛑 Stopped Railway cron job: ${name}`);
            });

            this.jobs.clear();
            this.isRunning = false;
            this.isMainInstance = false;

            logger.info('🛑 Railway Cron scheduler stopped');
            console.log('🛑 [Railway Cron] All jobs stopped and leadership released');

        } catch (error) {
            logger.error('❌ Error stopping Railway cron scheduler:', error);
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            instanceId: this.instanceId,
            isLeader: this.isMainInstance,
            activeJobs: Array.from(this.jobs.keys()),
            nextRuns: Array.from(this.jobs.entries()).map(([name, job]) => ({
                name,
                nextRun: job.nextDate ? job.nextDate().toISOString() : 'Not scheduled'
            }))
        };
    }

    // Manual trigger for testing
    async triggerDailyPayouts() {
        if (!this.isMainInstance) {
            throw new Error('Only leader instance can trigger payouts');
        }

        await this.processDailyPayouts();
    }
}

module.exports = new RailwayCronScheduler();