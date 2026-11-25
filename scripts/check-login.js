require('dotenv').config();
const pool = require('../src/config/db');
const { verifyPassword } = require('../src/utils/password');

async function main() {
  const email = process.argv[2];
  const password = process.env.CHECK_PASSWORD;

  const { rows } = await pool.query(
    'SELECT password_hash, is_active FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (!rows[0]) {
    console.log('email TIDAK ditemukan di database');
    return;
  }
  console.log('format hash    :', rows[0].password_hash.slice(0, 9));
  console.log('password cocok :', await verifyPassword(password, rows[0].password_hash));
  console.log('akun aktif     :', rows[0].is_active);
}

main().catch((e) => console.error(e.message)).finally(() => pool.end());