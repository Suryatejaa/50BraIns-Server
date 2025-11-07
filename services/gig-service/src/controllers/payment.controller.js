// controllers/payment.controller.js
const razorpayService = require('../services/razorpay.service');

class PaymentController {
  // Create order when brand approves application
  async createOrder(req, res) {
    const { gigId } = req.params;
    const { amount } = req.body;

    const order = await razorpayService.createOrder(amount, gigId);
    
    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      }
    });
  }

  // Verify payment after user completes
  async verifyPayment(req, res) {
    const { orderId, paymentId, signature } = req.body;

    const isValid = razorpayService.verifySignature(orderId, paymentId, signature);
    
    if (isValid) {
      // Update gig payment status in DB
      res.json({ success: true, message: 'Payment verified' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  }
}

module.exports = new PaymentController();
