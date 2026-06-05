const express = require('express');
const router = express.Router();
const { WishlistItem, Product, ProductImage, ProductVariant } = require('../config/db');
const auth = require('../middleware/auth');

// GET /wishlist - Get current user's wishlist
router.get('/', auth, async (req, res) => {
  try {
    const items = await WishlistItem.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Product,
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
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Extract products
    const products = items.map(item => item.Product).filter(Boolean);

    return res.json(products);
  } catch (err) {
    console.error('Fetch wishlist error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /wishlist/:productId - Add product to wishlist
router.post('/:productId', auth, async (req, res) => {
  const { productId } = req.params;

  try {
    // 1. Verify if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // 2. Check if already in wishlist
    const existing = await WishlistItem.findOne({
      where: {
        user_id: req.user.id,
        product_id: productId
      }
    });

    if (existing) {
      return res.status(200).json({ message: 'Product already in wishlist' });
    }

    // 3. Create wishlist item
    await WishlistItem.create({
      user_id: req.user.id,
      product_id: productId
    });

    return res.status(201).json({ message: 'Product added to wishlist successfully' });

  } catch (err) {
    console.error('Add to wishlist error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /wishlist/:productId - Remove product from wishlist
router.delete('/:productId', auth, async (req, res) => {
  const { productId } = req.params;

  try {
    const deleted = await WishlistItem.destroy({
      where: {
        user_id: req.user.id,
        product_id: productId
      }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    return res.json({ message: 'Product removed from wishlist successfully' });
  } catch (err) {
    console.error('Remove from wishlist error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
