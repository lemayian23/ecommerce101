const invoiceService = require('../services/invoiceService');
const pool = require('../config/db');
const fs = require('fs');

class InvoiceController {
  // Generate invoice (will run in background)
  async generateInvoice(req, res) {
    try {
      const { orderId } = req.body;
      const userId = req.user.userId;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
      
      // Verify order exists and belongs to user
      const orderResult = await pool.query(
        'SELECT id, user_id FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (orderResult.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      // Generate invoice in background
      invoiceService.generateInvoice(orderId, userId)
        .then(result => {
          console.log(`✅ Invoice generated for order ${orderId}: ${result.invoicePath}`);
        })
        .catch(error => {
          console.error(`❌ Invoice generation failed: ${error.message}`);
        });
      
      res.json({
        success: true,
        message: 'Invoice generation started. You will receive it shortly.',
        orderId: orderId
      });
    } catch (error) {
      console.error('Generate invoice error:', error);
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  }
  
  // Download invoice
  async downloadInvoice(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;
      
      // Get invoice path
      const result = await pool.query(
        'SELECT invoice_path FROM orders WHERE id = $1 AND user_id = $2',
        [orderId, userId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].invoice_path) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const filePath = result.rows[0].invoice_path;
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Invoice file not found' });
      }
      
      res.download(filePath);
    } catch (error) {
      console.error('Download invoice error:', error);
      res.status(500).json({ error: 'Failed to download invoice' });
    }
  }
}

module.exports = new InvoiceController();