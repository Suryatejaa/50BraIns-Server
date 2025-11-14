// controllers/submission.controller.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const gigCacheService = require('../services/gigCacheService');
const rabbitmqService = require('../services/rabbitmqService');

const prisma = new PrismaClient();

class SubmissionController {
    /**
     * Send reminder notifications to brands for unreviewed submissions after 24 hours
     * POST /api/admin/submissions/send-reminders
     */
    async sendSubmissionReminders(req, res) {
        try {
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            console.log('📬 Starting submission reminder job...', {
                currentTime: now.toISOString(),
                lookingForSubmissionsAfter: twentyFourHoursAgo.toISOString()
            });

            // Find submissions that are PENDING for more than 24 hours
            const unreviewedSubmissions = await prisma.submission.findMany({
                where: {
                    status: 'PENDING',
                    submittedAt: {
                        lte: twentyFourHoursAgo
                    },
                    // Ensure we haven't sent a reminder in the last 6 hours to avoid spam
                    OR: [
                        {
                            notes: {
                                path: ['lastReminderSent'],
                                equals: null
                            }
                        },
                        {
                            notes: {
                                path: ['lastReminderSent'],
                                lt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
                            }
                        }
                    ]
                },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            postedById: true
                        }
                    },
                    application: {
                        select: {
                            id: true,
                            applicantId: true,
                            quotedPrice: true
                        }
                    }
                },
                orderBy: {
                    submittedAt: 'asc'
                }
            });

            console.log(`📬 Found ${unreviewedSubmissions.length} submissions needing reminders`);

            const results = [];
            let remindersSent = 0;

            for (const submission of unreviewedSubmissions) {
                try {
                    const hoursSinceSubmission = Math.floor((now - new Date(submission.submittedAt)) / (1000 * 60 * 60));

                    // Send reminder notification to brand
                    await this.publishEvent('submission_review_reminder', {
                        recipientId: submission.gig.postedById,
                        gigId: submission.gigId,
                        gigTitle: submission.gig.title,
                        submissionId: submission.id,
                        submittedById: submission.submittedById,
                        applicantId: submission.application.applicantId,
                        quotedPrice: submission.application.quotedPrice,
                        hoursPending: hoursSinceSubmission,
                        message: `⏰ Reminder: Work submission for "${submission.gig.title}" has been pending review for ${hoursSinceSubmission} hours. Please review the submission to avoid auto-approval after 48 hours.`,
                        urgency: hoursSinceSubmission >= 36 ? 'HIGH' : 'MEDIUM'
                    });

                    // Update submission notes to track reminder
                    await prisma.submission.update({
                        where: { id: submission.id },
                        data: {
                            notes: {
                                ...submission.notes,
                                lastReminderSent: now.toISOString(),
                                reminderCount: (submission.notes?.reminderCount || 0) + 1,
                                hoursPendingAtReminder: hoursSinceSubmission
                            }
                        }
                    });

                    remindersSent++;
                    results.push({
                        submissionId: submission.id,
                        gigTitle: submission.gig.title,
                        brandId: submission.gig.postedById,
                        hoursPending: hoursSinceSubmission,
                        status: 'reminder_sent'
                    });

                    logger.info(`Submission reminder sent: ${submission.id} - pending for ${hoursSinceSubmission}h`);

                } catch (error) {
                    logger.error(`Failed to send reminder for submission ${submission.id}:`, error);
                    results.push({
                        submissionId: submission.id,
                        status: 'error',
                        message: error.message
                    });
                }
            }

            console.log(`✅ Submission reminder job completed:`, {
                totalSubmissions: unreviewedSubmissions.length,
                remindersSent: remindersSent,
                errors: results.filter(r => r.status === 'error').length
            });

            res.json({
                success: true,
                message: `Sent ${remindersSent} submission reminders`,
                data: {
                    totalSubmissions: unreviewedSubmissions.length,
                    remindersSent: remindersSent,
                    errors: results.filter(r => r.status === 'error').length,
                    results: results
                }
            });

        } catch (error) {
            logger.error('Error in submission reminder job:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process submission reminders'
            });
        }
    }

    /**
     * Auto-approve submissions that have been pending for more than 48 hours
     * POST /api/admin/submissions/auto-approve
     */
    async processAutoApprovals(req, res) {
        try {
            const now = new Date();
            const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            console.log('⏰ Starting auto-approval job...', {
                currentTime: now.toISOString(),
                lookingForSubmissionsAfter: fortyEightHoursAgo.toISOString()
            });

            // Find submissions that are PENDING for more than 48 hours
            const overdueSubmissions = await prisma.submission.findMany({
                where: {
                    status: 'PENDING',
                    submittedAt: {
                        lte: fortyEightHoursAgo
                    }
                },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            postedById: true
                        }
                    },
                    application: {
                        select: {
                            id: true,
                            applicantId: true,
                            quotedPrice: true,
                            upiId: true
                        }
                    }
                },
                orderBy: {
                    submittedAt: 'asc'
                }
            });

            console.log(`⏰ Found ${overdueSubmissions.length} submissions to auto-approve`);

            const results = [];
            let autoApprovalsProcessed = 0;

            for (const submission of overdueSubmissions) {
                try {
                    const hoursSinceSubmission = Math.floor((now - new Date(submission.submittedAt)) / (1000 * 60 * 60));

                    // Auto-approve the submission
                    const updatedSubmission = await prisma.submission.update({
                        where: { id: submission.id },
                        data: {
                            status: 'APPROVED',
                            reviewedAt: now,
                            rating: 4, // Default rating for auto-approved submissions
                            feedback: `Auto-approved after ${hoursSinceSubmission} hours due to no review from brand. System default approval.`,
                            notes: {
                                ...submission.notes,
                                autoApproved: true,
                                autoApprovalReason: 'No review after 48 hours',
                                hoursUntilAutoApproval: hoursSinceSubmission,
                                autoApprovedAt: now.toISOString()
                            }
                        }
                    });

                    // Update application status to SUBMITTED (work complete)
                    await prisma.application.update({
                        where: { id: submission.application.id },
                        data: {
                            status: 'SUBMITTED',
                            submittedAt: now
                        }
                    });

                    // Calculate platform fees (reuse existing logic from application controller)
                    const ApplicationController = require('./application.controller');
                    const feeCalculation = ApplicationController.calculatePlatformFees(submission.application.quotedPrice);

                    // Create or update payment record for escrow
                    let payment = await prisma.payment.findUnique({
                        where: { applicationId: submission.application.id }
                    });

                    if (!payment) {
                        // Create payment record in HELD_ESCROW status
                        payment = await prisma.payment.create({
                            data: {
                                applicationId: submission.application.id,
                                gigId: submission.gigId,
                                paidBy: submission.gig.postedById,
                                paidTo: submission.application.applicantId,
                                amount: submission.application.quotedPrice,
                                creatorAmount: feeCalculation.creatorAmount,
                                platformFee: feeCalculation.platformFee,
                                status: 'HELD_ESCROW',
                                currency: 'INR',
                                notes: {
                                    submissionApproved: true,
                                    autoApproved: true,
                                    autoApprovalReason: 'No review after 48 hours',
                                    approvedAt: now.toISOString(),
                                    quotedPrice: submission.application.quotedPrice,
                                    creatorFee: feeCalculation.creatorFee,
                                    brandFee: feeCalculation.brandFee
                                }
                            }
                        });
                    } else {
                        // Update existing payment
                        payment = await prisma.payment.update({
                            where: { id: payment.id },
                            data: {
                                status: 'HELD_ESCROW',
                                notes: {
                                    ...payment.notes,
                                    submissionApproved: true,
                                    autoApproved: true,
                                    autoApprovalReason: 'No review after 48 hours',
                                    approvedAt: now.toISOString()
                                }
                            }
                        });
                    }

                    // Update work history
                    await prisma.applicationWorkHistory.updateMany({
                        where: { applicationId: submission.application.id },
                        data: {
                            applicationStatus: 'SUBMITTED',
                            paymentStatus: 'HELD_ESCROW',
                            completedAt: now,
                            lastActivityAt: now
                        }
                    });

                    // Send notifications
                    // Notify creator about auto-approval
                    await this.publishEvent('auto_approval_notification', {
                        recipientId: submission.application.applicantId,
                        gigId: submission.gigId,
                        gigTitle: submission.gig.title,
                        submissionId: submission.id,
                        applicationId: submission.application.id,
                        brandId: submission.gig.postedById,
                        quotedPrice: submission.application.quotedPrice,
                        creatorEarnings: feeCalculation.creatorAmount,
                        hoursPending: hoursSinceSubmission,
                        message: `🎉 Your submission for "${submission.gig.title}" has been automatically approved after ${hoursSinceSubmission} hours. Your payment of ₹${feeCalculation.creatorAmount} is now held in escrow and will be processed within 2-3 working days.`
                    });

                    // Notify brand about auto-approval
                    await this.publishEvent('auto_approval_brand_notification', {
                        recipientId: submission.gig.postedById,
                        gigId: submission.gigId,
                        gigTitle: submission.gig.title,
                        submissionId: submission.id,
                        applicationId: submission.application.id,
                        creatorId: submission.application.applicantId,
                        quotedPrice: submission.application.quotedPrice,
                        hoursPending: hoursSinceSubmission,
                        message: `⏰ The submission for "${submission.gig.title}" has been automatically approved after ${hoursSinceSubmission} hours of no review. Payment of ₹${submission.application.quotedPrice} is now in escrow and will be processed to the creator.`
                    });

                    autoApprovalsProcessed++;
                    results.push({
                        submissionId: submission.id,
                        gigTitle: submission.gig.title,
                        creatorId: submission.application.applicantId,
                        brandId: submission.gig.postedById,
                        hoursPending: hoursSinceSubmission,
                        paymentAmount: feeCalculation.creatorAmount,
                        status: 'auto_approved'
                    });

                    logger.info(`Auto-approved submission: ${submission.id} - pending for ${hoursSinceSubmission}h`);

                } catch (error) {
                    logger.error(`Failed to auto-approve submission ${submission.id}:`, error);
                    results.push({
                        submissionId: submission.id,
                        status: 'error',
                        message: error.message
                    });
                }
            }

            // Invalidate relevant caches
            try {
                await gigCacheService.invalidatePattern('user_applications:*');
                await gigCacheService.invalidatePattern('received_applications:*');
                await gigCacheService.invalidatePattern('gig_submissions:*');
                console.log('✅ Invalidated caches after auto-approvals');
            } catch (cacheError) {
                console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
            }

            console.log(`✅ Auto-approval job completed:`, {
                totalSubmissions: overdueSubmissions.length,
                autoApprovalsProcessed: autoApprovalsProcessed,
                errors: results.filter(r => r.status === 'error').length
            });

            res.json({
                success: true,
                message: `Auto-approved ${autoApprovalsProcessed} submissions`,
                data: {
                    totalSubmissions: overdueSubmissions.length,
                    autoApprovalsProcessed: autoApprovalsProcessed,
                    errors: results.filter(r => r.status === 'error').length,
                    results: results
                }
            });

        } catch (error) {
            logger.error('Error in auto-approval job:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process auto-approvals'
            });
        }
    }

    /**
     * Helper method to publish events
     */
    async publishEvent(eventType, eventData) {
        try {
            if (!rabbitmqService.isConnected) {
                console.warn('⚠️ [Submission Controller] RabbitMQ not connected, skipping event publication');
                return;
            }

            const baseEvent = {
                ...eventData,
                eventType: eventType,
                timestamp: new Date().toISOString(),
                eventId: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'gig-service-submission-controller'
            };

            console.log(`📤 [Submission Controller] Publishing ${eventType} event:`, {
                eventId: baseEvent.eventId,
                recipientId: eventData.recipientId,
                gigId: eventData.gigId
            });

            // Publish to gig events exchange
            await rabbitmqService.publishGigEvent(eventType, baseEvent);

            console.log(`✅ [Submission Controller] Successfully published ${eventType} event with ID: ${baseEvent.eventId}`);
        } catch (error) {
            console.error(`❌ [Submission Controller] Failed to publish ${eventType} event:`, error);
            // Don't throw error - just log it so cron jobs continue
        }
    }

    /**
     * Manual trigger methods for testing
     */
    async triggerSubmissionReminders() {
        const mockReq = { user: { id: 'manual-trigger' }, headers: { 'x-internal-service': 'manual-trigger' } };
        const mockRes = {
            json: (data) => {
                console.log('✅ [Manual Trigger] Submission reminders result:', data);
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    console.error(`❌ [Manual Trigger] Submission reminders error (${code}):`, data);
                    return data;
                }
            })
        };

        await this.sendSubmissionReminders(mockReq, mockRes);
    }

    async triggerAutoApprovals() {
        const mockReq = { user: { id: 'manual-trigger' }, headers: { 'x-internal-service': 'manual-trigger' } };
        const mockRes = {
            json: (data) => {
                console.log('✅ [Manual Trigger] Auto approvals result:', data);
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    console.error(`❌ [Manual Trigger] Auto approvals error (${code}):`, data);
                    return data;
                }
            })
        };

        await this.processAutoApprovals(mockReq, mockRes);
    }
}

module.exports = new SubmissionController();