require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function main() {
  // Tabel pencatat: migrasi mana yang sudah pernah dijalankan
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied = new Set(
    (await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
  );

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`lewati      ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      // Satu transaksi: semua berhasil, atau tidak ada yang berubah
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`diterapkan  ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Gagal pada ${file}: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());