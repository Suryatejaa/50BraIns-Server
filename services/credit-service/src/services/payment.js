const Razorpay = require('razorpay');
const Stripe = require('stripe');

class PaymentService {
    constructor() {
        // Initialize Razorpay
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // Initialize Stripe
        this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    }

    // Razorpay Methods
    async createRazorpayOrder(amount, credits, userId, packageId = null) {
        try {
            const options = {
                amount: Math.round(amount * 100), // Amount in paise
                currency: 'INR',
                receipt: `credit_${userId}_${Date.now()}`,
                notes: {
                    userId,
                    credits: credits.toString(),
                    packageId: packageId || 'custom',
                    service: 'credit-service'
                }
            };

            const order = await this.razorpay.orders.create(options);

            return {
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID,
                order
            };
        } catch (error) {
            console.error('Razorpay order creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyRazorpayPayment(paymentId, orderId, signature) {
        try {
            const crypto = require('crypto');
            const body = orderId + '|' + paymentId;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            console.error('Razorpay verification failed:', error);
            return false;
        }
    }

    async getRazorpayPayment(paymentId) {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return {
                success: true,
                payment
            };
        } catch (error) {
            console.error('Razorpay payment fetch failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Stripe Methods
    async createStripePaymentIntent(amount, credits, userId, packageId = null) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Amount in paise
                currency: 'inr',
                metadata: {
                    userId,
                    credits: credits.toString(),
                    packageId: packageId || 'custom',
                    service: 'credit-service'
                },
                description: `${credits} credits for user ${userId}`
            });

            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            };
        } catch (error) {
            console.error('Stripe payment intent creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyStripePayment(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

            return {
                success: true,
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                metadata: paymentIntent.metadata,
                paymentIntent
            };
        } catch (error) {
            console.error('Stripe payment verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Webhook signature verification
    verifyStripeWebhook(payload, signature) {
        try {
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!endpointSecret) {
                throw new Error('Stripe webhook secret not configured');
            }

            const event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
            return {
                success: true,
                event
            };
        } catch (error) {
            console.error('Stripe webhook verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Refund methods
    async createRazorpayRefund(paymentId, amount) {
        try {
            const refund = await this.razorpay.payments.refund(paymentId, {
                amount: Math.round(amount * 100), // Amount in paise
                notes: {
                    reason: 'Credit service refund',
                    service: 'credit-service'
                }
            });

            return {
                success: true,
                refund
            };
        } catch (error) {
            console.error('Razorpay refund failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createStripeRefund(paymentIntentId, amount) {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: Math.round(amount * 100), // Amount in paise
                metadata: {
                    reason: 'Credit service refund',
                    service: 'credit-service'
                }
            });

            return {
                success: true,
                refund
            };
        } catch (error) {
            console.error('Stripe refund failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Utility methods
    getPaymentGateways() {
        return {
            razorpay: {
                available: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
                name: 'Razorpay',
                currencies: ['INR']
            },
            stripe: {
                available: !!process.env.STRIPE_SECRET_KEY,
                name: 'Stripe',
                currencies: ['INR', 'USD']
            }
        };
    }
}

// Create singleton instance
const paymentService = new PaymentService();

module.exports = paymentService;
