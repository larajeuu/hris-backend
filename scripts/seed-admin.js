require('dotenv').config();
const { hashPassword } = require('../src/utils/password');
const pool = require('../src/config/db');
const res = pm.response.json();

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi di .env');
  }

  // hash = hasil satu arah, tidak bisa dikembalikan jadi password asli
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  // $1, $2, $3 = parameter terpisah dari teks SQL (mencegah SQL injection)
  // ON CONFLICT DO NOTHING = aman dijalankan berulang, tidak membuat admin ganda
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT ((LOWER(email))) DO NOTHING
     RETURNING id, email`,
    [ADMIN_NAME || 'Admin HR', ADMIN_EMAIL, passwordHash]
  );

  console.log(
    result.rowCount
      ? `Admin dibuat: ${result.rows[0].email}`
      : 'Admin sudah ada, tidak ada perubahan'
  );
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end()); // tutup koneksi supaya proses bisa selesai