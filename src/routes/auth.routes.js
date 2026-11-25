const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);

module.exports = router;