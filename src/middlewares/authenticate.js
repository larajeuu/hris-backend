const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const jwtConfig = require('../config/jwt');
const HttpError = require('../utils/httpError');

async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Silakan login terlebih dahulu');
    }

    let payload;
    try {
      payload = jwt.verify(token, jwtConfig.publicKey, { algorithms: ['RS256'] });
    } catch (error) {
      console.error(`[${req.id}] JWT verify error:`, error.name, '-', error.message);
      // TOKEN_EXPIRED dibedakan, karena app memakainya untuk menukar refresh token
      if (error.name === 'TokenExpiredError') {
        throw new HttpError(401, 'TOKEN_EXPIRED', 'Sesi Anda telah berakhir');
      }
      throw new HttpError(401, 'UNAUTHENTICATED', 'Token tidak valid');
    }

    const result = await pool.query(
      `SELECT id, name, email, role, is_active FROM users WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];

    if (!user) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Akun tidak ditemukan');
    }
    if (!user.is_active) {
      throw new HttpError(403, 'ACCOUNT_INACTIVE', 'Akun Anda dinonaktifkan. Hubungi HR.');
    }

    req.user = {
      id: user.id,
      employee_id: payload.emp,
      roles: payload.roles || [],
      device_id: payload.did,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;