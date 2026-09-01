const orderService = require('../services/orderService');

class OrderController {
  // Create order
  async createOrder(req, res) {
    try {
      const { items, shippingAddress } = req.body;
      const userId = req.user.userId;
      
      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items are required' });
      }
      
      if (!shippingAddress) {
        return res.status(400).json({ error: 'Shipping address is required' });
      }
      
      const result = await orderService.createOrder(userId, items, shippingAddress);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get my orders
  async getMyOrders(req, res) {
    try {
      const userId = req.user.userId;
      const orders = await orderService.getUserOrders(userId);
      
      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: 'Failed to get orders' });
    }
  }

  // Get all orders (Admin only)
  async getAllOrders(req, res) {
    try {
      const result = await pool.query(
        `SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.created_at,
                u.email as user_email,
                json_agg(json_build_object(
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'price_at_time', oi.price_at_time
                )) as items
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         GROUP BY o.id, u.email
         ORDER BY o.created_at DESC`
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({ error: 'Failed to get orders' });
    }
  }

  // Update order status (Admin only)
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const result = await orderService.updateOrderStatus(id, status);
      
      if (!result) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
}

module.exports = new OrderController();