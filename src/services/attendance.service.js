const pool = require('../config/db');
const HttpError = require('../utils/httpError');

const DEFAULT_RULES = { max_accuracy_m: 30, selfie_required: true, reject_mock: true };

async function getToday(employeeId) {
  if (!employeeId) {
    throw new HttpError(403, 'FORBIDDEN', 'Akun ini tidak memiliki data absensi');
  }

  const [schedules, dateRes, rulesRes, officeRes, incompleteRes] = await Promise.all([
    pool.query(
      `SELECT ws.work_date::text AS work_date,
              (ws.work_date < (NOW() AT TIME ZONE 'Asia/Jakarta')::date) AS is_yesterday,
              s.code, s.is_overnight,
              to_char(s.start_time, 'HH24:MI') AS start_text,
              to_char(s.end_time, 'HH24:MI') AS end_text,
              to_char(s.start_time + make_interval(mins => s.late_tolerance_min), 'HH24:MI') AS late_after,
              ((ws.work_date + s.end_time
                + CASE WHEN s.is_overnight THEN INTERVAL '1 day' ELSE INTERVAL '0' END)
                AT TIME ZONE 'Asia/Jakarta') AS end_ts
       FROM work_schedules ws
       JOIN shifts s ON s.id = ws.shift_id
       WHERE ws.employee_id = $1
         AND ws.work_date IN ((NOW() AT TIME ZONE 'Asia/Jakarta')::date - 1,
                              (NOW() AT TIME ZONE 'Asia/Jakarta')::date)`,
      [employeeId]
    ),
    pool.query(`SELECT (NOW() AT TIME ZONE 'Asia/Jakarta')::date::text AS today`),
    pool.query(`SELECT value FROM settings WHERE key = 'attendance'`),
    pool.query(
      `SELECT o.name, o.latitude AS lat, o.longitude AS lng, o.radius_meters AS radius_m
       FROM employees e JOIN offices o ON o.id = e.office_id
       WHERE e.id = $1`,
      [employeeId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM attendances
       WHERE employee_id = $1 AND status = 'incomplete'`,
      [employeeId]
    ),
  ]);

  const now = new Date();

  // Shift malam yang dimulai kemarin dan belum berakhir tetap dianggap hari ini
  const fromYesterday = schedules.rows.find(
    (r) => r.is_yesterday && r.is_overnight && now < r.end_ts
  );
  const fromToday = schedules.rows.find((r) => !r.is_yesterday);
  const current = fromYesterday || fromToday || null;

  let attendance = null;
  if (current) {
    const result = await pool.query(
      `SELECT status,
              to_char(clock_in AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"') AS clock_in,
              to_char(clock_out AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"') AS clock_out
       FROM attendances
       WHERE employee_id = $1 AND work_date = $2`,
      [employeeId, current.work_date]
    );
    attendance = result.rows[0] || null;
  }

  let status;
  if (attendance) status = attendance.status;
  else if (!current) status = 'off';
  else status = now > current.end_ts ? 'absent' : 'not_started';

  const rules = { ...DEFAULT_RULES, ...(rulesRes.rows[0] ? rulesRes.rows[0].value : {}) };
  const office = officeRes.rows[0] || null;

  return {
    date: current ? current.work_date : dateRes.rows[0].today,
    shift: current
      ? { code: current.code, start: current.start_text, end: current.end_text, late_after: current.late_after }
      : null,
    clock_in: attendance ? attendance.clock_in : null,
    clock_out: attendance ? attendance.clock_out : null,
    status,
    rules: {
      office,
      max_accuracy_m: rules.max_accuracy_m,
      selfie_required: rules.selfie_required,
      reject_mock: rules.reject_mock,
    },
    office, // salinan di luar rules: letak office di dokumen kontrak ambigu, hapus salah satu setelah dikonfirmasi
    incomplete_count: incompleteRes.rows[0].n,
  };
}

module.exports = { getToday };