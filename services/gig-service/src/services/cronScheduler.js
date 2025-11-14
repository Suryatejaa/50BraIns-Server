// services/gig-service/src/services/cronScheduler.js
const cron = require('node-cron');
const logger = require('../utils/logger');

class CronScheduler {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            logger.info('⚠️ Cron scheduler already running');
            return;
        }

        try {
            // Schedule daily payout processing at 2:00 AM every day
            const dailyPayoutJob = cron.schedule('0 2 * * *', async () => {
                try {
                    logger.info('🕐 Starting scheduled daily payout processing...');
                    console.log('🕐 [Cron] Daily payout processing started at:', new Date().toISOString());

                    // Import the payout controller
                    const PayoutController = require('../controllers/payout.controller');

                    // Create a mock request/response for the controller
                    const mockReq = {
                        user: { id: 'system-cron' },
                        headers: { 'x-internal-service': 'cron-scheduler' }
                    };

                    const mockRes = {
                        json: (data) => {
                            if (data.success) {
                                logger.info('✅ Daily payout processing completed successfully', data.data);
                                console.log('✅ [Cron] Daily payout processing completed:', {
                                    totalPayouts: data.data.totalPayouts,
                                    successfulPayouts: data.data.successfulPayouts,
                                    failedPayouts: data.data.failedPayouts,
                                    totalAmountProcessed: data.data.totalAmountProcessed
                                });
                            } else {
                                logger.error('❌ Daily payout processing failed', data);
                                console.error('❌ [Cron] Daily payout processing failed:', data.error);
                            }
                        },
                        status: (code) => ({
                            json: (data) => {
                                logger.error(`❌ Daily payout processing failed with status ${code}`, data);
                                console.error(`❌ [Cron] Daily payout processing failed (${code}):`, data.error);
                            }
                        })
                    };

                    // Execute the daily payout processing
                    await PayoutController.processDailyPayouts(mockReq, mockRes);

                } catch (error) {
                    logger.error('❌ Error in scheduled daily payout processing:', error);
                    console.error('❌ [Cron] Critical error in daily payout processing:', error);
                }
            }, {
                scheduled: false, // Don't start immediately
                timezone: "Asia/Kolkata" // Indian timezone
            });

            // Schedule a test job that runs every 5 minutes (for testing)
            const testJob = cron.schedule('*/5 * * * *', async () => {
                try {
                    console.log('🔍 [Cron] Test job - checking for pending payouts...');

                    const PayoutController = require('../controllers/payout.controller');
                    const mockReq = {
                        query: { days: 1 },
                        user: { id: 'system-cron' },
                        headers: { 'x-internal-service': 'cron-scheduler' }
                    };

                    const mockRes = {
                        json: (data) => {
                            if (data.success && data.data.pendingPayouts > 0) {
                                console.log(`💰 [Cron] Found ${data.data.pendingPayouts} pending payouts (₹${data.data.totalAmount})`);
                            }
                        },
                        status: () => ({ json: () => { } })
                    };

                    await PayoutController.getPendingPayouts(mockReq, mockRes);

                } catch (error) {
                    console.error('❌ [Cron] Error in test job:', error);
                }
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Schedule submission reminder job - runs every 4 hours to check for 24h+ unreviewed submissions
            const submissionReminderJob = cron.schedule('0 */4 * * *', async () => {
                try {
                    logger.info('📬 Starting submission reminder check...');
                    console.log('📬 [Cron] Submission reminder job started at:', new Date().toISOString());

                    const SubmissionController = require('../controllers/submission.controller');
                    const mockReq = {
                        user: { id: 'system-cron' },
                        headers: { 'x-internal-service': 'cron-scheduler' }
                    };

                    const mockRes = {
                        json: (data) => {
                            if (data.success) {
                                logger.info('✅ Submission reminders sent successfully', data.data);
                                console.log('✅ [Cron] Submission reminders completed:', {
                                    remindersSent: data.data.remindersSent
                                });
                            } else {
                                logger.error('❌ Submission reminder processing failed', data);
                                console.error('❌ [Cron] Submission reminder failed:', data.error);
                            }
                        },
                        status: (code) => ({
                            json: (data) => {
                                logger.error(`❌ Submission reminder failed with status ${code}`, data);
                                console.error(`❌ [Cron] Submission reminder failed (${code}):`, data.error);
                            }
                        })
                    };

                    await SubmissionController.sendSubmissionReminders(mockReq, mockRes);

                } catch (error) {
                    logger.error('❌ Error in submission reminder job:', error);
                    console.error('❌ [Cron] Critical error in submission reminder:', error);
                }
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Schedule auto-approval job - runs every 6 hours to check for 48h+ unreviewed submissions
            const autoApprovalJob = cron.schedule('0 */6 * * *', async () => {
                try {
                    logger.info('⏰ Starting auto approval check...');
                    console.log('⏰ [Cron] Auto approval job started at:', new Date().toISOString());

                    const SubmissionController = require('../controllers/submission.controller');
                    const mockReq = {
                        user: { id: 'system-cron' },
                        headers: { 'x-internal-service': 'cron-scheduler' }
                    };

                    const mockRes = {
                        json: (data) => {
                            if (data.success) {
                                logger.info('✅ Auto approvals processed successfully', data.data);
                                console.log('✅ [Cron] Auto approvals completed:', {
                                    autoApprovalsProcessed: data.data.autoApprovalsProcessed
                                });
                            } else {
                                logger.error('❌ Auto approval processing failed', data);
                                console.error('❌ [Cron] Auto approval failed:', data.error);
                            }
                        },
                        status: (code) => ({
                            json: (data) => {
                                logger.error(`❌ Auto approval failed with status ${code}`, data);
                                console.error(`❌ [Cron] Auto approval failed (${code}):`, data.error);
                            }
                        })
                    };

                    await SubmissionController.processAutoApprovals(mockReq, mockRes);

                } catch (error) {
                    logger.error('❌ Error in auto approval job:', error);
                    console.error('❌ [Cron] Critical error in auto approval:', error);
                }
            }, {
                scheduled: false,
                timezone: "Asia/Kolkata"
            });

            // Store jobs for management
            this.jobs.set('dailyPayouts', dailyPayoutJob);
            this.jobs.set('testPendingCheck', testJob);
            this.jobs.set('submissionReminder', submissionReminderJob);
            this.jobs.set('autoApproval', autoApprovalJob);

            // Start the jobs
            dailyPayoutJob.start();
            submissionReminderJob.start();
            autoApprovalJob.start();
            // testJob.start(); // Uncomment for testing

            this.isRunning = true;

            logger.info('✅ Cron scheduler started successfully');
            console.log('✅ [Cron Scheduler] Started with jobs:', {
                dailyPayouts: '2:00 AM daily (Asia/Kolkata)',
                testPendingCheck: 'Every 5 minutes (disabled by default)'
            });

        } catch (error) {
            logger.error('❌ Failed to start cron scheduler:', error);
            console.error('❌ [Cron Scheduler] Failed to start:', error);
        }
    }

    stop() {
        try {
            this.jobs.forEach((job, name) => {
                job.destroy();
                logger.info(`🛑 Stopped cron job: ${name}`);
            });

            this.jobs.clear();
            this.isRunning = false;

            logger.info('🛑 Cron scheduler stopped');
            console.log('🛑 [Cron Scheduler] All jobs stopped');

        } catch (error) {
            logger.error('❌ Error stopping cron scheduler:', error);
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: Array.from(this.jobs.keys()),
            nextRuns: Array.from(this.jobs.entries()).map(([name, job]) => ({
                name,
                nextRun: job.nextDate ? job.nextDate().toISOString() : 'Not scheduled'
            }))
        };
    }

    // Manual trigger for testing
    async triggerDailyPayouts() {
        try {
            console.log('🔧 [Cron] Manually triggering daily payout processing...');

            const PayoutController = require('../controllers/payout.controller');
            const mockReq = {
                user: { id: 'manual-trigger' },
                headers: { 'x-internal-service': 'manual-cron-trigger' }
            };

            const mockRes = {
                json: (data) => {
                    console.log('✅ [Manual Cron] Result:', data);
                    return data;
                },
                status: (code) => ({
                    json: (data) => {
                        console.error(`❌ [Manual Cron] Error (${code}):`, data);
                        return data;
                    }
                })
            };

            await PayoutController.processDailyPayouts(mockReq, mockRes);

        } catch (error) {
            console.error('❌ [Manual Cron] Error:', error);
            throw error;
        }
    }
}

module.exports = new CronScheduler();