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

async function refresh(req, res, next) {
  try {
    const { refresh_token, device_id } = req.body || {};

    const fields = {};
    if (typeof refresh_token !== 'string' || !refresh_token) fields.refresh_token = ['required'];
    if (typeof device_id !== 'string' || !device_id.trim()) fields.device_id = ['required'];
    if (Object.keys(fields).length > 0) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'refresh_token dan device_id wajib diisi', fields);
    }

    const data = await authService.refresh(refresh_token, device_id.trim());
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id, req.user.device_id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body || {};

    const fields = {};
    if (typeof current_password !== 'string' || !current_password) fields.current_password = ['required'];
    if (typeof new_password !== 'string' || !new_password) fields.new_password = ['required'];
    if (Object.keys(fields).length > 0) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'Password saat ini dan password baru wajib diisi', fields);
    }

    await authService.changePassword(req.user.id, req.user.device_id, current_password, new_password);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'Email wajib diisi', { email: ['required'] });
    }

    await authService.requestPasswordReset(email.trim());
    // Selalu 202, apa pun hasilnya, sesuai kontrak
    res.status(202).json({ message: 'Jika email terdaftar, tautan reset telah dikirim' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body || {};

    const fields = {};
    if (typeof token !== 'string' || !token) fields.token = ['required'];
    if (typeof new_password !== 'string' || !new_password) fields.new_password = ['required'];
    if (Object.keys(fields).length > 0) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'Token dan password baru wajib diisi', fields);
    }

    await authService.resetPassword(token, new_password);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, refresh, logout, changePassword, forgotPassword, resetPassword };