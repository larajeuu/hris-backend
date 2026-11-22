if (process.env.NODE_ENV === 'production') {
  throw new Error('seed:dev tidak boleh dijalankan di production');
}

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function main() {
  const { EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD } = process.env;
  if (!EMPLOYEE_EMAIL || !EMPLOYEE_PASSWORD) {
    throw new Error('EMPLOYEE_EMAIL dan EMPLOYEE_PASSWORD wajib diisi di .env');
  }

  const office = (await pool.query(
    `SELECT id FROM offices WHERE name = 'Head Office'`
  )).rows[0];
  if (!office) throw new Error("Office 'Head Office' tidak ditemukan");

  const shift = (await pool.query(
    `SELECT id FROM shifts WHERE name = 'Office'`
  )).rows[0];
  if (!shift) throw new Error("Shift 'Office' tidak ditemukan");

  const passwordHash = await bcrypt.hash(EMPLOYEE_PASSWORD, 12);

  await pool.query(
    `INSERT INTO users
       (name, email, password_hash, role, office_id, employee_code, job_title, department)
     VALUES ('Pegawai Uji', $1, $2, 'employee', $3, 'E001', 'Staf Uji', 'Uji')
     ON CONFLICT ((LOWER(email))) DO NOTHING`,
    [EMPLOYEE_EMAIL, passwordHash, office.id]
  );

  const user = (await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
    [EMPLOYEE_EMAIL]
  )).rows[0];

  // "Hari ini" dihitung di database dengan zona Asia/Jakarta,
  // bukan new Date() di Node (server bisa berjalan di UTC).
  const result = await pool.query(
    `INSERT INTO work_schedules (user_id, work_date, shift_id)
     VALUES ($1, (NOW() AT TIME ZONE 'Asia/Jakarta')::date, $2)
     ON CONFLICT (user_id, work_date) DO NOTHING
     RETURNING work_date::text`,
    [user.id, shift.id]
  );

  console.log(
    result.rowCount
      ? `Pegawai uji siap. Jadwal dibuat untuk ${result.rows[0].work_date}`
      : 'Pegawai dan jadwal hari ini sudah ada, tidak ada perubahan'
  );
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());