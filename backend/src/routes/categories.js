const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Category } = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Helper to create slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')         // Replace spaces with -
    .replace(/[^\w\-]+/g, '')     // Remove all non-word chars
    .replace(/\-\-+/g, '-');      // Replace multiple - with single -
};

// GET /categories - Public list (structured parent-child hierarchy)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });

    const categoryMap = {};
    const rootCategories = [];

    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat.toJSON(), subcategories: [] };
    });

    categories.forEach(cat => {
      const mapped = categoryMap[cat.id];
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].subcategories.push(mapped);
      } else {
        rootCategories.push(mapped);
      }
    });

    return res.json(rootCategories);
  } catch (err) {
    console.error('Fetch categories error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /categories - Admin only: Create
router.post(
  '/',
  auth,
  admin,
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('slug').optional().trim(),
    body('parent_id').optional({ nullable: true }).isInt().withMessage('Parent ID must be an integer'),
    body('sort_order').optional().isInt().withMessage('Sort order must be an integer'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { name, slug, description, parent_id, sort_order, is_active } = req.body;

    try {
      if (!slug || slug.trim() === '') {
        slug = slugify(name);
      } else {
        slug = slugify(slug);
      }

      // Check slug uniqueness
      let slugExists = await Category.findOne({ where: { slug } });
      let count = 1;
      let originalSlug = slug;
      while (slugExists) {
        slug = `${originalSlug}-${count}`;
        slugExists = await Category.findOne({ where: { slug } });
        count++;
      }

      // If parent_id is specified, verify it exists
      if (parent_id) {
        const parent = await Category.findByPk(parent_id);
        if (!parent) {
          return res.status(400).json({ message: 'Parent category not found' });
        }
      } else {
        parent_id = null;
      }

      const category = await Category.create({
        name,
        slug,
        description,
        parent_id,
        sort_order: sort_order || 0,
        is_active: is_active !== undefined ? is_active : true
      });

      return res.status(201).json(category);
    } catch (err) {
      console.error('Create category error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// PUT /categories/:id - Admin only: Edit
router.put(
  '/:id',
  auth,
  admin,
  [
    body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
    body('slug').optional().trim().notEmpty().withMessage('Slug cannot be empty'),
    body('parent_id').optional({ nullable: true }).isInt().withMessage('Parent ID must be an integer'),
    body('sort_order').optional().isInt().withMessage('Sort order must be an integer'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    let { name, slug, description, parent_id, sort_order, is_active } = req.body;

    try {
      const category = await Category.findByPk(id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      if (parent_id && parseInt(parent_id) === parseInt(id)) {
        return res.status(400).json({ message: 'A category cannot be its own parent' });
      }

      if (parent_id) {
        const parent = await Category.findByPk(parent_id);
        if (!parent) {
          return res.status(400).json({ message: 'Parent category not found' });
        }
        category.parent_id = parent_id;
      } else if (parent_id === null) {
        category.parent_id = null;
      }

      if (name) category.name = name;

      if (slug) {
        slug = slugify(slug);
        if (slug !== category.slug) {
          let slugExists = await Category.findOne({ where: { slug } });
          let count = 1;
          let originalSlug = slug;
          while (slugExists) {
            slug = `${originalSlug}-${count}`;
            slugExists = await Category.findOne({ where: { slug } });
            count++;
          }
          category.slug = slug;
        }
      }

      if (description !== undefined) category.description = description;
      if (sort_order !== undefined) category.sort_order = sort_order;
      if (is_active !== undefined) category.is_active = is_active;

      await category.save();
      return res.json(category);
    } catch (err) {
      console.error('Update category error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// DELETE /categories/:id - Admin only: Delete
router.delete('/:id', auth, admin, async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.destroy();
    return res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
