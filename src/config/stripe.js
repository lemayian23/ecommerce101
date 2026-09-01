const Stripe = require('stripe');
const dotenv = require('dotenv');

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

module.exports = stripe;