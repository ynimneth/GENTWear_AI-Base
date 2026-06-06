const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Product, ProductVariant, ProductImage, Category, sequelize } = require('../config/db');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { upload, handleUpload } = require('../services/uploadService');
const fs = require('fs');
const path = require('path');

// AI Vector Service, Redis, and Trie autocomplete imports
const redis = require('../config/redis');
const aiService = require('../services/aiService');
const Trie = require('../algorithms/Trie');

const productTrie = new Trie();

// Seed Trie with active product names
const syncTrie = async () => {
  try {
    const products = await Product.findAll({ where: { is_active: true }, attributes: ['name'] });
    for (const prod of products) {
      productTrie.insert(prod.name);
    }
    console.log(`[Trie Autocomplete] Seeded Trie with ${products.length} product names.`);
  } catch (err) {
    console.error('[Trie Autocomplete] Failed to seed Trie:', err);
  }
};

// Start Trie sync asynchronously
syncTrie();

// Helper to create slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// GET /products - Public paginated list with filtering & sorting
router.get('/', async (req, res) => {
  try {
    const { category_id, min_price, max_price, search, sort, page = 1, limit = 12 } = req.query;

    const offset = (page - 1) * limit;
    const where = { is_active: true };

    // 1. Category filter (including child categories)
    if (category_id) {
      const categoryIds = [parseInt(category_id)];
      // Fetch subcategories
      const subcategories = await Category.findAll({
        where: { parent_id: category_id }
      });
      subcategories.forEach(sub => categoryIds.push(sub.id));
      where.category_id = { [Op.in]: categoryIds };
    }

    // 2. Search query filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // 3. Price range filter
    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined && min_price !== '') {
        where.price[Op.gte] = parseFloat(min_price);
      }
      if (max_price !== undefined && max_price !== '') {
        where.price[Op.lte] = parseFloat(max_price);
      }
    }

    // 4. Sorting logic
    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') {
      order = [['price', 'ASC']];
    } else if (sort === 'price_desc') {
      order = [['price', 'DESC']];
    } else if (sort === 'newest') {
      order = [['createdAt', 'DESC']];
    }

    // 5. Query execution
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      order,
      offset: parseInt(offset),
      limit: parseInt(limit),
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
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ],
      distinct: true // Prevents duplicate counts due to joins
    });

    return res.json({
      products,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });

  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/search - Semantic Search
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Search query parameter (q) is required' });
  }

  try {
    const products = await aiService.semanticSearch(q, 12);
    return res.json(products);
  } catch (err) {
    console.error('Semantic search route error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/autocomplete - Prefix Autocomplete suggestions via Trie
router.get('/autocomplete', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json([]);
  }

  try {
    const suggestions = productTrie.searchPrefix(q);
    return res.json(suggestions);
  } catch (err) {
    console.error('Trie autocomplete route error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/recommendations/collaborative - Collaborative filtering KNN
router.get('/recommendations/collaborative', async (req, res) => {
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (e) {
      // Ignore token decode errors
    }
  }

  try {
    const { getCollaborativeRecommendations } = require('../algorithms/CollaborativeFiltering');
    const products = await getCollaborativeRecommendations(userId, 4);
    return res.json(products);
  } catch (err) {
    console.error('Collaborative filtering route error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/banners - Get active public banners
router.get('/banners', async (req, res) => {
  try {
    const { Banner } = require('../config/db');
    const { Op } = require('sequelize');
    const now = new Date();
    const banners = await Banner.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { start_date: null },
          { start_date: { [Op.lte]: now } }
        ],
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: now } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    return res.json(banners);
  } catch (err) {
    console.error('Fetch public banners error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/:id/recommendations - Similarity Recommendations
router.get('/:id/recommendations', async (req, res) => {
  const { id } = req.params;
  try {
    const recommendations = await aiService.getVectorRecommendations(id, 4);
    return res.json(recommendations);
  } catch (err) {
    console.error('Vector recommendations route error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/:id - Public detail (by ID or Slug)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product:detail:${id}`;

  try {
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const isId = !isNaN(id);
    const where = isId ? { id } : { slug: id };

    const product = await Product.findOne({
      where,
      include: [
        {
          model: ProductImage,
          as: 'images',
          order: [['sort_order', 'ASC'], ['id', 'ASC']]
        },
        {
          model: ProductVariant,
          as: 'variants'
        },
        {
          model: Category,
          as: 'category'
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Cache product detail (TTL: 1 Hour)
    await redis.set(cacheKey, product, 3600);

    return res.json(product);
  } catch (err) {
    console.error('Fetch product detail error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /products - Admin only: Create Product (with image upload)
router.post(
  '/',
  auth,
  admin,
  upload.array('images', 10),
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const {
        name,
        description,
        price,
        compare_at_price,
        category_id,
        is_active,
        is_featured,
        variants: variantsJson,
        primary_image_index = 0
      } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Product name is required' });
      }

      // Generate unique slug
      let slug = slugify(name);
      let slugExists = await Product.findOne({ where: { slug } });
      let count = 1;
      let originalSlug = slug;
      while (slugExists) {
        slug = `${originalSlug}-${count}`;
        slugExists = await Product.findOne({ where: { slug } });
        count++;
      }

      // Create Product
      const product = await Product.create({
        name,
        slug,
        description,
        price: parseFloat(price || 0),
        compare_at_price: compare_at_price ? parseFloat(compare_at_price) : null,
        category_id: category_id ? parseInt(category_id) : null,
        is_active: is_active === 'true' || is_active === true,
        is_featured: is_featured === 'true' || is_featured === true
      }, { transaction });

      // Create Variants if passed
      let parsedVariants = [];
      if (variantsJson) {
        parsedVariants = JSON.parse(variantsJson);
      }
      if (parsedVariants.length > 0) {
        const variantsData = parsedVariants.map(v => ({
          product_id: product.id,
          size: v.size || null,
          color: v.color || null,
          color_hex: v.color_hex || null,
          price_override: v.price_override ? parseFloat(v.price_override) : null,
          stock_qty: parseInt(v.stock_qty || 0),
          sku: v.sku || null
        }));
        await ProductVariant.bulkCreate(variantsData, { transaction });
      }

      // Upload Images
      const uploadedUrls = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const url = await handleUpload(file);
          uploadedUrls.push({
            product_id: product.id,
            url,
            is_primary: parseInt(primary_image_index) === i,
            sort_order: i
          });
        }
        await ProductImage.bulkCreate(uploadedUrls, { transaction });
      }

      await transaction.commit();

      // Fetch newly created product with associations
      const createdProduct = await Product.findByPk(product.id, {
        include: [
          { model: ProductVariant, as: 'variants' },
          { model: ProductImage, as: 'images' },
          { model: Category, as: 'category' }
        ]
      });

      // Sync to vector index and update Trie in background
      aiService.upsertProduct(createdProduct).catch(err => console.error('[AI Service] Creation sync error:', err));
      productTrie.insert(createdProduct.name);

      return res.status(201).json(createdProduct);
    } catch (err) {
      await transaction.rollback();
      // Cleanup locally uploaded files if transaction failed
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      console.error('Create product error:', err);
      return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  }
);

// PUT /products/:id - Admin only: Edit Product
router.put(
  '/:id',
  auth,
  admin,
  upload.array('images', 10),
  async (req, res) => {
    const { id } = req.params;
    const transaction = await sequelize.transaction();

    try {
      const product = await Product.findByPk(id);
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Product not found' });
      }

      const {
        name,
        description,
        price,
        compare_at_price,
        category_id,
        is_active,
        is_featured,
        variants: variantsJson,
        existing_images: existingImagesJson,
        primary_image_index = 0
      } = req.body;

      // Update Basic Fields
      if (name) {
        product.name = name;
        // Generate new slug if name changed
        if (slugify(name) !== product.slug) {
          let slug = slugify(name);
          let slugExists = await Product.findOne({ where: { slug } });
          let count = 1;
          let originalSlug = slug;
          while (slugExists) {
            slug = `${originalSlug}-${count}`;
            slugExists = await Product.findOne({ where: { slug } });
            count++;
          }
          product.slug = slug;
        }
      }

      if (description !== undefined) product.description = description;
      if (price !== undefined) product.price = parseFloat(price);
      if (compare_at_price !== undefined) product.compare_at_price = compare_at_price ? parseFloat(compare_at_price) : null;
      if (category_id !== undefined) product.category_id = category_id ? parseInt(category_id) : null;
      if (is_active !== undefined) product.is_active = is_active === 'true' || is_active === true;
      if (is_featured !== undefined) product.is_featured = is_featured === 'true' || is_featured === true;

      await product.save({ transaction });

      // Update Variants (recreate model style)
      if (variantsJson) {
        const parsedVariants = JSON.parse(variantsJson);
        // Delete all old variants
        await ProductVariant.destroy({ where: { product_id: id }, transaction });
        
        // Add new ones
        if (parsedVariants.length > 0) {
          const variantsData = parsedVariants.map(v => ({
            product_id: id,
            size: v.size || null,
            color: v.color || null,
            color_hex: v.color_hex || null,
            price_override: v.price_override ? parseFloat(v.price_override) : null,
            stock_qty: parseInt(v.stock_qty || 0),
            sku: v.sku || null
          }));
          await ProductVariant.bulkCreate(variantsData, { transaction });
        }
      }

      // Handle existing image removal / primary update
      let parsedExistingImages = [];
      if (existingImagesJson) {
        parsedExistingImages = JSON.parse(existingImagesJson);
        const existingIds = parsedExistingImages.map(img => img.id);

        // Find and delete images no longer in list
        const imagesToDelete = await ProductImage.findAll({
          where: {
            product_id: id,
            id: { [Op.notIn]: existingIds }
          }
        });

        for (const img of imagesToDelete) {
          // Clean up local files
          if (img.url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', 'public', img.url);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          await img.destroy({ transaction });
        }

        // Update sort order and primary tags for remaining images
        for (const img of parsedExistingImages) {
          await ProductImage.update(
            {
              is_primary: img.is_primary,
              sort_order: img.sort_order
            },
            {
              where: { id: img.id },
              transaction
            }
          );
        }
      }

      // Add newly uploaded images
      if (req.files && req.files.length > 0) {
        const uploadedUrls = [];
        // Calculate sorting offset based on existing image count
        const currentImageCount = parsedExistingImages.length;

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const url = await handleUpload(file);
          // If there are no existing images and this is the first new image, mark it primary
          const isPrimary = currentImageCount === 0 && i === 0;

          uploadedUrls.push({
            product_id: id,
            url,
            is_primary: isPrimary,
            sort_order: currentImageCount + i
          });
        }
        await ProductImage.bulkCreate(uploadedUrls, { transaction });
      }

      await transaction.commit();

      // Return updated product details
      const updatedProduct = await Product.findByPk(id, {
        include: [
          { model: ProductVariant, as: 'variants' },
          { model: ProductImage, as: 'images' },
          { model: Category, as: 'category' }
        ]
      });

      if (updatedProduct) {
        // Evict detail caches
        await redis.del(`product:detail:${id}`);
        await redis.del(`product:detail:${updatedProduct.slug}`);
        
        // Sync to vector index and update Trie in background
        aiService.upsertProduct(updatedProduct).catch(err => console.error('[AI Service] Update sync error:', err));
        productTrie.insert(updatedProduct.name);
      }

      return res.json(updatedProduct);
    } catch (err) {
      await transaction.rollback();
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      console.error('Update product error:', err);
      return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  }
);

// DELETE /products/:id - Admin only: Delete Product
router.delete('/:id', auth, admin, async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id, {
      include: [{ model: ProductImage, as: 'images' }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clean up local images
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.url.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', 'public', img.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    const slug = product.slug;
    await product.destroy();

    // Evict Redis caches
    await redis.del(`product:detail:${id}`);
    await redis.del(`product:detail:${slug}`);

    // Delete from vector index in background
    aiService.deleteProduct(id).catch(err => console.error('[AI Service] Delete sync error:', err));

    return res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
