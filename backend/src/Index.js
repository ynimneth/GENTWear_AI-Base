const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, sequelize } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());         // Sets secure HTTP headers
app.use(cors());           // Enables Cross-Origin Resource Sharing
app.use(express.json());   // Parses incoming JSON request bodies

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