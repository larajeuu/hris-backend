const authService = require('../services/auth.service');
const HttpError = require('../utils/httpError');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    const fields = {};
    if (typeof email !== 'string' || !email.trim()) fields.email = ['required'];
    if (typeof password !== 'string' || !password) fields.password = ['required'];
    if (Object.keys(fields).length > 0) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'Email dan password wajib diisi', fields);
    }

    const data = await authService.login(email.trim(), password);
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