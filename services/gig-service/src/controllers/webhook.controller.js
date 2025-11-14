// gig-service/src/controllers/webhook.controller.js
const razorpayService = require('../services/razorpay.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger'); // Use your logger

const prisma = new PrismaClient();

class WebhookController {
  /**
   * Handle Razorpay webhooks
   * POST /api/webhooks/razorpay
   */
  async handleRazorpayWebhook(req, res) {
    try {
      console.log('🔔 Webhook received from Razorpay');

      const webhookBody = req.body;
      const signature = req.headers['x-razorpay-signature'];

      if (!signature) {
        console.error('❌ Missing webhook signature header');
        return res.status(400).json({
          success: false,
          error: 'Missing signature'
        });
      }

      // Verify webhook signature
      const isValidSignature = razorpayService.verifyWebhookSignature(
        webhookBody,
        signature
      );

      if (!isValidSignature) {
        console.error('❌ Invalid webhook signature');
        logger.error('Invalid webhook signature', {
          expectedPattern: 'sha256(body, secret)',
          received: signature
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid signature'
        });
      }

      console.log(`✅ Webhook signature verified`);

      // Extract event type
      const event = webhookBody.event;
      const payload = webhookBody.payload;

      console.log(`📢 Processing event: ${event}`);

      // Handle different events
      switch (event) {
        case 'payment.authorized':
          await this.handlePaymentAuthorized(payload);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;

        case 'payment.captured':
          await this.handlePaymentCaptured(payload);
          break;

        case 'refund.created':
          await this.handleRefundCreated(payload);
          break;

        case 'payment.dispute.created':
          await this.handleDisputeCreated(payload);
          break;

        default:
          console.log(`⚠️ Unhandled event: ${event}`);
      }

      // Always respond with 200 OK immediately
      // (Don't block - process async)
      res.status(200).json({
        success: true,
        message: 'Webhook received and queued for processing'
      });

    } catch (error) {
      console.error('❌ Webhook error:', error);
      logger.error('Webhook processing failed', { error: error.message });

      // Return 500 so Razorpay retries
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }

  /**
   * Handle payment.authorized event
   * Payment captured and held in escrow
   */
  async handlePaymentAuthorized(payload) {
    try {
      const { payment } = payload;
      const paymentId = payment.entity.id;
      const orderId = payment.entity.order_id;
      const amount = payment.entity.amount;

      console.log(`💳 Payment authorized: ${paymentId} for order: ${orderId}`);

      // Find payment record
      const dbPayment = await prisma.payment.findUnique({
        where: { orderId },
        include: { application: true, gig: true }
      });

      if (!dbPayment) {
        console.warn(`⚠️ Payment not found for order: ${orderId}`);
        return;
      }

      // Update payment to HELD_ESCROW (authorized and secured)
      const updated = await prisma.payment.update({
        where: { orderId },
        data: {
          paymentId,
          status: 'HELD_ESCROW',
          authorizedAt: new Date(),
          heldEscrowAt: new Date()
        }
      });

      // Update application status
      await prisma.application.update({
        where: { id: dbPayment.applicationId },
        data: {
          paymentStatus: 'PAID',
          status: 'WORK_IN_PROGRESS'
        }
      });

      console.log(`✅ Payment ${dbPayment.id} held in escrow`);

      // TODO: Send notification to creator that payment is secured and they can start work

    } catch (error) {
      console.error('Error handling payment.authorized:', error);
      logger.error('Payment authorized webhook failed', { error: error.message });
    }
  }

  /**
   * Handle payment.failed event
   */
  async handlePaymentFailed(payload) {
    try {
      const { payment } = payload;
      const orderId = payment.entity.order_id;
      const errorReason = payment.entity.error_code;
      const errorDescription = payment.entity.error_description;

      console.log(`❌ Payment failed for order: ${orderId}, reason: ${errorDescription}`);

      // Update payment record
      const updated = await prisma.payment.update({
        where: { orderId },
        data: {
          status: 'FAILED',
          failedAt: new Date()
        }
      });

      console.log(`✅ Payment ${updated.id} marked as FAILED`);

      // TODO: Send notification to brand
      // await sendNotification(updated.paidBy, `Payment failed: ${errorDescription}`);

    } catch (error) {
      console.error('Error handling payment.failed:', error);
      logger.error('Payment failed webhook failed', { error: error.message });
    }
  }

  /**
   * Handle payment.captured event
   * This confirms payment is fully processed in escrow
   */
  async handlePaymentCaptured(payload) {
    try {
      const { payment } = payload;
      const paymentId = payment.entity.id;
      const orderId = payment.entity.order_id;
      const amount = payment.entity.amount;

      console.log(`✅ Payment captured: ${paymentId} for order: ${orderId}`);

      // Get payment record
      const dbPayment = await prisma.payment.findUnique({
        where: { orderId },
        include: {
          application: true,
          gig: true
        }
      });

      if (!dbPayment) {
        console.warn(`⚠️ Payment not found for order: ${orderId}`);
        return;
      }

      // Ensure payment is in escrow (not auto-releasing yet)
      if (dbPayment.status !== 'HELD_ESCROW') {
        const updated = await prisma.payment.update({
          where: { orderId },
          data: {
            status: 'HELD_ESCROW',
            heldEscrowAt: new Date()
          }
        });
        console.log(`✅ Payment ${updated.id} confirmed in escrow`);
      }

      // TODO: 
      // 1. Send notification to creator that work can begin
      // 2. Send confirmation to brand that payment is secured

    } catch (error) {
      console.error('Error handling payment.captured:', error);
      logger.error('Payment captured webhook failed', { error: error.message });
    }
  }

  /**
   * Handle refund.created event
   */
  async handleRefundCreated(payload) {
    try {
      const { refund } = payload;
      const paymentId = refund.entity.payment_id;
      const refundAmount = refund.entity.amount;
      const refundReason = refund.entity.notes?.reason || 'No reason provided';

      console.log(`🔄 Refund created for payment: ${paymentId}, amount: ₹${refundAmount / 100}`);

      const dbPayment = await prisma.payment.findUnique({
        where: { paymentId }
      });

      if (dbPayment) {
        await prisma.payment.update({
          where: { paymentId },
          data: {
            status: 'REFUNDED'
          }
        });

        console.log(`✅ Payment ${dbPayment.id} marked as REFUNDED`);

        // TODO: Send notification
        // await sendNotification(dbPayment.paidBy, 'Payment refunded');
      }

    } catch (error) {
      console.error('Error handling refund.created:', error);
      logger.error('Refund webhook failed', { error: error.message });
    }
  }

  /**
   * Handle payment.dispute.created event
   */
  async handleDisputeCreated(payload) {
    try {
      const { dispute } = payload;
      const paymentId = dispute.entity.payment_id;
      const disputeAmount = dispute.entity.amount;
      const reason = dispute.entity.reason_code;

      console.log(`⚠️ Dispute created for payment: ${paymentId}, reason: ${reason}`);

      const dbPayment = await prisma.payment.findUnique({
        where: { paymentId }
      });

      if (dbPayment) {
        await prisma.payment.update({
          where: { paymentId },
          data: {
            status: 'DISPUTED'
          }
        });

        console.log(`⚠️ Payment ${dbPayment.id} marked as DISPUTED`);

        // TODO: Alert admin
        // await alertAdmin(`Dispute on payment: ${paymentId}`);
      }

    } catch (error) {
      console.error('Error handling payment.dispute.created:', error);
      logger.error('Dispute webhook failed', { error: error.message });
    }
  }
}

module.exports = new WebhookController();
