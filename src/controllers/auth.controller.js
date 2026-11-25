const authService = require('../services/auth.service');
const HttpError = require('../utils/httpError');

async function login(req, res, next) {
  try {
    const { email, password, device } = req.body || {};

    const fields = {};
    if (typeof email !== 'string' || !email.trim()) fields.email = ['required'];
    if (typeof password !== 'string' || !password) fields.password = ['required'];
    if (!device || typeof device.id !== 'string' || !device.id.trim()) {
      fields['device.id'] = ['required'];
    } else if (device.id.length > 100) {
      fields['device.id'] = ['too_long'];
    }
    if (device && device.platform !== undefined && !['android', 'ios'].includes(device.platform)) {
      fields['device.platform'] = ['invalid'];
    }
    if (Object.keys(fields).length > 0) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'Email, password, dan data perangkat wajib diisi', fields);
    }

    const data = await authService.login(email.trim(), password, device);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const data = await authService.getMe(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };