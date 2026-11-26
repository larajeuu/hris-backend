const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.put('/password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);
router.post('/password/forgot', authController.forgotPassword);
router.post('/password/reset', authController.resetPassword);

module.exports = router;