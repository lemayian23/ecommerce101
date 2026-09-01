const pool = require('../config/db');

class ProductService {
  // Create a new product
  async createProduct(name, description, price, stockQuantity, imageUrl) {
    try {
      const result = await pool.query(
        `INSERT INTO products (name, description, price, stock_quantity, image_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, description, price, stock_quantity, image_url, created_at`,
        [name, description, price, stockQuantity, imageUrl]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all products
  async getAllProducts() {
    try {
      const result = await pool.query(
        'SELECT id, name, description, price, stock_quantity, image_url, created_at FROM products ORDER BY id'
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get single product by ID
  async getProductById(id) {
    try {
      const result = await pool.query(
        'SELECT id, name, description, price, stock_quantity, image_url, created_at FROM products WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Update product
  async updateProduct(id, name, description, price, stockQuantity, imageUrl) {
    try {
      const result = await pool.query(
        `UPDATE products 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             price = COALESCE($3, price),
             stock_quantity = COALESCE($4, stock_quantity),
             image_url = COALESCE($5, image_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING id, name, description, price, stock_quantity, image_url, updated_at`,
        [name, description, price, stockQuantity, imageUrl, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id) {
    try {
      const result = await pool.query(
        'DELETE FROM products WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Check stock availability
  async checkStock(productId, quantity) {
    try {
      const result = await pool.query(
        'SELECT stock_quantity FROM products WHERE id = $1',
        [productId]
      );
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      return result.rows[0].stock_quantity >= quantity;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ProductService();