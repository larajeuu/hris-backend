
const router = require('express').Router();

const healthController = require('../controllers/health.controller');
const authRoutes = require('./auth.routes');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');
const pool = require('../config/db');

// Health check
router.get('/health', healthController.getHealth);

// Database diagnostic (sementara)
router.get('/debug/database', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        inet_server_addr()::text AS server_address
    `);

    res.json({
      connected: true,
      database: result.rows[0].database_name,
      user: result.rows[0].database_user,
      server: result.rows[0].server_address,
    });
  } catch (error) {
    next(error);
  }
});

// Authentication
router.use('/auth', authRoutes);

// Employee Profile
router.get('/me', authenticate, authController.me);

module.exports = router;
