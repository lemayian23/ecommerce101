const { parentPort, workerData } = require('worker_threads');
const pool = require('../config/db');
const InvoiceService = require('./invoiceService');

async function generateInvoice() {
  try {
    const { orderId, userId } = workerData;
    
    // Get order details
    const orderResult = await pool.query(
      `SELECT o.*, u.first_name, u.last_name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, userId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const orderData = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    
    const itemsData = itemsResult.rows;
    
    // Generate PDF
    const filePath = await InvoiceService.createPDF(orderData, orderData, itemsData);
    
    // Update order with invoice path
    await pool.query(
      `UPDATE orders 
       SET invoice_path = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [filePath, orderId]
    );
    
    parentPort.postMessage({
      success: true,
      invoicePath: filePath,
      orderId: orderId
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
}

generateInvoice();