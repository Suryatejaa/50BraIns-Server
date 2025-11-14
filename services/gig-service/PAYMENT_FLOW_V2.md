# New Payment Flow Documentation

## Overview
The payment system has been updated to use a two-phase approach:
1. **Razorpay** for holding payments in escrow
2. **Cashfree** for processing payouts to creators

## Payment Flow

### Phase 1: Payment Collection & Escrow
1. Brand approves application → Payment created in Razorpay
2. Brand pays → Payment held in `HELD_ESCROW` status
3. Creator submits work
4. Brand reviews submission

### Phase 2: Submission Approval (Updated Flow)
When brand approves submission:

✅ **What Happens Now:**
- Submission status → `APPROVED`
- Application status → `CLOSED`
- Payment status → **Remains `HELD_ESCROW`** (NOT released immediately)
- Work history payment status → `PENDING`
- Creator gets notification: "Payment will be processed within 2-3 working days"

❌ **What NO LONGER Happens:**
- ~~Payment status → RELEASED~~
- ~~Immediate Razorpay payout~~
- ~~Real-time money transfer~~

### Phase 3: Daily Payout Processing
**Automated Daily Cron Job:**
- Runs every 24 hours
- Finds submissions approved in last 24 hours
- Processes Cashfree payouts for eligible payments
- Updates payment status to `RELEASED`
- Updates work history payment status to `PAID`
- Sends "Payment Initiated" notification to creators

## Implementation Details

### 1. Updated Notification Messages

**Creator Notification (On Approval):**
```
🎉 Work Approved!

Your payment of ₹950 will be processed within 2-3 working days.

Most creators receive payment within 24-48 hours of approval.

We'll send you a notification once the payment is initiated!
```

**Brand Notification (On Approval):**
```
Great! You've approved the submission for "Gig Title". 
Payment of ₹950 will be processed to the creator within 2-3 working days. 
The gig is now complete.
```

### 2. Database Changes

**Payment Table:**
- Status remains `HELD_ESCROW` after approval
- New notes fields track approval and cron processing:
  ```json
  {
    "submissionApproved": true,
    "approvedSubmissionId": "submission_id",
    "approvedAt": "2025-11-10T18:00:00Z",
    "pendingCronProcessing": true,
    "payoutMethod": "Cashfree via daily cron job"
  }
  ```

**Work History Table:**
- `paymentStatus` set to `PENDING` (not `PAID`) after approval
- Updated to `PAID` only after cron job processes payout

### 3. New API Endpoints

**Admin Endpoints:**
- `GET /admin/payouts/pending` - View pending payouts
- `POST /admin/payouts/process-daily` - Trigger daily payout processing

### 4. Cron Job Setup

**Manual Test:**
```bash
npm run cron:daily-payouts
```

**Check Pending:**
```bash
npm run cron:check-pending
```

**Production Setup:**
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * /usr/bin/node /path/to/gig-service/scripts/daily-payout-cron.js
```

## Benefits of New Flow

### 1. Financial Control
- 24-hour buffer to maintain account balance
- Better cash flow management
- Reduced risk of insufficient funds

### 2. Operational Benefits
- Batch processing reduces transaction costs
- Centralized payout monitoring
- Better error handling and retry mechanisms

### 3. User Experience
- Clear expectations (2-3 working days)
- Proper notifications at each stage
- Transparent payment status tracking

## Monitoring & Alerts

### Success Metrics
- Daily payout processing logs
- Success/failure rates
- Total amounts processed

### Alert Conditions
- Failed payout processing
- Cron job failures
- Large pending amounts
- Missing UPI IDs

### Log Examples

**Successful Processing:**
```
✅ Daily payout processing completed successfully:
- Total Payouts: 15
- Successful: 14
- Failed: 1
- Amount Processed: ₹12,450
```

**Individual Payout:**
```
💸 Processing payout for payment abc123:
- Gig: "Instagram Reel Creation"
- Amount: ₹950
- UPI: creator@paytm
- Status: SUCCESS
```

## Integration Points

### Cashfree Integration (TODO)
Replace simulation with actual Cashfree Payouts API:
```javascript
// In payout.controller.js
async processCashfreePayout(payoutData) {
  // TODO: Replace simulation with:
  // 1. Cashfree Payouts API call
  // 2. Real money transfer
  // 3. Transaction verification
  // 4. Status tracking
}
```

### Notification Service (TODO)
Integrate with actual notification system:
```javascript
// Current: Console logs
// TODO: Email, SMS, Push notifications
await sendPayoutNotification({
  recipientId: userId,
  message: "Payment initiated",
  channels: ['email', 'sms', 'push']
});
```

## Testing

### Test Scenarios
1. **Normal Flow:** Submit → Approve → Wait 24h → Check payout
2. **Error Handling:** Missing UPI ID, failed payout, network errors
3. **Edge Cases:** Multiple approvals, weekend processing, holidays

### Test Commands
```bash
# Check current pending payouts
curl -X GET http://localhost:4004/admin/payouts/pending

# Trigger manual payout processing
curl -X POST http://localhost:4004/admin/payouts/process-daily
```

## Migration Notes

### Existing Payments
- Payments already in `RELEASED` status remain unchanged
- New approvals use the updated flow
- No database migration required

### Rollback Plan
If issues arise, can temporarily revert to immediate payouts by:
1. Uncommenting old payout code in `reviewSubmission`
2. Commenting out new escrow-holding logic
3. Restarting service

---

**Status:** ✅ Implemented and Ready for Testing
**Next Steps:** 
1. Test with sample transactions
2. Set up production cron job
3. Integrate Cashfree Payouts API
4. Set up monitoring alerts