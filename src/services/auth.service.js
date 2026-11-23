const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const { privateKey } = require('../config/jwt');

async function login(email, password) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, is_active
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  const user = result.rows[0];

  // Pesan sengaja sama untuk "email tidak ada" dan "password salah",
  // supaya penyerang tidak bisa mengetahui email mana yang terdaftar.
  const invalid = new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');

  if (!user.is_active) throw new HttpError(403, 'ACCOUNT_INACTIVE', 'Akun Anda dinonaktifkan. Hubungi HR.');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw invalid;
  
  // Isi token: id (sub) dan role saja. Tanpa password, tanpa data pribadi.
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    privateKey,
    { algorithm: 'RS256', expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
async function getMe(userId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.employee_code, u.job_title,
            u.department, u.phone, u.photo_url,
            u.contract_end_date::text AS contract_end_date,
            o.id AS office_id, o.name AS office_name,
            o.latitude, o.longitude, o.radius_meters
     FROM users u
     LEFT JOIN offices o ON o.id = u.office_id
     WHERE u.id = $1`,
    [userId]
  );
  const r = result.rows[0];
  if (!r) throw new HttpError(404, 'Pengguna tidak ditemukan');

  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    employee_code: r.employee_code,
    job_title: r.job_title,
    department: r.department,
    phone: r.phone,
    photo_url: r.photo_url,
    contract_end_date: r.contract_end_date,
    office: r.office_id
      ? {
          id: r.office_id,
          name: r.office_name,
          latitude: r.latitude,
          longitude: r.longitude,
          radius_meters: r.radius_meters,
        }
      : null,
  };
}

module.exports = { login, getMe };