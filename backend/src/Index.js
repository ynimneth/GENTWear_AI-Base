const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, sequelize } = require('./config/db');
const { pc } = require('./config/pinecone');

async function testPinecone() {
  try {
    const indexes = await pc.listIndexes();
    console.log('Pinecone connected. Indexes:', indexes);
  } catch (err) {
    console.error('Pinecone connection test failed:', err);
  }
}

testPinecone();


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());         // Sets secure HTTP headers
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));           // Enables Cross-Origin Resource Sharing
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/payments/webhook')) {
      req.rawBody = buf;
    }
  }
}));   // Parses incoming JSON request bodies and captures raw body for Stripe signature verification
app.use(cookieParser());   // Parses cookies attached to client requests

// Serve static files for uploaded product images
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Routes
const authRouter = require('./routes/auth');
const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const wishlistRouter = require('./routes/wishlist');
const addressesRouter = require('./routes/addresses');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');

app.use('/auth', authRouter);
app.use('/categories', categoriesRouter);
app.use('/products', productsRouter);
app.use('/cart', cartRouter);
app.use('/wishlist', wishlistRouter);
app.use('/addresses', addressesRouter);
app.use('/orders', ordersRouter);
app.use('/payments', paymentsRouter);
app.use('/admin', adminRouter);
app.use('/assistant', require('./routes/assistant'));
app.use('/', require('./routes/reviews'));


// Test Protected / Admin Routes
const auth = require('./middleware/auth');
const admin = require('./middleware/admin');

// Any logged-in user
app.get('/profile', auth, (req, res) => {
  res.json(req.user);
});

// Admins only — stack both middlewares
app.get('/admin/users', auth, admin, (req, res) => {
  res.json({ message: 'Admin area' });
});

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Start server after connecting and syncing database
const startServer = async () => {
  try {
    // 1. Connect to PostgreSQL database
    await connectDB();

    // 2. Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true }); // Use alter: true to safely update schema in development
    console.log('Database synchronized successfully.');

    // 3. Start Pinecone Vector synchronization pipeline
    const aiService = require('./services/aiService');
    aiService.syncAllProducts().catch(err => console.error('[AI Service] Startup sync error:', err));

    // 4. Start Heap-based low stock background checking alerts
    const runStockHeapCheck = async () => {
      try {
        const MinHeap = require('./algorithms/MinHeap');
        const { ProductVariant, Product } = require('./config/db');
        const variants = await ProductVariant.findAll({
  include: [{
    model: Product,
    as: 'product',
    attributes: ['name']
  }]
});

        const heap = new MinHeap((a, b) => a.stock_qty - b.stock_qty);
        for (const v of variants) {
          heap.insert(v);
        }

        const lowStockList = [];
        while (heap.size() > 0) {
          const item = heap.extractMin();
          if (item.stock_qty < 10) {
            lowStockList.push(`- ${item.Product?.name || 'Unknown Product'} (${item.size || ''} ${item.color || ''}) - Qty: ${item.stock_qty} (SKU: ${item.sku || 'N/A'})`);
          } else {
            break;
          }
        }

        if (lowStockList.length > 0) {
          console.warn(`[Inventory Alert Cron] low stock variants detected:\n${lowStockList.join('\n')}`);
        } else {
          console.log('[Inventory Alert Cron] All inventory levels within normal bounds.');
        }
      } catch (err) {
        console.error('[Inventory Alert Cron] Heap check error:', err);
      }
    };

    // Run stock alert check once on boot, then every 1 hour
    runStockHeapCheck();
    setInterval(runStockHeapCheck, 60 * 60 * 1000);

    // 5. Start listening
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
