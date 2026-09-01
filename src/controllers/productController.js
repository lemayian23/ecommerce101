const productService = require('../services/productService');

class ProductController {
    // Create product (Admin only)
    async createProduct(req, res) {
        try {
            const { name, description, price, stockQuantity, imageUrl } = req.body;

            if (!name || !price) {
                return res.status(400).json({ error: 'Name and price are required'});
            }

            const product = await productService.createProduct(
                name, description, price, stockQuantity, imageUrl
            );

            res.status(201).json({
                success: true,
                data: product
            });
        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Failed to create product'});
        }
    }

    // Get all products
    async getAllProducs(req, res) {
        try {
            const products = await productService.getAllProducts();
            res.json({
                success: true,
                data: products
            });
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Failed to get products'});
        }
    }

    // Get single product
    async getProduct(req, res) {
        try {
            const { id } = req.params;
            const product = await productService.getProductById(id);

            if (!product) {
                return res.status(404).json({ error: 'product not found'});
            }

            res.json({
                success: true,
                data: product
            });
        } catch (error) {
            console.error('Get product error:', error);
            res.status(500).json({ error: 'Failed to get product'});
        }
    }

    // Update product (Admin only)
    async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const { name. description, price, stockQuantity, imageUrl } = req.body;

            const product = await productService.updateProduct(
                id, name, description, price, stockQuantity, imageUrl
            );

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({
                success: true,
                data: product
            });
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Failed to update product'});
        }
    }

    // Delete product (Admin only)
    async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            const product = await productService.deleteProduct(id);

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ error: 'Failed to delete produc' });
        }
    }
}

module.exports = new ProductController();