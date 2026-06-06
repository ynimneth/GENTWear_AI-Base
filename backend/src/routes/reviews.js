const express = require('express');
const router = express.Router();
const { Review, Order, OrderItem, User, Product } = require('../config/db');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// GET /products/:productId/reviews - Fetch approved reviews for a product
router.get('/products/:productId/reviews', async (req, res) => {
  const productId = parseInt(req.params.productId);
  const { sort } = req.query; // 'newest' (default), 'highest', 'lowest', 'helpful'

  let order = [['createdAt', 'DESC']];
  if (sort === 'highest') {
    order = [['rating', 'DESC'], ['createdAt', 'DESC']];
  } else if (sort === 'lowest') {
    order = [['rating', 'ASC'], ['createdAt', 'DESC']];
  } else if (sort === 'helpful') {
    order = [['helpful_count', 'DESC'], ['createdAt', 'DESC']];
  }

  try {
    const reviews = await Review.findAll({
      where: {
        product_id: productId,
        is_approved: true
      },
      include: [{
        model: User,
        attributes: ['full_name']
      }],
      order
    });

    return res.json(reviews);
  } catch (err) {
    console.error('Fetch product reviews error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/:productId/reviews/eligible - Check if user is eligible to write a review
router.get('/products/:productId/reviews/eligible', auth, async (req, res) => {
  const productId = parseInt(req.params.productId);

  try {
    // 1. Check if user already reviewed this product
    const existingReview = await Review.findOne({
      where: {
        product_id: productId,
        user_id: req.user.id
      }
    });

    if (existingReview) {
      return res.json({ eligible: false, reason: 'ALREADY_REVIEWED', message: 'You have already reviewed this product.' });
    }

    // 2. Check if user purchased and received (delivered) this product
    const purchasedItem = await OrderItem.findOne({
      include: [{
        model: Order,
        where: {
          user_id: req.user.id,
          status: 'delivered'
        }
      }],
      where: {
        product_id: productId
      }
    });

    if (!purchasedItem) {
      return res.json({ 
        eligible: false, 
        reason: 'NOT_PURCHASED', 
        message: 'Only customers who purchased and received this product can review it.' 
      });
    }

    return res.json({ eligible: true });

  } catch (err) {
    console.error('Check review eligibility error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /products/:productId/reviews - Submit review (Requires delivered order)
router.post(
  '/products/:productId/reviews',
  auth,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5 stars'),
    body('comment').trim().notEmpty().withMessage('Review comment is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productId = parseInt(req.params.productId);
    const { rating, comment } = req.body;

    try {
      // 1. Check if product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // 2. Enforce already reviewed check
      const existingReview = await Review.findOne({
        where: { product_id: productId, user_id: req.user.id }
      });
      if (existingReview) {
        return res.status(400).json({ message: 'You have already submitted a review for this product.' });
      }

      // 3. Enforce delivered order check
      const purchasedItem = await OrderItem.findOne({
        include: [{
          model: Order,
          where: {
            user_id: req.user.id,
            status: 'delivered'
          }
        }],
        where: {
          product_id: productId
        }
      });

      if (!purchasedItem) {
        return res.status(403).json({ 
          message: 'You can only review products that you have purchased and received (delivered order).' 
        });
      }

      // 4. Create review (defaults to is_approved = false)
      const review = await Review.create({
        product_id: productId,
        user_id: req.user.id,
        rating,
        comment,
        is_approved: false
      });

      return res.status(201).json({
        message: 'Your review has been submitted for moderation.',
        review
      });

    } catch (err) {
      console.error('Submit review error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// POST /reviews/helpful/:id - Vote review as helpful
router.post('/reviews/helpful/:id', async (req, res) => {
  const reviewId = parseInt(req.params.id);

  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.helpful_count = review.helpful_count + 1;
    await review.save();

    return res.json({ 
      id: review.id, 
      helpful_count: review.helpful_count 
    });
  } catch (err) {
    console.error('Helpful vote error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
