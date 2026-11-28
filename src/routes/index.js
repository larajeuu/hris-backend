const router = require('express').Router();
const healthController = require('../controllers/health.controller');
const profileController = require('../controllers/profile.controller');
const authRoutes = require('./auth.routes');
const attendanceRoutes = require('./attendance.routes');
const authenticate = require('../middlewares/authenticate');

router.get('/health', healthController.getHealth);
router.use('/auth', authRoutes);
router.get('/me', authenticate, profileController.getMe);
router.use('/attendance', attendanceRoutes);

module.exports = router;