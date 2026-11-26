const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('../utils/password');
const tokenService = require('./token.service');
const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

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

async function refresh(refreshToken, deviceId) {
  const client = await pool.connect();
  let outcome;
  try {
    await client.query('BEGIN');

    // FOR UPDATE: baris dikunci, supaya dua request bersamaan tidak lolos keduanya
    const { rows } = await client.query(
      `SELECT id, user_id, device_id, expires_at, revoked_at
       FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
      [tokenService.sha256(refreshToken)]
    );
    const row = rows[0];

    if (!row || row.device_id !== deviceId || row.expires_at <= new Date()) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Sesi tidak valid. Silakan login kembali.');
    }

    if (row.revoked_at) {
      // Token lama dipakai lagi: dicurigai dicuri, cabut semua sesi perangkat ini
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
        [row.user_id, row.device_id]
      );
      await client.query('COMMIT'); // pencabutan harus tersimpan walau kita melempar error
      outcome = { reused: true };
    } else {
      const userResult = await client.query(
        `SELECT u.id, u.role, u.is_active, u.employee_id,
                COALESCE(e.is_active, TRUE) AS employee_active
         FROM users u LEFT JOIN employees e ON e.id = u.employee_id
         WHERE u.id = $1`,
        [row.user_id]
      );
      const user = userResult.rows[0];
      if (!user || !user.is_active || !user.employee_active) {
        throw new HttpError(403, 'ACCOUNT_INACTIVE', 'Akun Anda dinonaktifkan. Hubungi HR.');
      }

      // Rotasi: terbitkan pasangan baru, token lama dicatat digantikan yang baru
      const tokens = await tokenService.issueTokens(user, deviceId, client);
      await client.query('UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2', [
        tokens.refresh_token_id,
        row.id,
      ]);
      await client.query('COMMIT');
      outcome = { tokens };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (outcome.reused) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Sesi tidak valid. Silakan login kembali.');
  }

  return {
    access_token: outcome.tokens.access_token,
    refresh_token: outcome.tokens.refresh_token,
    expires_in: outcome.tokens.expires_in,
  };
}

async function logout(userId, deviceId) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
    [userId, deviceId]
  );
}

async function changePassword(userId, deviceId, currentPassword, newPassword) {
  const { rows } = await pool.query(
    'SELECT id, password_hash FROM users WHERE id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw new HttpError(422, 'WRONG_PASSWORD', 'Password saat ini salah');
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
    throw new HttpError(
      422,
      'WEAK_PASSWORD',
      `Password baru harus ${PASSWORD_MIN_LENGTH} sampai ${PASSWORD_MAX_LENGTH} karakter`
    );
  }

  // 3 password terakhir = password saat ini + 2 password sebelumnya
  const previous = await pool.query(
    'SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2',
    [userId]
  );
  const lastThree = [user.password_hash, ...previous.rows.map((r) => r.password_hash)];
  for (const oldHash of lastThree) {
    if (await verifyPassword(newPassword, oldHash)) {
      throw new HttpError(422, 'WEAK_PASSWORD', 'Password baru tidak boleh sama dengan 3 password terakhir');
    }
  }

  const newHash = await hashPassword(newPassword);

  // Satu transaksi: ganti password, simpan riwayat, cabut sesi perangkat lain
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
      [userId, user.password_hash]
    );
    await client.query(
      `UPDATE users
       SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
       WHERE id = $2`,
      [newHash, userId]
    );
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND device_id <> $2 AND revoked_at IS NULL`,
      [userId, deviceId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { login, refresh, logout, changePassword, getMe };