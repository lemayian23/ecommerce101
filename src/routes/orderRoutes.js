const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getMyOrders);

module.exports = router;