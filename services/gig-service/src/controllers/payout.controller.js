// controllers/payout.controller.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const gigCacheService = require('../services/gigCacheService');
const rabbitmqService = require('../services/rabbitmqService');

const prisma = new PrismaClient();

class PayoutController {
    /**
     * Daily cron job to process payouts for approved submissions
     * POST /api/admin/payouts/process-daily
     * This should be called by a cron job every 24 hours
     */
    async processDailyPayouts(req, res) {
        try {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

            console.log('🕐 Starting daily payout processing job...', {
                currentTime: now.toISOString(),
                lookingForApprovalsAfter: yesterday.toISOString()
            });

            // Find payments that are approved submissions in the last 24 hours
            // and still in HELD_ESCROW status (not yet processed)
            const pendingPayouts = await prisma.payment.findMany({
                where: {
                    status: 'HELD_ESCROW',
                    notes: {
                        path: ['submissionApproved'],
                        equals: true
                    },
                    // Look for payments moved to escrow in the last 24 hours
                    heldEscrowAt: {
                        gte: yesterday
                    }
                },
                include: {
                    application: {
                        include: {
                            gig: true,
                            submissions: {
                                where: {
                                    status: 'APPROVED',
                                    reviewedAt: {
                                        gte: yesterday
                                    }
                                }
                            }
                        }
                    }
                }
            });

            console.log(`💰 Found ${pendingPayouts.length} pending payouts to process`);

            const results = [];
            let totalAmount = 0;

            for (const payment of pendingPayouts) {
                try {
                    // Validate that we have a valid submission approval
                    if (!payment.application.submissions || payment.application.submissions.length === 0) {
                        console.log(`⚠️ Skipping payment ${payment.id} - No approved submission found`);
                        continue;
                    }

                    const submission = payment.application.submissions[0];

                    // Validate UPI ID is present
                    if (!payment.application.upiId) {
                        throw new Error('Creator UPI ID is missing from application');
                    }

                    console.log(`💸 Processing payout for payment ${payment.id}:`, {
                        gigTitle: payment.application.gig.title,
                        creatorAmount: payment.creatorAmount,
                        upiId: payment.application.upiId,
                        submissionApprovedAt: submission.reviewedAt
                    });

                    // Since Cashfree application was rejected, mark payment as ready for manual processing
                    // Update payment status to PENDING_MANUAL_PAYOUT
                    const updatedPayment = await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: 'HELD_ESCROW', // Keep in escrow until manually processed
                            notes: {
                                ...payment.notes,
                                approvedForPayout: true,
                                approvedAt: new Date().toISOString(),
                                payoutMethod: 'Manual Processing Required',
                                readyForManualPayout: true,
                                processedByCronJob: true,
                                cronJobRunAt: now.toISOString(),
                                submissionApproved: true,
                                awaitingManualPayout: true
                            }
                        }
                    });

                    // Update work history to show payment is ready for processing
                    await prisma.applicationWorkHistory.updateMany({
                        where: { applicationId: payment.applicationId },
                        data: {
                            paymentStatus: 'PROCESSING', // Mark as processing until manually completed
                            lastActivityAt: new Date()
                        }
                    });

                    totalAmount += payment.creatorAmount;

                    results.push({
                        paymentId: payment.id,
                        gigTitle: payment.application.gig.title,
                        creatorAmount: payment.creatorAmount,
                        upiId: payment.application.upiId,
                        status: 'READY_FOR_MANUAL_PAYOUT',
                        message: 'Payment approved and ready for manual processing'
                    });

                    // Send notification to creator about payment approval (manual processing)
                    try {
                        await this.sendPayoutApprovalNotification({
                            recipientId: payment.paidTo,
                            gigTitle: payment.application.gig.title,
                            amount: payment.creatorAmount,
                            upiId: payment.application.upiId
                        });
                    } catch (notificationError) {
                        console.error('⚠️ Failed to send payout approval notification:', notificationError);
                        // Don't fail the approval if notification fails
                    }

                    logger.info(`Payout processed successfully: ${payment.id} - ₹${payment.creatorAmount} to ${payment.application.upiId}`);

                } catch (error) {
                    logger.error(`Failed to process payout for payment ${payment.id}:`, error);

                    // Update payment with error details
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            notes: {
                                ...payment.notes,
                                payoutError: error.message,
                                payoutFailedAt: new Date().toISOString(),
                                requiresManualIntervention: true,
                                cronJobRunAt: now.toISOString()
                            }
                        }
                    });

                    results.push({
                        paymentId: payment.id,
                        status: 'error',
                        message: error.message
                    });
                }
            }

            console.log(`✅ Daily payout processing completed:`, {
                totalPayouts: results.length,
                successfulPayouts: results.filter(r => r.status === 'success').length,
                failedPayouts: results.filter(r => r.status === 'error').length,
                totalAmountProcessed: totalAmount
            });

            // Invalidate relevant caches
            try {
                await gigCacheService.invalidatePattern('user_applications:*');
                await gigCacheService.invalidatePattern('received_applications:*');
                console.log('✅ Invalidated caches after payout processing');
            } catch (cacheError) {
                console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
            }

            res.json({
                success: true,
                message: `Processed ${pendingPayouts.length} pending payouts`,
                data: {
                    totalPayouts: results.length,
                    successfulPayouts: results.filter(r => r.status === 'success').length,
                    failedPayouts: results.filter(r => r.status === 'error').length,
                    totalAmountProcessed: totalAmount,
                    results: results
                }
            });

        } catch (error) {
            logger.error('Error in daily payout processing:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process daily payouts'
            });
        }
    }

    /**
     * Process Cashfree payout (placeholder for actual integration)
     * @param {Object} payoutData - Payout details
     * @returns {Object} - Payout result
     */
    async processCashfreePayout(payoutData) {
        try {
            const { paymentId, upiId, amount, currency, reference, description, gigId, applicationId } = payoutData;

            console.log('💸 Processing Cashfree Payout:', {
                paymentId,
                upiId,
                amount,
                currency,
                reference,
                description
            });

            // TODO: Replace with actual Cashfree Payouts API integration
            // For now, simulate the payout process
            const simulatedPayoutId = `cf_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('🎭 💸 SIMULATED CASHFREE PAYOUT - No real money transferred:', {
                payoutId: simulatedPayoutId,
                amount: `₹${amount}`,
                upiId,
                reference,
                note: 'This is a test transaction - replace with actual Cashfree integration'
            });

            // Simulate successful payout response
            return {
                success: true,
                payoutId: simulatedPayoutId,
                status: 'processed',
                amount: amount,
                upiId: upiId,
                reference: reference,
                processedAt: new Date().toISOString(),
                isSimulated: true,
                simulationReason: 'Cashfree integration pending',
                cashfreeResponse: {
                    cf_payment_id: simulatedPayoutId,
                    transfer_id: `transfer_${Date.now()}`,
                    status: 'SUCCESS',
                    utr: `CF${Date.now()}`,
                    transferred_amount: amount,
                    beneficiary_upi: upiId,
                    created_at: new Date().toISOString()
                }
            };

        } catch (error) {
            logger.error('Error processing Cashfree payout:', error);
            throw new Error(`Cashfree payout failed: ${error.message}`);
        }
    }

    /**
     * Send notification to creator about payout approval (manual processing)
     * @param {Object} notificationData - Notification details
     */
    async sendPayoutApprovalNotification(notificationData) {
        try {
            const { recipientId, gigTitle, amount, upiId } = notificationData;

            // TODO: Replace with actual notification service integration
            console.log('📧 Sending payout approval notification:', {
                recipientId,
                gigTitle,
                amount: `₹${amount}`,
                upiId
            });

            // Simulate notification
            const message = `💰 Payment Approved for Processing!

Your payment of ₹${amount} for "${gigTitle}" has been approved and is ready for processing.

UPI ID: ${upiId}

Our team will process your payment manually within 24-48 hours and notify you once completed.

Thank you for your excellent work! 🎉`;

            console.log('📱 Notification message:', message);

            // TODO: Integrate with actual notification service
            logger.info(`Payout approval notification sent to user ${recipientId}: ₹${amount}`);

        } catch (error) {
            logger.error('Error sending payout approval notification:', error);
            throw error;
        }
    }

    /**
     * Send notification to creator about payout initiation
     * @param {Object} notificationData - Notification details
     */
    async sendPayoutNotification(notificationData) {
        try {
            const { recipientId, gigTitle, amount, payoutId, upiId } = notificationData;

            // TODO: Replace with actual notification service integration
            console.log('📧 Sending payout notification:', {
                recipientId,
                gigTitle,
                amount: `₹${amount}`,
                payoutId,
                upiId
            });

            // Simulate notification
            const message = `💰 Payment Processing Started!

Your payment of ₹${amount} for "${gigTitle}" has been released from escrow and is being processed.

Payment ID: ${payoutId}
UPI ID: ${upiId}

The funds should reach your UPI account within 2-4 hours via our secure Cashfree payment system.

Thank you for your excellent work! 🎉`;

            console.log('📱 Notification message:', message);

            // TODO: Integrate with actual notification service
            logger.info(`Payout notification sent to user ${recipientId}: ₹${amount}`);

        } catch (error) {
            logger.error('Error sending payout notification:', error);
            throw error;
        }
    }

    /**
     * Get pending payouts that need to be processed
     * GET /api/admin/payouts/pending
     */
    async getPendingPayouts(req, res) {
        try {
            const { days = 1 } = req.query;
            const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const pendingPayouts = await prisma.payment.findMany({
                where: {
                    status: 'HELD_ESCROW',
                    heldEscrowAt: {
                        gte: daysAgo
                    },
                    OR: [
                        // Look for payments with submissionApproved flag (set by reviewSubmission)
                        {
                            notes: {
                                path: ['submissionApproved'],
                                equals: true
                            }
                        },
                        // Or payments where application status is CLOSED (happens after approval)
                        {
                            application: {
                                status: 'CLOSED',
                                submissions: {
                                    some: {
                                        status: 'APPROVED'
                                    }
                                }
                            }
                        },
                        // Or payments specifically marked for manual payout
                        {
                            notes: {
                                path: ['readyForManualPayout'],
                                equals: true
                            }
                        }
                    ]
                },
                include: {
                    application: {
                        include: {
                            gig: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            },
                            submissions: {
                                where: {
                                    status: 'APPROVED'
                                },
                                select: {
                                    id: true,
                                    reviewedAt: true,
                                    status: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    heldEscrowAt: 'desc'
                }
            });

            const totalAmount = pendingPayouts.reduce((sum, payment) => sum + payment.creatorAmount, 0);

            res.json({
                success: true,
                data: {
                    pendingPayouts: pendingPayouts.length,
                    totalAmount: totalAmount,
                    payments: pendingPayouts.map(payment => ({
                        id: payment.id,
                        gigTitle: payment.application.gig.title,
                        creatorAmount: payment.creatorAmount,
                        upiId: payment.application.upiId,
                        approvedAt: payment.application.submissions[0]?.reviewedAt,
                        receipt: payment.receipt
                    }))
                }
            });

        } catch (error) {
            logger.error('Error getting pending payouts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get pending payouts'
            });
        }
    }

    /**
     * Get list of approved submissions ready for manual payout
     * GET /api/admin/payouts/approved-submissions
     */
    async getApprovedSubmissions(req, res) {
        try {
            const { page = 1, limit = 20, status = 'all' } = req.query;
            const skip = (page - 1) * limit;

            // Look for payments with approved submissions based on actual reviewSubmission logic
            let whereClause;

            if (status === 'ready') {
                // Only payments specifically marked as ready for manual payout
                whereClause = {
                    status: { in: ['HELD_ESCROW', 'READY_FOR_MANUAL_PAYOUT'] },
                    OR: [
                        {
                            notes: {
                                path: ['readyForManualPayout'],
                                equals: true
                            }
                        },
                        {
                            notes: {
                                path: ['submissionApproved'],
                                equals: true
                            }
                        }
                    ]
                };
            } else {
                // All payments where submission has been approved (matches reviewSubmission logic)
                whereClause = {
                    status: { in: ['HELD_ESCROW', 'READY_FOR_MANUAL_PAYOUT'] },
                    OR: [
                        // Look for payments with submissionApproved flag (set by reviewSubmission)
                        {
                            notes: {
                                path: ['submissionApproved'],
                                equals: true
                            }
                        },
                        // Or payments where application status is CLOSED (happens after approval)
                        {
                            application: {
                                status: 'CLOSED',
                                submissions: {
                                    some: {
                                        status: 'APPROVED'
                                    }
                                }
                            }
                        },
                        // Or payments specifically marked for manual payout
                        {
                            notes: {
                                path: ['readyForManualPayout'],
                                equals: true
                            }
                        }
                    ]
                };
            }

            const approvedSubmissions = await prisma.payment.findMany({
                where: whereClause,
                include: {
                    application: {
                        include: {
                            gig: {
                                select: {
                                    id: true,
                                    title: true,
                                    category: true,
                                    postedById: true
                                }
                            },
                            submissions: {
                                where: {
                                    status: 'APPROVED'
                                },
                                select: {
                                    id: true,
                                    title: true,
                                    reviewedAt: true,
                                    status: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    heldEscrowAt: 'desc'
                },
                skip: parseInt(skip),
                take: parseInt(limit)
            });

            // Get total count for pagination
            const totalCount = await prisma.payment.count({
                where: whereClause
            });

            const totalAmount = approvedSubmissions.reduce((sum, payment) => sum + payment.creatorAmount, 0);

            res.json({
                success: true,
                data: {
                    submissions: approvedSubmissions.map(payment => ({
                        paymentId: payment.id,
                        gigId: payment.gigId,
                        gigTitle: payment.application.gig.title,
                        gigCategory: payment.application.gig.category,
                        applicationId: payment.applicationId,
                        creatorId: payment.paidTo,
                        brandId: payment.paidBy,
                        quotedPrice: payment.quotedPrice,
                        creatorAmount: payment.creatorAmount,
                        totalAmount: payment.totalAmount,
                        upiId: payment.application.upiId,
                        submissionTitle: payment.application.submissions[0]?.title,
                        approvedAt: payment.application.submissions[0]?.reviewedAt,
                        readyForPayoutAt: payment.notes?.approvedAt || payment.heldEscrowAt,
                        status: payment.notes?.awaitingManualPayout || payment.notes?.readyForManualPayout || payment.status === 'READY_FOR_MANUAL_PAYOUT' ? 'ready' : 'processing',
                        receipt: payment.receipt,
                        heldEscrowAt: payment.heldEscrowAt
                    })),
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalCount / limit),
                        totalCount: totalCount,
                        limit: parseInt(limit)
                    },
                    summary: {
                        totalSubmissions: approvedSubmissions.length,
                        totalAmount: totalAmount,
                        readyForPayout: approvedSubmissions.filter(p =>
                            p.notes?.awaitingManualPayout ||
                            p.notes?.readyForManualPayout ||
                            p.status === 'READY_FOR_MANUAL_PAYOUT' ||
                            (p.application.submissions && p.application.submissions.length > 0)
                        ).length
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting approved submissions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get approved submissions'
            });
        }
    }

    /**
     * Mark payment as manually paid and notify users
     * POST /api/admin/payouts/:paymentId/mark-paid
     */
    async markPaymentAsPaid(req, res) {
        try {
            const { paymentId } = req.params;
            const {
                transactionId,
                paymentMethod = 'Manual Bank Transfer',
                notes: adminNotes = '',
                notifyUsers = true
            } = req.body;
            const adminUserId = req.user?.id || req.headers['x-user-id'];

            if (!transactionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction ID is required'
                });
            }

            // Get payment details
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    application: {
                        include: {
                            gig: {
                                select: {
                                    id: true,
                                    title: true,
                                    postedById: true
                                }
                            },
                            submissions: {
                                where: {
                                    status: 'APPROVED'
                                },
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        }
                    }
                }
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            if (payment.status !== 'HELD_ESCROW') {
                return res.status(400).json({
                    success: false,
                    error: 'Payment is not in escrow status'
                });
            }

            // Update payment status to RELEASED
            const updatedPayment = await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'RELEASED',
                    releasedAt: new Date(),
                    notes: {
                        ...payment.notes,
                        manualPayoutCompleted: true,
                        manualPayoutCompletedAt: new Date().toISOString(),
                        manualPayoutBy: adminUserId,
                        transactionId: transactionId,
                        paymentMethod: paymentMethod,
                        adminNotes: adminNotes,
                        payoutProcessedAt: new Date().toISOString()
                    }
                }
            });

            // Update application status to CLOSED
            await prisma.application.update({
                where: { id: payment.applicationId },
                data: {
                    status: 'CLOSED'
                }
            });

            // Update work history payment status to PAID
            await prisma.applicationWorkHistory.updateMany({
                where: { applicationId: payment.applicationId },
                data: {
                    paymentStatus: 'PAID',
                    paidAt: new Date(),
                    lastActivityAt: new Date()
                }
            });

            let notificationResults = {};

            if (notifyUsers) {
                // Send notification to creator
                try {
                    await this.sendManualPayoutCompletionNotification({
                        recipientId: payment.paidTo,
                        recipientType: 'creator',
                        gigTitle: payment.application.gig.title,
                        amount: payment.creatorAmount,
                        transactionId: transactionId,
                        paymentMethod: paymentMethod,
                        upiId: payment.application.upiId
                    });
                    notificationResults.creatorNotified = true;
                } catch (error) {
                    console.error('⚠️ Failed to notify creator:', error);
                    notificationResults.creatorNotified = false;
                    notificationResults.creatorError = error.message;
                }

                // Send notification to brand
                try {
                    await this.sendManualPayoutCompletionNotification({
                        recipientId: payment.paidBy,
                        recipientType: 'brand',
                        gigTitle: payment.application.gig.title,
                        amount: payment.creatorAmount,
                        transactionId: transactionId,
                        paymentMethod: paymentMethod,
                        creatorId: payment.paidTo
                    });
                    notificationResults.brandNotified = true;
                } catch (error) {
                    console.error('⚠️ Failed to notify brand:', error);
                    notificationResults.brandNotified = false;
                    notificationResults.brandError = error.message;
                }
            }

            // Invalidate relevant caches
            try {
                await gigCacheService.invalidatePattern('user_applications:*');
                await gigCacheService.invalidatePattern('received_applications:*');
                await gigCacheService.invalidateGig(payment.gigId);
                console.log('✅ Invalidated caches after manual payout completion');
            } catch (cacheError) {
                console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
            }

            // Publish RabbitMQ event for manual payout completion
            try {
                await rabbitmqService.publishEvent('payment_released_notification', {
                    paymentId: payment.id,
                    gigId: payment.gigId,
                    applicationId: payment.applicationId,
                    creatorId: payment.paidTo,
                    brandId: payment.paidBy,
                    gigTitle: payment.application.gig.title,
                    creatorAmount: payment.creatorAmount,
                    totalAmount: payment.totalAmount,
                    transactionId: transactionId,
                    paymentMethod: paymentMethod,
                    paidAt: updatedPayment.releasedAt,
                    processedBy: adminUserId,
                    processType: 'MANUAL_PAYOUT',
                    upiId: payment.application.upiId,
                    submissionTitle: payment.application.submissions[0]?.title,
                    adminNotes: adminNotes
                });
                console.log('✅ Published payment_released_notification event to RabbitMQ');
            } catch (eventError) {
                console.error('⚠️ Failed to publish payment release event (non-critical):', eventError);
            }

            logger.info(`Payment manually marked as paid: ${paymentId} by admin: ${adminUserId}`);

            res.json({
                success: true,
                message: 'Payment marked as paid successfully',
                data: {
                    paymentId: payment.id,
                    gigTitle: payment.application.gig.title,
                    creatorAmount: payment.creatorAmount,
                    transactionId: transactionId,
                    paymentMethod: paymentMethod,
                    paidAt: updatedPayment.releasedAt,
                    notifications: notificationResults,
                    applicationStatus: 'CLOSED',
                    workHistoryStatus: 'PAID'
                }
            });

        } catch (error) {
            logger.error('Error marking payment as paid:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mark payment as paid'
            });
        }
    }

    /**
     * Send notification about manual payout completion
     * @param {Object} notificationData - Notification details
     */
    async sendManualPayoutCompletionNotification(notificationData) {
        try {
            const {
                recipientId,
                recipientType,
                gigTitle,
                amount,
                transactionId,
                paymentMethod,
                upiId,
                creatorId
            } = notificationData;

            console.log('📧 Sending manual payout completion notification:', {
                recipientId,
                recipientType,
                gigTitle,
                amount: `₹${amount}`,
                transactionId,
                paymentMethod
            });

            let message;
            if (recipientType === 'creator') {
                message = `💰 Payment Completed!

Great news! Your payment of ₹${amount} for "${gigTitle}" has been successfully processed.

Payment Details:
• Amount: ₹${amount}
• Transaction ID: ${transactionId}
• Payment Method: ${paymentMethod}
• UPI ID: ${upiId}

The funds should be available in your account. Thank you for your excellent work! 🎉`;
            } else {
                message = `💳 Payment Processed

The payment for "${gigTitle}" has been successfully processed to the creator.

Payment Details:
• Amount Paid: ₹${amount}
• Transaction ID: ${transactionId}
• Payment Method: ${paymentMethod}

The work has been completed and payment released. Thank you for using our platform! 🙏`;
            }

            console.log('📱 Notification message:', message);

            // TODO: Integrate with actual notification service
            logger.info(`Manual payout completion notification sent to ${recipientType} ${recipientId}: ₹${amount}`);

        } catch (error) {
            logger.error('Error sending manual payout completion notification:', error);
            throw error;
        }
    }
}

module.exports = new PayoutController();