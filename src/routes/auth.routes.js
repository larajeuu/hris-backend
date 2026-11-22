const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');

router.get('/me', authenticate, authController.me);
router.post('/login', authController.login);

module.exports = router;