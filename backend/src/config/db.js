const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
  }
);

// Import models
const User = require('../models/user')(sequelize);
const Category = require('../models/category')(sequelize);
const Product = require('../models/product')(sequelize);
const ProductVariant = require('../models/productVariant')(sequelize);
const ProductImage = require('../models/productImage')(sequelize);

// Associations
// Category self-reference
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parent_id', onDelete: 'CASCADE' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parent_id' });

// Category & Product
Category.hasMany(Product, { foreignKey: 'category_id', onDelete: 'SET NULL' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Product & ProductVariant
Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product & ProductImage
Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL database connected successfully via Sequelize!');
  } catch (error) {
    console.error('Unable to connect to the PostgreSQL database:', error);
    process.exit(1);
  }
};

module.exports = { 
  sequelize, 
  connectDB, 
  User, 
  Category, 
  Product, 
  ProductVariant, 
  ProductImage 
};

