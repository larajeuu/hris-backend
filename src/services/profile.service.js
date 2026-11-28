const pool = require('../config/db');
const HttpError = require('../utils/httpError');

async function getProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.name AS user_name, u.email, u.role, u.phone, u.photo_url,
            e.id AS emp_id, e.code, e.name AS emp_name, e.position, e.department,
            e.default_shift, e.annual_quota, e.quota_remaining,
            e.contract_end_date::text AS contract_end_date,
            (e.contract_end_date - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) AS days_left,
            o.id AS office_id, o.name AS office_name,
            s1.id AS s1_id, s1.name AS s1_name,
            s2.id AS s2_id, s2.name AS s2_name,
            EXISTS (
              SELECT 1 FROM employees x
              WHERE x.is_active AND (x.supervisor_1_id = e.id OR x.supervisor_2_id = e.id)
            ) AS is_approver
     FROM users u
     LEFT JOIN employees e  ON e.id = u.employee_id
     LEFT JOIN offices   o  ON o.id = e.office_id
     LEFT JOIN employees s1 ON s1.id = e.supervisor_1_id
     LEFT JOIN employees s2 ON s2.id = e.supervisor_2_id
     WHERE u.id = $1`,
    [userId]
  );
  const r = rows[0];
  if (!r) throw new HttpError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');

  const roles = [r.role];
  if (r.is_approver) roles.push('approver');

  return {
    id: r.emp_id || r.user_id, // akun HR tanpa data karyawan memakai id akun
    code: r.code,
    name: r.emp_name || r.user_name,
    position: r.position,
    department: r.department,
    photo_url: r.photo_url, // URL bertanda tangan menyusul saat fitur foto dibuat
    default_shift: r.default_shift,
    supervisor_1: r.s1_id ? { id: r.s1_id, name: r.s1_name } : null,
    supervisor_2: r.s2_id ? { id: r.s2_id, name: r.s2_name } : null,
    office: r.office_id ? { id: r.office_id, name: r.office_name } : null,
    contact: { email: r.email, phone: r.phone },
    contract: r.contract_end_date
      ? { end_date: r.contract_end_date, days_left: r.days_left }
      : null,
    leave_balance: r.emp_id
      ? {
          annual_quota: r.annual_quota,
          remaining: Number(r.quota_remaining),
          pending_days: 0, // dihitung dari pengajuan saat fitur pengajuan dibuat
        }
      : null,
    is_approver: Boolean(r.is_approver),
    roles,
  };
}

module.exports = { getProfile };