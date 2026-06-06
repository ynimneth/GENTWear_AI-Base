const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Order, OrderItem, CartItem, Product, ProductVariant, Address, sequelize } = require('../config/db');
const redis = require('../config/redis');
const auth = require('../middleware/auth');

// Validation rules for checkout/order placement
const orderValidation = [
  body('shipping_address')
    .optional()
    .isObject()
    .withMessage('shipping_address must be an object if provided'),
  body('address_id')
    .optional()
    .isInt()
    .withMessage('address_id must be an integer if provided'),
  // Ensure at least one is provided
  body().custom((value) => {
    if (!value.shipping_address && !value.address_id) {
      throw new Error('Either shipping_address object or address_id must be provided');
    }
    return true;
  })
];

// GET /orders - Get order history for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              attributes: ['name', 'slug']
            },
            {
              model: ProductVariant,
              as: 'variant',
              attributes: ['size', 'color', 'color_hex']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json(orders);
  } catch (err) {
    console.error('Fetch orders error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /orders/:id - Get specific order details
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              attributes: ['name', 'slug']
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

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json(order);
  } catch (err) {
    console.error('Fetch order detail error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /orders - Create a new order (Validate stock, deduct inventory, create order)
router.post('/', auth, orderValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { shipping_address, address_id } = req.body;

  // 1. Resolve shipping address
  let finalAddress = null;
  try {
    if (address_id) {
      const savedAddress = await Address.findOne({
        where: { id: address_id, user_id: req.user.id }
      });
      if (!savedAddress) {
        return res.status(404).json({ message: 'Saved address not found' });
      }
      finalAddress = {
        full_name: savedAddress.full_name,
        phone_number: savedAddress.phone_number,
        address_line1: savedAddress.address_line1,
        address_line2: savedAddress.address_line2,
        city: savedAddress.city,
        state: savedAddress.state,
        postal_code: savedAddress.postal_code,
        country: savedAddress.country
      };
    } else {
      // Validate shipping address structure
      const requiredFields = ['full_name', 'phone_number', 'address_line1', 'city', 'state', 'postal_code', 'country'];
      for (const field of requiredFields) {
        if (!shipping_address[field]) {
          return res.status(400).json({ message: `Field '${field}' is required in shipping_address` });
        }
      }
      finalAddress = {
        full_name: shipping_address.full_name,
        phone_number: shipping_address.phone_number,
        address_line1: shipping_address.address_line1,
        address_line2: shipping_address.address_line2 || null,
        city: shipping_address.city,
        state: shipping_address.state,
        postal_code: shipping_address.postal_code,
        country: shipping_address.country
      };
    }
  } catch (err) {
    return res.status(400).json({ message: 'Invalid address setup' });
  }

  // 2. Fetch active cart items for the user from DB
  const cartItems = await CartItem.findAll({
    where: { user_id: req.user.id },
    include: [
      {
        model: Product
      },
      {
        model: ProductVariant,
        as: 'variant'
      }
    ]
  });

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ message: 'Your shopping cart is empty' });
  }

  // 3. Start checkout transaction to enforce atomicity and lock stock
  const transaction = await sequelize.transaction();

  try {
    let orderSubtotal = 0;
    const orderItemsToCreate = [];
    const variantsToUpdate = [];

    for (const item of cartItems) {
      // Fetch variant with lock
      const variant = await ProductVariant.findByPk(item.variant_id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!variant) {
        throw new Error(`Product variant for SKU ${item.variant?.sku || 'unknown'} not found`);
      }

      // Check stock
      if (variant.stock_qty < item.quantity) {
        throw new Error(`Insufficient stock for product variant: ${item.Product.name} (${variant.size || ''} - ${variant.color || ''}). Only ${variant.stock_qty} available.`);
      }

      // Calculate unit price: variant price override if available, else product base price
      const unitPrice = variant.price_override !== null && variant.price_override !== undefined
        ? parseFloat(variant.price_override)
        : parseFloat(item.Product.price);

      orderSubtotal += unitPrice * item.quantity;

      orderItemsToCreate.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: unitPrice
      });

      // Deduct inventory
      variant.stock_qty = variant.stock_qty - item.quantity;
      variantsToUpdate.push(variant);
    }

    // Save stock changes
    for (const variant of variantsToUpdate) {
      await variant.save({ transaction });
    }

    // Create the Order record
    const order = await Order.create({
      user_id: req.user.id,
      status: 'pending',
      total: orderSubtotal,
      shipping_address: finalAddress,
      payment_intent_id: null
    }, { transaction });

    // Create the OrderItems records
    const orderItems = orderItemsToCreate.map(item => ({
      ...item,
      order_id: order.id
    }));
    await OrderItem.bulkCreate(orderItems, { transaction });

    // Empty user's cart in DB
    await CartItem.destroy({
      where: { user_id: req.user.id },
      transaction
    });

    // Clear cart cache in Redis
    const redisKey = `cart:user:${req.user.id}`;
    await redis.del(redisKey);

    await transaction.commit();

    // Fetch final created order with items and product details for response
    const finalOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              attributes: ['name', 'slug']
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

    return res.status(201).json(finalOrder);

  } catch (err) {
    await transaction.rollback();
    console.error('Order creation transaction failed:', err.message);
    return res.status(400).json({ message: err.message || 'Failed to place order' });
  }
});

module.exports = router;
