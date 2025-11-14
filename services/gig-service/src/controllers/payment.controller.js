// controllers/payment.controller.js
const razorpayService = require('../services/razorpay.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const gigCacheService = require('../services/gigCacheService');

const prisma = new PrismaClient();

class PaymentController {
  /**
   * Create escrow payment order when brand approves application
   * POST /api/applications/:applicationId/payment/create
   */
  async createEscrowOrder(req, res) {
    const { applicationId } = req.params;
    const brandUserId = req.user.id;

    try {

      // Get application with gig details
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          gig: true,
          payment: true
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found'
        });
      }

      // Verify brand owns the gig
      if (application.gig.postedById !== brandUserId) {
        return res.status(403).json({
          success: false,
          error: 'Only gig owner can create payment'
        });
      }

      // Check if payment already exists
      if (application.payment) {
        return res.status(400).json({
          success: false,
          error: 'Payment already exists for this application'
        });
      }

      // Check if application is in payment pending status
      if (application.status !== 'PAYMENT_PENDING') {
        return res.status(400).json({
          success: false,
          error: 'Application must be approved and in payment pending status'
        });
      }

      // Use the calculated amounts from application
      const totalAmount = application.totalAmount;
      if (!totalAmount) {
        return res.status(400).json({
          success: false,
          error: 'No total amount calculated for this application'
        });
      }

      console.log('💰 Creating payment order for:', {
        applicationId,
        quotedPrice: application.quotedPrice,
        creatorFee: application.creatorFee,
        brandFee: application.brandFee,
        platformFee: application.platformFee,
        gstOnFee: application.gstOnFee,
        totalAmount: application.totalAmount
      });

      // Calculate creator amount (quoted price minus their fee)
      const creatorAmount = application.quotedPrice && application.creatorFee
        ? application.quotedPrice - application.creatorFee
        : application.quotedPrice;

      // Create Razorpay order for total amount (including platform fee)
      console.log('🔷 Creating Razorpay order...', { totalAmount, gigId: application.gigId });
      let order;
      try {
        order = await razorpayService.createOrder(totalAmount, application.gigId);
        console.log('✅ Razorpay order created:', { orderId: order.id });
      } catch (razorpayError) {
        console.error('❌ Razorpay service error:', {
          error: razorpayError,
          message: razorpayError?.message,
          stack: razorpayError?.stack,
          errorString: String(razorpayError)
        });
        throw razorpayError;
      }

      // Create payment record in escrow state
      console.log('🔷 Creating payment record in database...');
      const paymentData = {
        gigId: application.gigId,
        applicationId: applicationId,
        orderId: order.id,
        quotedPrice: application.quotedPrice,
        creatorFee: application.creatorFee,
        brandFee: application.brandFee,
        platformFee: application.platformFee,
        gstOnFee: application.gstOnFee,
        totalAmount: application.totalAmount,
        creatorAmount: creatorAmount, // Amount creator will receive after fee deduction
        currency: 'INR',
        status: 'CREATED',
        paidBy: brandUserId,
        paidTo: application.applicantId,
        receipt: order.receipt,
        description: `Payment for gig: ${application.gig.title}`,
        notes: {
          gigTitle: application.gig.title,
          applicationId: applicationId,
          quotedPrice: application.quotedPrice,
          creatorFee: application.creatorFee,
          brandFee: application.brandFee,
          platformFee: application.platformFee,
          gstOnFee: application.gstOnFee,
          totalAmount: application.totalAmount,
          creatorAmount: creatorAmount,
          feeStructure: 'Split: Creator pays 5%, Brand pays 5%'
        }
      };
      console.log('🔷 Payment data prepared:', JSON.stringify(paymentData, null, 2));

      const payment = await prisma.payment.create({
        data: paymentData
      });
      console.log('✅ Payment record created:', { paymentId: payment.id });

      // Update application payment status
      console.log('🔷 Updating application payment status...');
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'PAYMENT_PENDING' } // Keep application in payment pending until payment is verified
      });
      console.log('✅ Application payment status updated');

      logger.info(`Payment order created: ${payment.id} for application: ${applicationId}`);

      // Invalidate related caches after payment creation
      try {
        await gigCacheService.invalidateGig(application.gigId, application.gig.postedById);
        await gigCacheService.invalidateApplication(applicationId, application.gigId, application.applicantId);
        console.log('✅ Invalidated caches after payment creation');
      } catch (cacheError) {
        console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
        // Don't fail the payment creation if cache invalidation fails
      }

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          orderId: order.id,
          amount: order.amount, // Amount in paise for Razorpay
          quotedPrice: application.quotedPrice,
          creatorFee: application.creatorFee,
          brandFee: application.brandFee,
          platformFee: application.platformFee,
          gstOnFee: application.gstOnFee,
          totalAmount: application.totalAmount,
          creatorAmount: creatorAmount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID, // Razorpay key for frontend
          razorpayKeyId: process.env.RAZORPAY_KEY_ID, // Alternative field name
          receipt: order.receipt,
          notes: order.notes,
          feeBreakdown: {
            quotedPrice: application.quotedPrice,
            creatorFee: application.creatorFee,
            brandFee: application.brandFee,
            platformFee: application.platformFee,
            gstOnFee: application.gstOnFee,
            creatorWillReceive: creatorAmount,
            brandWillPay: application.totalAmount,
            note: 'Platform fee is split equally: Creator pays 5%, Brand pays 5%'
          }
        }
      });

    } catch (error) {
      console.error('❌ Detailed error creating escrow order:', {
        error: error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        message: error?.message,
        stack: error?.stack,
        errorString: String(error),
        errorJSON: JSON.stringify(error),
        applicationId: applicationId || 'undefined',
        userId: brandUserId || 'undefined'
      });
      logger.error('Error creating escrow order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment order',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Verify payment and move to escrow
   * POST /api/payments/verify
   */
  async verifyPayment(req, res) {
    try {
      const { orderId, paymentId, signature } = req.body;
      const userId = req.user.id;

      // Verify Razorpay signature
      const isValid = razorpayService.verifySignature(orderId, paymentId, signature);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment signature'
        });
      }

      // Get payment record
      const payment = await prisma.payment.findUnique({
        where: { orderId },
        include: {
          application: true,
          gig: true
        }
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      // Verify user owns this payment
      if (payment.paidBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Update payment to HELD_ESCROW
      const updatedPayment = await prisma.payment.update({
        where: { orderId },
        data: {
          paymentId: paymentId,
          signature: signature,
          status: 'HELD_ESCROW',
          authorizedAt: new Date(),
          heldEscrowAt: new Date()
        }
      });

      // Update application status
      await prisma.application.update({
        where: { id: payment.applicationId },
        data: {
          status: 'WORK_IN_PROGRESS'
        }
      });

      logger.info(`Payment verified and held in escrow: ${payment.id}`);

      // Invalidate related caches after payment verification
      try {
        await gigCacheService.invalidateGig(payment.gigId);
        await gigCacheService.invalidateApplication(payment.applicationId, payment.gigId, payment.application.applicantId);
        console.log('✅ Invalidated caches after payment verification');
      } catch (cacheError) {
        console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
        // Don't fail the verification if cache invalidation fails
      }

      // TODO: Send notification to creator that payment is secured

      res.json({
        success: true,
        message: 'Payment verified and secured in escrow',
        data: {
          paymentId: payment.id,
          status: 'HELD_ESCROW',
          message: 'Payment is now secured in escrow. Creator can start work.'
        }
      });

    } catch (error) {
      logger.error('Error verifying payment:', error);
      res.status(500).json({
        success: false,
        error: 'Payment verification failed'
      });
    }
  }

  /**
   * Manual payment verification for failed client verifications
   * POST /api/applications/:applicationId/payment/verify-manual
   * Use when client verification failed but payment was actually completed
   */
  async verifyPaymentManual(req, res) {
    try {
      const { applicationId } = req.params;
      const { paymentId, signature, forceVerify = false } = req.body;
      const userId = req.user.id;

      console.log('🔧 Manual payment verification requested:', {
        applicationId,
        paymentId,
        userId,
        forceVerify,
        requestBody: req.body
      });

      // Get payment record by application ID
      const payment = await prisma.payment.findUnique({
        where: { applicationId: applicationId },
        include: {
          application: {
            include: {
              gig: true
            }
          }
        }
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found for this application'
        });
      }

      // Verify user owns this payment (either brand who paid or admin)
      if (payment.paidBy !== userId && !req.user.role?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized - only payment creator or admin can verify'
        });
      }

      // Check if payment is already verified
      if (payment.status === 'HELD_ESCROW') {
        return res.status(200).json({
          success: true,
          message: 'Payment already verified and held in escrow',
          data: {
            paymentId: payment.id,
            orderId: payment.orderId,
            status: 'HELD_ESCROW',
            alreadyVerified: true
          }
        });
      }

      // Check if payment is in correct status for verification
      if (payment.status !== 'CREATED') {
        return res.status(400).json({
          success: false,
          error: `Payment cannot be verified. Current status: ${payment.status}`
        });
      }

      let signatureValid = false;

      if (forceVerify) {
        console.log('⚠️ Force verification requested - skipping signature check');
        signatureValid = true;
      } else if (paymentId && signature) {
        // Verify Razorpay signature if provided
        signatureValid = razorpayService.verifySignature(payment.orderId, paymentId, signature);
        console.log('🔍 Signature verification result:', signatureValid);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either provide paymentId and signature for verification, or set forceVerify=true'
        });
      }

      if (!signatureValid && !forceVerify) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment signature'
        });
      }

      // Update payment to HELD_ESCROW
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentId: paymentId || `manual_${Date.now()}`,
          signature: signature || 'manual_verification',
          status: 'HELD_ESCROW',
          authorizedAt: new Date(),
          heldEscrowAt: new Date(),
          notes: {
            ...payment.notes,
            manualVerification: true,
            verifiedBy: userId,
            verifiedAt: new Date().toISOString(),
            originalFailureReason: 'Client verification endpoint issue'
          }
        }
      });

      // Update application status
      await prisma.application.update({
        where: { id: payment.applicationId },
        data: {
          status: 'WORK_IN_PROGRESS'
        }
      });

      logger.info(`Payment manually verified: ${payment.id} by user: ${userId} for application: ${applicationId}`);

      // Invalidate related caches after manual verification
      try {
        await gigCacheService.invalidateGig(payment.gigId, payment.application.gig.postedById);
        await gigCacheService.invalidateApplication(applicationId, payment.gigId, payment.application.applicantId);
        console.log('✅ Invalidated caches after manual payment verification');
      } catch (cacheError) {
        console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
        // Don't fail the verification if cache invalidation fails
      }

      res.json({
        success: true,
        message: 'Payment manually verified and secured in escrow',
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          applicationId: applicationId,
          status: 'HELD_ESCROW',
          applicationStatus: 'WORK_IN_PROGRESS',
          message: 'Payment is now secured in escrow. Creator can start work.',
          verificationMethod: forceVerify ? 'force' : 'signature',
          verifiedBy: userId
        }
      });

    } catch (error) {
      console.error('❌ Error in manual payment verification:', error);
      logger.error('Error in manual payment verification:', error);
      res.status(500).json({
        success: false,
        error: 'Manual payment verification failed'
      });
    }
  }

  /**
   * Get payment status for application
   * GET /api/applications/:applicationId/payment
   */
  async getPaymentStatus(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          payment: true,
          gig: true,
          submission: true
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found'
        });
      }

      // Check if user has access (gig owner or applicant)
      if (application.gig.postedById !== userId && application.applicantId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Calculate creator amount for response
      const creatorAmount = application.quotedPrice && application.creatorFee
        ? application.quotedPrice - application.creatorFee
        : application.quotedPrice;

      res.json({
        success: true,
        data: {
          application: {
            id: application.id,
            status: application.status,
            paymentStatus: application.paymentStatus,
            amountDetails: {
              quotedPrice: application.quotedPrice,
              creatorFee: application.creatorFee,
              brandFee: application.brandFee,
              platformFee: application.platformFee,
              gstOnFee: application.gstOnFee,
              totalAmount: application.totalAmount,
              creatorAmount: creatorAmount,
              breakdown: {
                creatorReceives: creatorAmount,
                brandPays: application.totalAmount,
                platformFeeNote: 'Split equally: Creator pays 5%, Brand pays 5%'
              }
            }
          },
          payment: application.payment,
          submission: application.submission
        }
      });

    } catch (error) {
      logger.error('Error getting payment status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment status'
      });
    }
  }

  /**
   * Admin function to release payment manually
   * POST /api/payments/:paymentId/release
   */
  async releasePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { reason = 'Manual release' } = req.body;

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { application: true, gig: true }
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      if (payment.status !== 'HELD_ESCROW' && payment.status !== 'PENDING_RELEASE') {
        return res.status(400).json({
          success: false,
          error: `Payment cannot be released. Current status: ${payment.status}`
        });
      }

      // Release payment to creator
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          notes: {
            ...payment.notes,
            releaseReason: reason,
            releasedManually: true
          }
        }
      });

      // Update application
      await prisma.application.update({
        where: { id: payment.applicationId },
        data: { status: 'COMPLETED' }
      });

      // Process UPI payout to creator
      let payoutResult = null;
      try {
        // Validate UPI ID is present
        if (!payment.application.upiId) {
          throw new Error('Creator UPI ID is missing from application');
        }

        payoutResult = await this.processUpiPayout({
          upiId: payment.application.upiId,
          amount: payment.creatorAmount, // Amount creator receives (quotedPrice - creatorFee)
          currency: payment.currency,
          reference: payment.receipt,
          description: `Manual payment release for gig: ${payment.gig.title}`,
          gigId: payment.gigId,
          applicationId: payment.applicationId
        });

        console.log('💰 Manual UPI Payout processed successfully:', {
          payoutId: payoutResult.payoutId,
          amount: payment.creatorAmount,
          upiId: payment.application.upiId
        });

        // Update payment record with payout details
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            notes: {
              ...updatedPayment.notes,
              payoutId: payoutResult.payoutId,
              payoutStatus: payoutResult.status,
              payoutProcessedAt: payoutResult.processedAt
            }
          }
        });

      } catch (payoutError) {
        console.error('❌ Manual UPI Payout failed:', payoutError);
        // Log the error but don't fail the manual release
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            notes: {
              ...updatedPayment.notes,
              payoutError: payoutError.message,
              payoutStatus: 'FAILED',
              requiresManualPayout: true
            }
          }
        });
      }

      logger.info(`Payment released: ${paymentId}, reason: ${reason}`);

      // Invalidate related caches after payment release
      try {
        await gigCacheService.invalidateGig(payment.gigId);
        await gigCacheService.invalidateApplication(payment.applicationId, payment.gigId, payment.application.applicantId);
        console.log('✅ Invalidated caches after payment release');
      } catch (cacheError) {
        console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
        // Don't fail the release if cache invalidation fails
      }

      // TODO: 
      // 1. Send notification to creator
      // 2. Trigger actual payout via Razorpay Payouts or bank transfer
      // 3. Update creator's earnings

      res.json({
        success: true,
        message: 'Payment released to creator',
        data: {
          ...updatedPayment,
          payout: payoutResult ? {
            payoutId: payoutResult.payoutId,
            status: payoutResult.status,
            amount: payoutResult.amount,
            upiId: payoutResult.upiId,
            processedAt: payoutResult.processedAt
          } : null,
          amountReleased: payment.creatorAmount,
          releaseNote: `₹${payment.creatorAmount} released to UPI: ${payment.application.upiId}`
        }
      });

    } catch (error) {
      logger.error('Error releasing payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to release payment'
      });
    }
  }

  /**
   * Helper method to process UPI payout to creator
   * TODO: Implement actual Razorpay Payouts API integration
   * @param {Object} payoutData - Payout details
   * @returns {Object} - Payout result
   */
  async processUpiPayout(payoutData) {
    try {
      const { upiId, amount, currency, reference, description, gigId, applicationId } = payoutData;

      console.log('💸 Processing UPI Payout:', {
        upiId,
        amount,
        currency,
        reference,
        description,
        gigId,
        applicationId
      });

      // Use actual Razorpay Payouts API
      const payoutResult = await razorpayService.createPayout({
        upiId,
        amount,
        currency,
        reference,
        description,
        gigId,
        applicationId
      });

      logger.info(`UPI Payout processed: ${payoutResult.payoutId} to ${upiId} for amount ${amount}`);
      return payoutResult;

    } catch (error) {
      logger.error('Error processing UPI payout:', error);
      throw new Error(`UPI payout failed: ${error.message}`);
    }
  }

  /**
   * Auto-approve submissions and release payments after deadline
   * This should be called by a cron job every hour
   * POST /api/admin/payments/auto-approve
   */
  async autoApproveExpiredSubmissions(req, res) {
    try {
      const now = new Date();

      // Find payments with expired review deadlines
      
      const expiredPayments = await prisma.payment.findMany({
        where: {
          status: 'PENDING_RELEASE',
          releaseDeadlineAt: {
            lt: now
          }
        },
        include: {
          submission: true,
          application: true,
          gig: true
        }
      });

      const results = [];

      for (const payment of expiredPayments) {
        try {
          // Auto-approve submission and release payment
          const result = await prisma.$transaction(async (tx) => {
            // Update submission to auto-approved
            const updatedSubmission = await tx.submission.update({
              where: { paymentId: payment.id },
              data: {
                status: 'AUTO_APPROVED',
                approvedAt: now
              }
            });

            // Release payment
            const updatedPayment = await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'RELEASED',
                releasedAt: now,
                notes: {
                  ...payment.notes,
                  releaseReason: 'Auto-approved after 48h deadline',
                  autoReleased: true
                }
              }
            });

            // Complete application
            await tx.application.update({
              where: { id: payment.applicationId },
              data: { status: 'COMPLETED' }
            });

            return { submission: updatedSubmission, payment: updatedPayment };
          });

          results.push({
            paymentId: payment.id,
            submissionId: payment.submission?.id,
            status: 'success',
            message: 'Auto-approved and payment released'
          });

          logger.info(`Auto-approved submission and released payment: ${payment.id}`);

          // TODO: Send notification to both brand and creator

        } catch (error) {
          logger.error(`Failed to auto-approve payment ${payment.id}:`, error);
          results.push({
            paymentId: payment.id,
            status: 'error',
            message: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Processed ${expiredPayments.length} expired payments`,
        data: {
          processed: expiredPayments.length,
          results: results
        }
      });

    } catch (error) {
      logger.error('Error auto-approving expired submissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-approve expired submissions'
      });
    }
  }
}

module.exports = new PaymentController();
