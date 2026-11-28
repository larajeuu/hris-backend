const attendanceService = require('../services/attendance.service');

async function getToday(req, res, next) {
  try {
    res.json(await attendanceService.getToday(req.user.employee_id));
  } catch (err) {
    next(err);
  }
}


async function clockIn(req, res, next) {
  try {
    const employeeId = req.user.employee_id;

    const result = await attendanceService.clockIn(
      employeeId,
      req.body
    );

    res.status(201).json({
      message: 'Clock-in berhasil',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}


module.exports = { getToday, clockIn };