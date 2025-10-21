const express = require('express');
const CreditController = require('../controllers/creditController');
const { authenticateJWT } = require('../middleware/auth');
const { paymentRateLimit } = require('../middleware/rateLimiter');

const router = express.Router();

// Lazy initialize the controller to avoid database connection issues during startup
let creditController;

const getCreditController = () => {
    if (!creditController) {
        creditController = new CreditController();
    }
    return creditController;
};

// Credit Management Routes
router.get('/wallet', authenticateJWT, (req, res) => getCreditController().getWallet(req, res));
router.get('/transactions', authenticateJWT, (req, res) => getCreditController().getTransactions(req, res));
router.get('/transactions/:id', authenticateJWT, (req, res) => getCreditController().getTransactionById(req, res));

// Purchase Routes
router.post('/purchase', authenticateJWT, paymentRateLimit, (req, res) => getCreditController().purchaseCredits(req, res));
router.post('/confirm-payment', (req, res) => getCreditController().confirmPayment(req, res)); // Webhook route, no auth

// Boost Routes
router.post('/boost/profile', authenticateJWT, (req, res) => getCreditController().boostProfile(req, res));
router.post('/boost/gig', authenticateJWT, (req, res) => getCreditController().boostGig(req, res));
router.post('/boost/clan', authenticateJWT, (req, res) => getCreditController().boostClan(req, res));

// Contribution Routes
router.post('/contribute/clan', authenticateJWT, (req, res) => getCreditController().contributeToClan(req, res));

// Administrative Routes
router.get('/boosts', authenticateJWT, (req, res) => getCreditController().getUserBoosts(req, res));
router.get('/boosts/:id', authenticateJWT, (req, res) => getCreditController().getBoostById(req, res));

// Award Credits Route (for gig completion rewards, admin actions, etc.)
router.post('/award', authenticateJWT, (req, res) => getCreditController().awardCredits(req, res));

module.exports = router;
