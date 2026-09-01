const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Webhook (no authentication - Stripe calls this)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Create payment intent (authenticated)
router.post('/create-payment-intent', authenticate, paymentController.createPaymentIntent);

// Get payment status (authenticated)
router.get('/status/:orderId', authenticate, paymentController.getPaymentStatus);

module.exports = router;