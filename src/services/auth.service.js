const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('../utils/password');
const tokenService = require('./token.service');
const pool = require('../config/db');
const HttpError = require('../utils/httpError');

let dummyHashPromise;

async function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('testing123');
  }

  return dummyHashPromise;
}

async function login(email, password, device) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active,
            u.employee_id, COALESCE(e.is_active, TRUE) AS employee_active
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  const user = result.rows[0];

  // Pesan sengaja sama untuk "email tidak ada" dan "password salah"
  const invalid = new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');

  if (!user) {
    await verifyPassword(password, await getDummyHash()); // waktu respons tetap mirip
    throw invalid;
  }

  if (!(await verifyPassword(password, user.password_hash))) throw invalid;

  if (!user.is_active || !user.employee_active) {
    throw new HttpError(403, 'ACCOUNT_INACTIVE', 'Akun Anda dinonaktifkan. Hubungi HR.');
  }

  const tokens = await tokenService.issueTokens(user, device.id);

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    user: {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      roles: tokens.roles,
      biometric_enabled: false, // diaktifkan saat fitur biometrik dibuat
    },
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