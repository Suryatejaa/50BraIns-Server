// scripts/daily-payout-cron.js
// Simple cron job script to process daily payouts
// This should be scheduled to run every 24 hours

const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const GIG_SERVICE_URL = process.env.GIG_SERVICE_URL || 'http://localhost:4004';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'admin';
const ADMIN_AUTH_TOKEN = process.env.ADMIN_AUTH_TOKEN || 'admin-token';

async function processDailyPayouts() {
    try {
        console.log('🕐 Starting daily payout processing cron job...', {
            timestamp: new Date().toISOString(),
            gigServiceUrl: GIG_SERVICE_URL
        });

        const response = await fetch(`${GIG_SERVICE_URL}/admin/payouts/process-daily`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': ADMIN_USER_ID,
                'Authorization': `Bearer ${ADMIN_AUTH_TOKEN}`,
                'x-internal-service': 'cron-job'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('✅ Daily payout processing completed successfully:', {
                totalPayouts: result.data.totalPayouts,
                successfulPayouts: result.data.successfulPayouts,
                failedPayouts: result.data.failedPayouts,
                totalAmountProcessed: result.data.totalAmountProcessed
            });

            // Log individual results for monitoring
            if (result.data.results && result.data.results.length > 0) {
                console.log('\n📋 Payout Results:');
                result.data.results.forEach((payout, index) => {
                    if (payout.status === 'success') {
                        console.log(`  ${index + 1}. ✅ ${payout.gigTitle} - ₹${payout.creatorAmount} → ${payout.upiId}`);
                    } else {
                        console.log(`  ${index + 1}. ❌ ${payout.paymentId} - ${payout.message}`);
                    }
                });
            }

            // Send success notification or log to monitoring system
            await sendCronNotification('success', result.data);

        } else {
            console.error('❌ Daily payout processing failed:', {
                status: response.status,
                statusText: response.statusText,
                error: result.error || 'Unknown error'
            });

            // Send failure notification
            await sendCronNotification('failure', { error: result.error });
        }

    } catch (error) {
        console.error('❌ Error in daily payout cron job:', error);

        // Send critical error notification
        await sendCronNotification('critical_error', { error: error.message });
    }
}

async function sendCronNotification(status, data) {
    try {
        // TODO: Integrate with your notification system (email, Slack, etc.)

        const notifications = {
            success: `🎉 Daily Payouts Processed Successfully
            
Total Payouts: ${data.totalPayouts}
Successful: ${data.successfulPayouts}
Failed: ${data.failedPayouts}
Amount Processed: ₹${data.totalAmountProcessed}

Time: ${new Date().toISOString()}`,

            failure: `⚠️ Daily Payout Processing Failed

Error: ${data.error}
Time: ${new Date().toISOString()}

Please check the gig service logs for more details.`,

            critical_error: `🚨 CRITICAL: Daily Payout Cron Job Error

Error: ${data.error}
Time: ${new Date().toISOString()}

The daily payout processing system encountered a critical error. 
Immediate attention required!`
        };

        const message = notifications[status];

        console.log('\n📧 Notification:', message);

        // TODO: Replace with actual notification service
        // Examples:
        // - Send email via SendGrid/SES
        // - Post to Slack webhook
        // - Send to monitoring system (DataDog, New Relic, etc.)
        // - Log to external service

    } catch (notificationError) {
        console.error('❌ Failed to send cron notification:', notificationError);
    }
}

async function checkPendingPayouts() {
    try {
        console.log('🔍 Checking pending payouts...');

        const response = await fetch(`${GIG_SERVICE_URL}/admin/payouts/pending?days=1`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': ADMIN_USER_ID,
                'Authorization': `Bearer ${ADMIN_AUTH_TOKEN}`,
                'x-internal-service': 'cron-job'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('📊 Pending payouts status:', {
                pendingPayouts: result.data.pendingPayouts,
                totalAmount: `₹${result.data.totalAmount}`,
                payments: result.data.payments.map(p => ({
                    gig: p.gigTitle,
                    amount: `₹${p.creatorAmount}`,
                    upi: p.upiId
                }))
            });

            return result.data;
        } else {
            console.error('❌ Failed to check pending payouts:', result.error);
            return null;
        }

    } catch (error) {
        console.error('❌ Error checking pending payouts:', error);
        return null;
    }
}

// Main execution
async function main() {
    console.log('🚀 Daily Payout Cron Job Started');
    console.log('=================================');

    // First check what's pending
    const pendingData = await checkPendingPayouts();

    if (pendingData && pendingData.pendingPayouts > 0) {
        console.log(`\n💰 Processing ${pendingData.pendingPayouts} pending payouts...`);
        await processDailyPayouts();
    } else {
        console.log('\n✅ No pending payouts to process');
    }

    console.log('\n🏁 Daily Payout Cron Job Completed');
}

// Run the cron job
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error in cron job:', error);
        process.exit(1);
    });
}

module.exports = { processDailyPayouts, checkPendingPayouts };