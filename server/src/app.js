const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const requireAuth = require('./middleware/authMiddleware');

const authRoutes = require('./modules/auth/auth.routes');
const postTrackerRoutes = require('./modules/postTracker/postTracker.routes');
const facebookRoutes = require('./modules/facebook/facebook.routes');
const productsRoutes = require('./modules/products/products.routes');
const statisticsRoutes = require('./modules/statistics/statistics.routes');
const profitRoutes = require('./modules/profit/profit.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check route (unauthenticated)
app.use('/api/health', (req, res) => {
    res.json({ message: 'OK' });
});

// Login route (unauthenticated — must come before requireAuth)
app.use('/api/auth', authRoutes);

// Authentication for API routes below this line
app.use('/api', requireAuth);

// Routes
app.use('/api/post-tracker', postTrackerRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/profit', profitRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;