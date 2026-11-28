const profileService = require('../services/profile.service');

async function getMe(req, res, next) {
  try {
    res.json(await profileService.getProfile(req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };