const express = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

pub