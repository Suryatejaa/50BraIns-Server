# Environment Variables for Platform Fee System

Add these environment variables to your .env file:

```bash
# Platform fee configuration
PLATFORM_FEE_PERCENT=10    # Default: 10% platform fee on creator's quoted price
GST_ON_FEE_PERCENT=0       # Default: 0% GST on platform fee (can be changed to 18% later)

# Razorpay configuration (existing)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## How the Fee System Works

1. **Creator applies with quoted price**: `₹1000`
2. **Platform fee calculated**: `₹1000 × 10% = ₹100`
3. **GST on fee calculated**: `₹100 × 0% = ₹0` (configurable)
4. **Total amount for brand**: `₹1000 + ₹100 + ₹0 = ₹1100`
5. **Creator receives**: `₹1000` (original quoted price)
6. **Platform keeps**: `₹100` (platform fee)

## API Flow

1. **POST /gigs/:id/apply** - Creator applies with quoted price, fees are calculated and stored
2. **POST /applications/:id/approve** - Brand approves, application status becomes `PAYMENT_PENDING`
3. **POST /applications/:id/payment/create** - Brand creates payment order for total amount
4. **POST /applications/payments/verify** - Payment is verified and held in escrow, application status becomes `WORK_IN_PROGRESS`
5. Creator can now start work with payment secured in escrow