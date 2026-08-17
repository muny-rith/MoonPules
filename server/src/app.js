const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const requireAuth = require('./middleware/authMiddleware');

const postTrackerRoutes = require('./modules/postTracker/postTracker.routes');
const facebookRoutes = require('./modules/facebook/facebook.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Authentication for API routes
app.use('/api', requireAuth);

// Routes
app.use('/api/post-tracker', postTrackerRoutes);
app.use('/api/facebook', facebookRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;
