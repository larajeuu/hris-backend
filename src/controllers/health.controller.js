const healthService = require('../services/health.service');

async function getHealth(req, res, next) {
  try {
    const dbTime = await healthService.checkDatabase();
    res.json({ status: 'ok', db_time: dbTime });
  } catch (err) {
    next(err); // serahkan ke error handler terpusat
  }
}

module.exports = { getHealth };