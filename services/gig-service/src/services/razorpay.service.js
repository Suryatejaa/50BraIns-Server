// services/razorpay.service.js
const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }

    async createOrder(amount, gigId) {
        const options = {
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: `gig_${gigId}_${Date.now()}`,
            notes: { gigId }
        };
        return await this.razorpay.orders.create(options);
    }

    verifySignature(orderId, paymentId, signature) {
        const body = orderId + '|' + paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        return expectedSignature === signature;
    }


    // gig-service/src/services/razorpay.service.js (add this method)

    verifyWebhookSignature(payload, signature) {
        try {
            const crypto = require('crypto');

            const body = JSON.stringify(payload);
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
                .update(body)
                .digest('hex');

            console.log('🔍 Verifying webhook signature');
            console.log(`Expected: ${expectedSignature.substring(0, 20)}...`);
            console.log(`Received: ${signature.substring(0, 20)}...`);

            const isValid = expectedSignature === signature;
            console.log(`Result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

            return isValid;
        } catch (error) {
            console.error('❌ Webhook signature verification error:', error);
            return false;
        }
    }

}

module.exports = new RazorpayService();
