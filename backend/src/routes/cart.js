const express = require('express');
const router = express.Router();
const { Product, ProductVariant, ProductImage, CartItem, sequelize } = require('../config/db');
const redis = require('../config/redis');
const { verifyAccessToken } = require('../utils/token');
const { User } = require('../config/db');

// Middleware to optionally extract logged-in user from token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'email', 'full_name', 'role']
      });
      if (user) {
        req.user = user;
      }
    } catch (err) {
      // Token expired or invalid, proceed as guest
    }
  }
  next();
};

// Helper to get raw items array from cache or DB
const getRawCartItems = async (req, guestCartId) => {
  if (req.user) {
    const redisKey = `cart:user:${req.user.id}`;
    let items = await redis.get(redisKey);
    if (!items) {
      // Fetch from PostgreSQL DB
      const dbItems = await CartItem.findAll({
        where: { user_id: req.user.id }
      });
      items = dbItems.map(item => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity
      }));
      // Cache in Redis (TTL: 24 Hours)
      await redis.set(redisKey, items, 24 * 60 * 60);
    }
    return items;
  } else if (guestCartId) {
    const redisKey = `cart:guest:${guestCartId}`;
    const items = await redis.get(redisKey);
    return items || [];
  }
  return [];
};

// Helper to save raw items array to cache and DB
const saveRawCartItems = async (req, guestCartId, items) => {
  if (req.user) {
    const redisKey = `cart:user:${req.user.id}`;
    // Save to Redis (TTL: 24 Hours)
    await redis.set(redisKey, items, 24 * 60 * 60);
  } else if (guestCartId) {
    const redisKey = `cart:guest:${guestCartId}`;
    // Save to Redis (TTL: 7 Days)
    await redis.set(redisKey, items, 7 * 24 * 60 * 60);
  }
};

// Helper to populate detailed product & variant information for the cart items
const populateCartItems = async (rawItems) => {
  const populated = [];
  for (const item of rawItems) {
    try {
      const product = await Product.findByPk(item.productId, {
        include: [
          {
            model: ProductImage,
            as: 'images',
            attributes: ['id', 'url', 'is_primary', 'sort_order']
          },
          {
            model: ProductVariant,
            as: 'variants',
            attributes: ['id', 'size', 'color', 'color_hex', 'price_override', 'stock_qty', 'sku']
          }
        ]
      });

      let variant = null;
      if (item.variantId) {
        variant = await ProductVariant.findByPk(item.variantId, {
          attributes: ['id', 'size', 'color', 'color_hex', 'price_override', 'stock_qty', 'sku']
        });
      }

      if (product) {
        populated.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          Product: product,
          variant: variant
        });
      }
    } catch (err) {
      console.error('Error populating cart item:', err);
    }
  }
  return populated;
};

// GET /cart/items - Get user's cart (populated)
router.get('/items', optionalAuth, async (req, res) => {
  const guestCartId = req.headers['x-guest-cart-id'] || req.query.guestCartId;
  try {
    const rawItems = await getRawCartItems(req, guestCartId);
    const populated = await populateCartItems(rawItems);
    return res.json(populated);
  } catch (err) {
    console.error('Get cart items error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /cart/items - Add item to cart
router.post('/items', optionalAuth, async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const guestCartId = req.headers['x-guest-cart-id'];

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    // 1. Verify product and variant
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let variant = null;
    if (variantId) {
      variant = await ProductVariant.findByPk(variantId);
      if (!variant || variant.product_id !== parseInt(productId)) {
        return res.status(404).json({ message: 'Product variant not found for this product' });
      }
    }

    // 2. Fetch current cart items
    const rawItems = await getRawCartItems(req, guestCartId);
    
    // 3. Find if item already in cart
    const existingIndex = rawItems.findIndex(
      item => item.productId === parseInt(productId) && item.variantId === (variantId ? parseInt(variantId) : null)
    );

    let targetQty = quantity;
    if (existingIndex > -1) {
      targetQty += rawItems[existingIndex].quantity;
    }

    // 4. Verify stock limit
    if (variant) {
      if (targetQty > variant.stock_qty) {
        return res.status(400).json({
          message: `Cannot add requested quantity. Only ${variant.stock_qty} in stock, and you already have ${existingIndex > -1 ? rawItems[existingIndex].quantity : 0} in cart.`
        });
      }
    }

    // 5. Update cart in local array
    if (existingIndex > -1) {
      rawItems[existingIndex].quantity = targetQty;
    } else {
      rawItems.push({
        productId: parseInt(productId),
        variantId: variantId ? parseInt(variantId) : null,
        quantity: parseInt(quantity)
      });
    }

    // 6. Save to DB for logged in user
    if (req.user) {
      const dbItem = await CartItem.findOne({
        where: {
          user_id: req.user.id,
          product_id: productId,
          variant_id: variantId || null
        }
      });
      if (dbItem) {
        dbItem.quantity = targetQty;
        await dbItem.save();
      } else {
        await CartItem.create({
          user_id: req.user.id,
          product_id: productId,
          variant_id: variantId || null,
          quantity: quantity
        });
      }
    }

    // 7. Save to Cache
    await saveRawCartItems(req, guestCartId, rawItems);

    // 8. Return populated cart
    const populated = await populateCartItems(rawItems);
    return res.json(populated);

  } catch (err) {
    console.error('Add cart item error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /cart/items - Update quantity of an item
router.put('/items', optionalAuth, async (req, res) => {
  const { productId, variantId, quantity } = req.body;
  const guestCartId = req.headers['x-guest-cart-id'];

  if (!productId || quantity === undefined || quantity < 1) {
    return res.status(400).json({ message: 'Product ID and valid quantity (>= 1) are required' });
  }

  try {
    // 1. Verify variant stock
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId);
      if (variant && quantity > variant.stock_qty) {
        return res.status(400).json({ message: `Only ${variant.stock_qty} items available in stock.` });
      }
    }

    // 2. Fetch current cart items
    const rawItems = await getRawCartItems(req, guestCartId);

    // 3. Find target item index
    const index = rawItems.findIndex(
      item => item.productId === parseInt(productId) && item.variantId === (variantId ? parseInt(variantId) : null)
    );

    if (index === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // 4. Update local array
    rawItems[index].quantity = parseInt(quantity);

    // 5. Update DB if logged-in
    if (req.user) {
      await CartItem.update(
        { quantity: parseInt(quantity) },
        {
          where: {
            user_id: req.user.id,
            product_id: productId,
            variant_id: variantId || null
          }
        }
      );
    }

    // 6. Save to cache
    await saveRawCartItems(req, guestCartId, rawItems);

    // 7. Return populated cart
    const populated = await populateCartItems(rawItems);
    return res.json(populated);

  } catch (err) {
    console.error('Update cart item error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /cart/items - Remove item from cart
router.delete('/items', optionalAuth, async (req, res) => {
  // Support both body or query parameters
  const productId = req.query.productId || req.body.productId;
  const variantId = req.query.variantId || req.body.variantId;
  const guestCartId = req.headers['x-guest-cart-id'];

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    const rawItems = await getRawCartItems(req, guestCartId);
    
    // Filter out item
    const updatedItems = rawItems.filter(
      item => !(item.productId === parseInt(productId) && item.variantId === (variantId ? parseInt(variantId) : null))
    );

    // Update DB if logged-in
    if (req.user) {
      await CartItem.destroy({
        where: {
          user_id: req.user.id,
          product_id: productId,
          variant_id: variantId || null
        }
      });
    }

    // Save to Cache
    await saveRawCartItems(req, guestCartId, updatedItems);

    // Return populated cart
    const populated = await populateCartItems(updatedItems);
    return res.json(populated);

  } catch (err) {
    console.error('Delete cart item error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /cart/merge - Merge guest cart to user cart upon login
router.post('/merge', optionalAuth, async (req, res) => {
  const { guestCartId } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized. Login required to merge carts.' });
  }

  if (!guestCartId) {
    return res.status(400).json({ message: 'Guest Cart ID is required' });
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch guest cart items from Redis
    const guestRedisKey = `cart:guest:${guestCartId}`;
    const guestItems = await redis.get(guestRedisKey);

    if (guestItems && guestItems.length > 0) {
      // 2. Merge guest items into User DB
      for (const item of guestItems) {
        const dbItem = await CartItem.findOne({
          where: {
            user_id: req.user.id,
            product_id: item.productId,
            variant_id: item.variantId || null
          },
          transaction
        });

        let targetQty = item.quantity;
        if (dbItem) {
          targetQty += dbItem.quantity;
        }

        // Verify stock limits
        if (item.variantId) {
          const variant = await ProductVariant.findByPk(item.variantId, { transaction });
          if (variant && targetQty > variant.stock_qty) {
            targetQty = variant.stock_qty; // Cap at max available stock
          }
        }

        if (dbItem) {
          dbItem.quantity = targetQty;
          await dbItem.save({ transaction });
        } else {
          await CartItem.create({
            user_id: req.user.id,
            product_id: item.productId,
            variant_id: item.variantId || null,
            quantity: targetQty
          }, { transaction });
        }
      }

      // 3. Clear guest cart in Redis
      await redis.del(guestRedisKey);
    }

    await transaction.commit();

    // 4. Fetch updated cart from DB and invalidate user's Redis cache
    const dbItems = await CartItem.findAll({
      where: { user_id: req.user.id }
    });

    const userItems = dbItems.map(item => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity
    }));

    // Save to user Redis cache
    const userRedisKey = `cart:user:${req.user.id}`;
    await redis.set(userRedisKey, userItems, 24 * 60 * 60);

    // Return populated items
    const populated = await populateCartItems(userItems);
    return res.json(populated);

  } catch (err) {
    await transaction.rollback();
    console.error('Merge cart error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
