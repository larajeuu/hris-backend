const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { privateKey } = require('../config/jwt');

const ACCESS_TTL_SECONDS = 900; // 15 menit, sesuai kontrak
const REFRESH_TTL_DAYS = 30;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Peran: 'employee' atau 'hr', ditambah 'approver' bila punya bawahan aktif
async function resolveRoles(user) {
  const roles = [user.role];
  if (user.employee_id) {
    const { rows } = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM employees
         WHERE is_active AND (supervisor_1_id = $1 OR supervisor_2_id = $1)
       ) AS is_approver`,
      [user.employee_id]
    );
    if (rows[0].is_approver) roles.push('approver');
  }
  return roles;
}

async function issueTokens(user, deviceId) {
  const roles = await resolveRoles(user);

  const accessToken = jwt.sign(
    { sub: user.id, emp: user.employee_id, roles, did: deviceId },
    privateKey,
    { algorithm: 'RS256', expiresIn: ACCESS_TTL_SECONDS }
  );

  // Refresh token: acak 32 byte. Yang disimpan di database hanya hash-nya.
  const refreshToken = `rt_${crypto.randomBytes(32).toString('base64url')}`;

  // Login baru di perangkat yang sama menggantikan sesi lama perangkat itu
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
    [user.id, deviceId]
  );
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, device_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(days => $4::int))`,
    [user.id, deviceId, sha256(refreshToken), REFRESH_TTL_DAYS]
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TTL_SECONDS,
    roles,
  };
}

module.exports = { issueTokens };