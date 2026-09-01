const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { Worker } = require('worker_threads');

class InvoiceService {
  // Generate invoice using Worker Thread
  async generateInvoice(orderId, userId) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        path.join(__dirname, 'invoiceWorker.js'),
        {
          workerData: { orderId, userId }
        }
      );
      
      worker.on('message', (result) => {
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error));
        }
      });
      
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
  
  // Create PDF invoice (this runs in the worker thread)
  static async createPDF(orderData, userData, itemsData) {
    const doc = new PDFDocument();
    const invoiceDir = path.join(__dirname, '../../invoices');
    
    // Create invoices directory if it doesn't exist
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }
    
    const filePath = path.join(invoiceDir, `invoice-${orderData.id}-${Date.now()}.pdf`);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    
    // Header
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(12);
    doc.text(`Invoice #: ${orderData.id}`);
    doc.text(`Date: ${new Date(orderData.created_at).toLocaleDateString()}`);
    doc.text(`Order Status: ${orderData.status}`);
    doc.text(`Payment Status: ${orderData.payment_status}`);
    doc.moveDown();
    
    // Customer info
    doc.fontSize(16).text('Customer Information');
    doc.fontSize(12);
    doc.text(`Name: ${userData.first_name} ${userData.last_name}`);
    doc.text(`Email: ${userData.email}`);
    doc.text(`Address: ${orderData.shipping_address}`);
    doc.moveDown();
    
    // Items table headers
    doc.fontSize(16).text('Order Items');
    doc.fontSize(12);
    doc.text('----------------------------------------');
    doc.text('Item          Quantity    Price    Total');
    doc.text('----------------------------------------');
    
    // Items
    let totalAmount = 0;
    for (const item of itemsData) {
      const total = parseFloat(item.price_at_time) * item.quantity;
      totalAmount += total;
      doc.text(
        `${item.name.padEnd(14)} ${String(item.quantity).padEnd(10)} $${parseFloat(item.price_at_time).toFixed(2).padEnd(8)} $${total.toFixed(2)}`
      );
    }
    
    doc.text('----------------------------------------');
    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, { align: 'right' });
    doc.moveDown();
    
    // Footer
    doc.fontSize(10).text('Thank you for your purchase!', { align: 'center' });
    doc.text('This is a system-generated invoice.', { align: 'center' });
    
    // Finalize PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve(filePath);
      });
      writeStream.on('error', reject);
    });
  }
}

module.exports = new InvoiceService();