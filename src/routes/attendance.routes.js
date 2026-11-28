const router = require('express').Router();
const attendanceController = require('../controllers/attendance.controller');
const authenticate = require('../middlewares/authenticate');

router.get('/today', authenticate, attendanceController.getToday);
router.post('/clock-in', authenticate, attendanceController.clockIn);

module.exports = router;