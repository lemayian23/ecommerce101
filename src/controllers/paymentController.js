const orderService = require('../services/orderService');
const stripe = require('../config/stripe');

class PaymentController {
  // Create payment intent for an order
  async createPaymentIntent(req, res) {
    try {
      const { orderId } = req.body;
      const userId = req.user.userId;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
      
      // Get order to verify it belongs to user
      const orderResult = await require('../config/db').query(
        'SELECT id, total_amount, user_id FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const order = orderResult.rows[0];
      
      // Verify order belongs to user
      if (order.user_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to this order' });
      }
      
      // Verify order isn't already paid
      if (order.payment_status === 'paid') {
        return res.status(400).json({ error: 'Order already paid' });
      }
      
      const result = await orderService.createPaymentIntent(
        orderId,
        order.total_amount
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Handle Stripe webhook
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      const payload = req.body;
      
      const result = await orderService.handleWebhook(payload, signature);
      
      res.json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  }
  
  // Get payment status
  async getPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;
      
      const result = await require('../config/db').query(
        `SELECT id, stripe_payment_intent_id, payment_status, status
         FROM orders
         WHERE id = $1 AND user_id = $2`,
        [orderId, userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({ error: 'Failed to get payment status' });
    }
  }
}

module.exports = new PaymentController();