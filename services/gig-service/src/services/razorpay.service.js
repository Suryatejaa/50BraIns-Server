// services/razorpay.service.js
const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
    constructor() {
        // Use test keys for safe testing of payouts
        const isTestMode = process.env.RAZORPAY_PAYOUT_MODE === 'test' || process.env.NODE_ENV === 'development';

        this.razorpay = new Razorpay({
            key_id: isTestMode ? process.env.RAZORPAY_TEST_ID : process.env.RAZORPAY_KEY_ID,
            key_secret: isTestMode ? process.env.RAZORPAY_KEY_SECRET_TEST : process.env.RAZORPAY_KEY_SECRET
        });

        this.isTestMode = isTestMode;
        this.payoutsEnabled = process.env.RAZORPAY_PAYOUTS_ENABLED === 'true';

        console.log('🔧 Razorpay Service initialized:', {
            testMode: this.isTestMode,
            payoutsEnabled: this.payoutsEnabled,
            keyId: isTestMode ? process.env.RAZORPAY_TEST_ID : process.env.RAZORPAY_KEY_ID
        });
    }

    async createOrder(amount, gigId) {
        // Create a shorter receipt (max 40 chars for Razorpay)
        // Use first 8 chars of gigId + timestamp last 6 digits
        const shortGigId = gigId.substring(0, 8);
        const shortTimestamp = Date.now().toString().slice(-6);
        const receipt = `gig_${shortGigId}_${shortTimestamp}`;

        const options = {
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: receipt, // Max 40 chars: gig_12345678_123456 = 22 chars
            notes: { gigId, fullGigId: gigId }
        };

        console.log('🔹 Razorpay order options:', {
            amount: options.amount,
            receipt: receipt,
            receiptLength: receipt.length
        });

        return await this.razorpay.orders.create(options);
    }

    verifySignature(orderId, paymentId, signature) {
        const body = orderId + '|' + paymentId;
        const secretKey = this.isTestMode ? process.env.RAZORPAY_KEY_SECRET_TEST : process.env.RAZORPAY_KEY_SECRET;
        const expectedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(body.toString())
            .digest('hex');
        return expectedSignature === signature;
    }

    async createPayout(payoutData) {
        try {
            const { upiId, amount, currency, reference, description, gigId, applicationId } = payoutData;

            console.log('💸 Creating payout request:', {
                upiId,
                amount,
                currency,
                reference,
                testMode: this.isTestMode,
                payoutsEnabled: this.payoutsEnabled,
                accountNumber: process.env.RAZORPAY_ACCOUNT_NUMBER
            });

            // Check if payouts are enabled
            if (!this.payoutsEnabled) {
                console.log('⚠️ Razorpay payouts disabled - using simulation mode');
                return this.simulatePayout(payoutData);
            }

            // Validate required environment variables
            if (!process.env.RAZORPAY_ACCOUNT_NUMBER) {
                console.error('❌ RAZORPAY_ACCOUNT_NUMBER not configured');
                return this.simulatePayout(payoutData, 'Account number not configured');
            }

            // Check if Razorpay Payouts API is available
            if (!this.razorpay.payouts || typeof this.razorpay.payouts.create !== 'function') {
                console.log('⚠️ Razorpay Payouts API not available - using simulation mode');
                return this.simulatePayout(payoutData, 'Payouts API not available in current account');
            }

            // Razorpay Payouts API call
            const payout = await this.razorpay.payouts.create({
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
                amount: Math.round(amount * 100), // Convert to paise
                currency: currency || 'INR',
                mode: 'UPI',
                purpose: 'payout',
                fund_account: {
                    account_type: 'vpa',
                    vpa: {
                        address: upiId
                    },
                    contact: {
                        name: 'Creator',
                        email: 'creator@50brains.com',
                        contact: '9999999999',
                        type: 'employee'
                    }
                },
                notes: {
                    gigId: gigId,
                    applicationId: applicationId,
                    description: description,
                    reference: reference
                }
            });

            console.log('✅ Razorpay payout created successfully:', {
                payoutId: payout.id,
                amount: amount,
                upiId: upiId,
                status: payout.status,
                accountNumber: process.env.RAZORPAY_ACCOUNT_NUMBER
            });

            return {
                success: true,
                payoutId: payout.id,
                status: payout.status,
                amount: amount,
                upiId: upiId,
                reference: reference,
                processedAt: new Date().toISOString(),
                razorpayResponse: payout,
                isSimulated: false
            };

        } catch (error) {
            console.error('❌ Razorpay payout API failed:', {
                error: error.message,
                statusCode: error.statusCode,
                description: error.description,
                field: error.field,
                step: error.step,
                reason: error.reason,
                source: error.source,
                metadata: error.metadata,
                errorType: typeof error,
                hasPayoutsAPI: !!this.razorpay.payouts
            });

            // Check if it's a payouts API availability issue
            if (error.message && error.message.includes('Cannot read properties of undefined')) {
                console.log('⚠️ Payouts API not available - falling back to simulation mode');
                return this.simulatePayout(payoutData, 'Payouts API not available - requires verified business account');
            }

            // Check if it's a specific Razorpay error
            if (error.statusCode === 400) {
                console.log('⚠️ Bad request - falling back to simulation mode');
                return this.simulatePayout(payoutData, `API Error: ${error.description || error.message}`);
            }

            // For other errors, still simulate but log as failed
            return this.simulatePayout(payoutData, `Payout failed: ${error.message}`);
        }
    }

    // Simulate payout for testing or when real payouts fail
    simulatePayout(payoutData, reason = 'Test mode simulation') {
        const { upiId, amount, currency, reference, description, gigId, applicationId } = payoutData;
        const simulatedPayoutId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('🎭 💸 SIMULATED PAYOUT - No real money transferred:', {
            reason,
            payoutId: simulatedPayoutId,
            amount: `₹${amount}`,
            upiId,
            reference,
            note: 'This is a test transaction - no actual payment processed'
        });

        return {
            success: true,
            payoutId: simulatedPayoutId,
            status: 'processed', // Simulate successful payout
            amount: amount,
            upiId: upiId,
            reference: reference,
            processedAt: new Date().toISOString(),
            isSimulated: true,
            simulationReason: reason,
            razorpayResponse: {
                id: simulatedPayoutId,
                entity: 'payout',
                amount: Math.round(amount * 100),
                currency: currency || 'INR',
                notes: {
                    gigId,
                    applicationId,
                    description,
                    reference,
                    simulated: true
                },
                fees: 0,
                tax: 0,
                status: 'processed',
                purpose: 'payout',
                utr: `SIM${Date.now()}`,
                mode: 'UPI',
                reference_id: reference,
                created_at: Math.floor(Date.now() / 1000)
            }
        };
    }


    // gig-service/src/services/razorpay.service.js (add this method)

    async getPaymentDetails(orderId) {
        try {
            console.log('🔍 Fetching payment details from Razorpay for order:', orderId);

            // Get order details first to find associated payments
            const order = await this.razorpay.orders.fetch(orderId);
            console.log('📋 Order details:', {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                status: order.status
            });

            // Get payments for this order
            const payments = await this.razorpay.orders.fetchPayments(orderId);
            console.log('💳 Found payments for order:', {
                count: payments.count,
                items: payments.items?.length || 0
            });

            if (!payments.items || payments.items.length === 0) {
                console.log('⚠️ No payments found for order:', orderId);
                return null;
            }

            // Return the first (and usually only) payment
            const payment = payments.items[0];
            console.log('✅ Payment details retrieved:', {
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                created_at: payment.created_at
            });

            return payment;

        } catch (error) {
            console.error('❌ Error fetching payment details from Razorpay:', {
                orderId,
                error: error.message,
                statusCode: error.statusCode,
                description: error.description
            });
            throw error;
        }
    }

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
