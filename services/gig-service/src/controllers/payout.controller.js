// controllers/payout.controller.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const gigCacheService = require('../services/gigCacheService');

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
                            submission: {
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
                    if (!payment.application.submission || payment.application.submission.length === 0) {
                        console.log(`⚠️ Skipping payment ${payment.id} - No approved submission found`);
                        continue;
                    }

                    const submission = payment.application.submission[0];

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

                    // TODO: Replace with actual Cashfree payout integration
                    // For now, simulate the payout processing
                    const payoutResult = await this.processCashfreePayout({
                        paymentId: payment.id,
                        upiId: payment.application.upiId,
                        amount: payment.creatorAmount,
                        currency: payment.currency,
                        reference: payment.receipt,
                        description: `Payout for gig: ${payment.application.gig.title}`,
                        gigId: payment.gigId,
                        applicationId: payment.applicationId
                    });

                    // Update payment status to RELEASED with payout details
                    const updatedPayment = await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: 'RELEASED',
                            releasedAt: new Date(),
                            notes: {
                                ...payment.notes,
                                payoutProcessedAt: new Date().toISOString(),
                                payoutMethod: 'Cashfree',
                                payoutId: payoutResult.payoutId,
                                payoutStatus: payoutResult.status,
                                processedByCronJob: true,
                                cronJobRunAt: now.toISOString()
                            }
                        }
                    });

                    // Update work history payment status
                    await prisma.applicationWorkHistory.updateMany({
                        where: { applicationId: payment.applicationId },
                        data: {
                            paymentStatus: 'PAID',
                            lastActivityAt: new Date()
                        }
                    });

                    totalAmount += payment.creatorAmount;

                    results.push({
                        paymentId: payment.id,
                        gigTitle: payment.application.gig.title,
                        creatorAmount: payment.creatorAmount,
                        upiId: payment.application.upiId,
                        payoutId: payoutResult.payoutId,
                        status: 'success',
                        message: 'Payout processed successfully'
                    });

                    // Send notification to creator about payment initiation
                    try {
                        await this.sendPayoutNotification({
                            recipientId: payment.paidTo,
                            gigTitle: payment.application.gig.title,
                            amount: payment.creatorAmount,
                            payoutId: payoutResult.payoutId,
                            upiId: payment.application.upiId
                        });
                    } catch (notificationError) {
                        console.error('⚠️ Failed to send payout notification:', notificationError);
                        // Don't fail the payout if notification fails
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
                    notes: {
                        path: ['submissionApproved'],
                        equals: true
                    },
                    heldEscrowAt: {
                        gte: daysAgo
                    }
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
                            submission: {
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
                        approvedAt: payment.application.submission[0]?.reviewedAt,
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
}

module.exports = new PayoutController();