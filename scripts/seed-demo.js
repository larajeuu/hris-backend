require('dotenv').config();
const pool = require('../src/config/db');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-demo tidak boleh dijalankan di production');
  }

  const email = process.env.EMPLOYEE_EMAIL || 'pegawai1@hris.com';
  const { rows } = await pool.query(
    'SELECT employee_id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (!rows[0] || !rows[0].employee_id) {
    throw new Error('Akun pegawai uji tidak ditemukan atau belum punya data karyawan');
  }

  // Shift khusus demo: berlaku seharian
  await pool.query(
    `INSERT INTO shifts (name, code, start_time, end_time)
     VALUES ('Demo', 'demo', '00:00', '23:59')
     ON CONFLICT (code) DO NOTHING`
  );

  // Jadwal 14 hari ke depan (tanggal dihitung dengan zona Asia/Jakarta)
  const result = await pool.query(
    `INSERT INTO work_schedules (employee_id, work_date, shift_id)
     SELECT $1::uuid, d::date, (SELECT id FROM shifts WHERE code = 'demo')
     FROM generate_series(
       (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
       (NOW() AT TIME ZONE 'Asia/Jakarta')::date + 13,
       interval '1 day'
     ) AS d
     ON CONFLICT (employee_id, work_date) DO NOTHING`,
    [rows[0].employee_id]
  );

  console.log(`Jadwal demo ditambahkan: ${result.rowCount} hari`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());