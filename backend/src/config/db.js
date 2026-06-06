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
const CartItem = require('../models/cartItem')(sequelize);
const WishlistItem = require('../models/wishlistItem')(sequelize);
const Address = require('../models/address')(sequelize);
const Order = require('../models/order')(sequelize);
const OrderItem = require('../models/orderItem')(sequelize);
const Banner = require('../models/banner')(sequelize);
const Promotion = require('../models/promotion')(sequelize);

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

// User & CartItem
User.hasMany(CartItem, { foreignKey: 'user_id', onDelete: 'CASCADE' });
CartItem.belongsTo(User, { foreignKey: 'user_id' });

// Product & CartItem
Product.hasMany(CartItem, { foreignKey: 'product_id', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'product_id' });

// ProductVariant & CartItem
ProductVariant.hasMany(CartItem, { foreignKey: 'variant_id', onDelete: 'SET NULL' });
CartItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variant_id' });

// User & WishlistItem
User.hasMany(WishlistItem, { foreignKey: 'user_id', onDelete: 'CASCADE' });
WishlistItem.belongsTo(User, { foreignKey: 'user_id' });

// Product & WishlistItem
Product.hasMany(WishlistItem, { foreignKey: 'product_id', onDelete: 'CASCADE' });
WishlistItem.belongsTo(Product, { foreignKey: 'product_id' });

// User & Address
User.hasMany(Address, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'user_id' });

// User & Order
User.hasMany(Order, { foreignKey: 'user_id', onDelete: 'SET NULL' });
Order.belongsTo(User, { foreignKey: 'user_id' });

// Order & OrderItem
Order.hasMany(OrderItem, { as: 'items', foreignKey: 'order_id', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

// Product & OrderItem
Product.hasMany(OrderItem, { foreignKey: 'product_id', onDelete: 'SET NULL' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

// ProductVariant & OrderItem
ProductVariant.hasMany(OrderItem, { foreignKey: 'variant_id', onDelete: 'SET NULL' });
OrderItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variant_id' });

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
  ProductImage,
  CartItem,
  WishlistItem,
  Address,
  Order,
  OrderItem,
  Banner,
  Promotion
};

