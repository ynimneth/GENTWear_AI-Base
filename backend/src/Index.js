const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, sequelize } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());         // Sets secure HTTP headers
app.use(cors());           // Enables Cross-Origin Resource Sharing
app.use(express.json());   // Parses incoming JSON request bodies
app.use(cookieParser());   // Parses cookies attached to client requests

// Routes
const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

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

    // 3. Start listening
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();