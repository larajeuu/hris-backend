const authService = require('../services/auth.service');
const HttpError = require('../utils/httpError');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    // Validasi input: harus string dan tidak kosong
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new HttpError(400, 'Email dan password wajib diisi');
    }

    const data = await authService.login(email.trim(), password);
    res.json({ status: 'ok', data });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const data = await authService.getMe(req.user.id);
    res.json({ status: 'ok', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };