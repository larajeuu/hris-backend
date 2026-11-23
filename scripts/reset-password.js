require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function main() {
  const email = process.argv[2];
  const newPassword = process.env.NEW_PASSWORD;

  if (!email || !newPassword || newPassword.length < 12) {
    throw new Error('Pakai: set NEW_PASSWORD (min 12 karakter), lalu node scripts/reset-password.js <email>');
  }

  const hash = await bcrypt.hash(newPassword, 12);
  const result = await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) RETURNING email',
    [hash, email]
  );

  console.log(result.rowCount ? `Password diperbarui: ${result.rows[0].email}` : 'Email tidak ditemukan');
}

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => pool.end());