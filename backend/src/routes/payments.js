const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Order, OrderItem, Product, ProductVariant, User } = require('../config/db');
const auth = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../services/emailService');

// POST /payments/intent - Create Stripe PaymentIntent for a pending order
router.post('/intent', auth, async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: 'Order ID is required' });
  }

  try {
    // 1. Fetch order and ensure it belongs to the authenticated user and is pending
    const order = await Order.findOne({
      where: { id: orderId, user_id: req.user.id }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Order status is '${order.status}'. Can only create payment intent for pending orders.` });
    }

    // 2. Create PaymentIntent in Stripe
    // Stripe amount must be in cents (e.g., $10.00 is 1000 cents)
    const amountInCents = Math.round(parseFloat(order.total) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        orderId: order.id.toString(),
        userId: req.user.id.toString()
      }
    });

    // 3. Save payment intent ID to the order record
    order.payment_intent_id = paymentIntent.id;
    await order.save();

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      total: order.total
    });

  } catch (err) {
    console.error('Stripe PaymentIntent error:', err);
    // Provide a helpful mock fallback in case keys are incorrect or missing
    if (err.message?.includes('API key') || err.message?.includes('authentication')) {
      console.warn('[Payments Sandbox] Defaulting to MOCK payment intent response since Stripe keys are not set up.');
      
      const mockPiId = `pi_mock_${Math.random().toString(36).substring(2, 12)}`;
      
      // Update order with mock ID
      const order = await Order.findOne({ where: { id: orderId, user_id: req.user.id } });
      if (order) {
        order.payment_intent_id = mockPiId;
        await order.save();
      }

      return res.json({
        clientSecret: `${mockPiId}_secret_${Math.random().toString(36).substring(2, 12)}`,
        paymentIntentId: mockPiId,
        total: order ? order.total : '0.00',
        isMock: true
      });
    }
    return res.status(500).json({ message: 'Failed to initialize payment gateway', error: err.message });
  }
});

// POST /payments/webhook - Stripe Webhook handler
// Note: This endpoint must receive raw payload for signature validation.
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      // Real Stripe signature verification
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } else {
      // Local dev sandbox fallback (bypass signature verification)
      console.warn('[Payments Webhook] Running in sandbox mode (bypassing signature verification). Make sure STRIPE_WEBHOOK_SECRET is set in production.');
      event = req.body;
    }
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the specific event types
  const eventType = event.type || event.event_type;
  const dataObject = event.data?.object || event;

  console.log(`[Stripe Webhook] Received event type: ${eventType}`);

  try {
    if (eventType === 'payment_intent.succeeded') {
      const paymentIntentId = dataObject.id;

      // Find order by payment_intent_id
      const order = await Order.findOne({
        where: { payment_intent_id: paymentIntentId },
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'full_name']
          },
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                attributes: ['name', 'price']
              },
              {
                model: ProductVariant,
                as: 'variant',
                attributes: ['size', 'color', 'color_hex']
              }
            ]
          }
        ]
      });

      if (order) {
        if (order.status !== 'paid') {
          order.status = 'paid';
          await order.save();
          console.log(`[Stripe Webhook] Order #${order.id} updated to PAID successfully.`);

          // Trigger email confirmation (via SendGrid)
          await sendOrderConfirmationEmail(order);
        }
      } else {
        console.warn(`[Stripe Webhook] Order with payment_intent_id ${paymentIntentId} not found.`);
      }
    } else if (eventType === 'payment_intent.payment_failed') {
      const paymentIntentId = dataObject.id;

      const order = await Order.findOne({
        where: { payment_intent_id: paymentIntentId }
      });

      if (order) {
        order.status = 'failed';
        await order.save();
        console.log(`[Stripe Webhook] Order #${order.id} updated to FAILED.`);
      }
    }
    
    return res.json({ received: true });

  } catch (err) {
    console.error('[Stripe Webhook Error] Failed to process webhook event:', err);
    return res.status(500).json({ message: 'Internal server error processing webhook' });
  }
});

module.exports = router;
