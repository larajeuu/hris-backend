const pool = require('../config/db');

// Service = tempat logika dan akses data.
// Controller tidak boleh bicara langsung ke database.
async function checkDatabase() {
  const result = await pool.query('SELECT NOW() AS server_time');
  return result.rows[0].server_time;
}

module.exports = { checkDatabase };