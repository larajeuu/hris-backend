const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const HttpError = require('../utils/httpError');

async function authenticate(req, res, next) {
  try {
    // Format header: Authorization: Bearer <token>
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'Token tidak ditemukan');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new HttpError(401, 'Token tidak valid atau sudah kedaluwarsa');
    }

    // Cek ke database: akun masih ada dan aktif, role selalu yang terbaru
    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw new HttpError(401, 'Akun tidak ditemukan atau tidak aktif');
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;