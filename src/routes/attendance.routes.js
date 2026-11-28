const router = require('express').Router();
const attendanceController = require('../controllers/attendance.controller');
const authenticate = require('../middlewares/authenticate');

router.get('/today', authenticate, attendanceController.getToday);

module.exports = router;