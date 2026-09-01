const pool = require('../config/db');
const stripe = require('../config/stripe');

class OrderService {
  // Create order with transaction
  async createOrder(userId, items, shippingAddress) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let totalAmount = 0;
      const orderItems = [];
      
      // Process each item
      for (const item of items) {
        // Get product details
        const productResult = await client.query(
          'SELECT id, name, price, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );
        
        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.productId} not found`);
        }
        
        const product = productResult.rows[0];
        
        // Check stock
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
        
        // Calculate item total
        const itemTotal = parseFloat(product.price) * item.quantity;
        totalAmount += itemTotal;
        
        // Update stock
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, product.id]
        );
        
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtTime: product.price,
          itemTotal: itemTotal
        });
      }
      
      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total_amount, shipping_address, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id, user_id, total_amount, status, shipping_address, created_at`,
        [userId, totalAmount, shippingAddress]
      );
      
      const order = orderResult.rows[0];
      
      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.productId, item.quantity, item.priceAtTime]
        );
      }
      
      await client.query('COMMIT');
      
      return {
        order,
        items: orderItems,
        totalAmount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user orders
  async getUserOrders(userId) {
    try {
      const result = await pool.query(
        `SELECT o.id, o.total_amount, o.status, o.shipping_address, o.created_at,
                json_agg(json_build_object(
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'price_at_time', oi.price_at_time
                )) as items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.user_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const result = await pool.query(
        `UPDATE orders 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, status, updated_at`,
        [status, orderId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

const stripe = require('../config/stripe');

// New method
async createPaymentIntent(orderId, amount, currency = 'usd') {
  try {
    // Get order details
    const orderResult = await pool.query(
      `SELECT o.id, o.user_id, o.total_amount, o.shipping_address,
              u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderResult.rows[0];
    
    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      metadata: {
        order_id: orderId,
        user_id: order.user_id,
        user_email: order.user_email
      },
      receipt_email: order.user_email,
      description: `Order #${orderId} - E-Commerce Store`,
    });
    
    // Update order with payment intent ID
    await pool.query(
      `UPDATE orders 
       SET stripe_payment_intent_id = $1, 
           payment_status = 'pending',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [paymentIntent.id, orderId]
    );
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      orderId: orderId
    };
  } catch (error) {
    console.error('Create payment intent error:', error);
    throw error;
  }
}

// Add method to confirm payment
async confirmPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update order status
      await pool.query(
        `UPDATE orders 
         SET payment_status = 'paid', 
             status = 'processing',
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_payment_intent_id = $1
         RETURNING id, status, payment_status`,
        [paymentIntentId]
      );
      return { success: true, status: 'paid' };
    }
    
    return { success: false, status: paymentIntent.status };
  } catch (error) {
    console.error('Confirm payment error:', error);
    throw error;
  }
}

// Add method to handle webhook
async handleWebhook(payload, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent ${paymentIntent.id} succeeded!`);
        await this.confirmPayment(paymentIntent.id);
        break;
        
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        console.log(`PaymentIntent ${failedIntent.id} failed!`);
        await pool.query(
          `UPDATE orders 
           SET payment_status = 'failed',
               status = 'failed'
           WHERE stripe_payment_intent_id = $1`,
          [failedIntent.id]
        );
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return { received: true };
  } catch (error) {
    console.error('Webhook error:', error);
    throw error;
  }
}

}

module.exports = new OrderService();