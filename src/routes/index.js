
const router = require('express').Router();

const healthController = require('../controllers/health.controller');
const authRoutes = require('./auth.routes');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');

// Health check
router.get('/health', healthController.getHealth);

// Authentication
router.use('/auth', authRoutes);

// Employee Profile
router.get('/me', authenticate, authController.me);

module.exports = router;
