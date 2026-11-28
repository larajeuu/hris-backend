const attendanceService = require('../services/attendance.service');

async function getToday(req, res, next) {
  try {
    res.json(await attendanceService.getToday(req.user.employee_id));
  } catch (err) {
    next(err);
  }
}

module.exports = { getToday };