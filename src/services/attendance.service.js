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


async function clockIn(employeeId, payload) {
  if (!employeeId) {
    throw new HttpError(403, 'FORBIDDEN', 'Akun ini tidak memiliki data absensi');
  }

  const { lat, lng, accuracy_m, is_mock } = payload;

  // Validasi input
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof accuracy_m !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(accuracy_m) ||
    lat < -90 || lat > 90 ||
    lng < -180 || lng > 180 ||
    accuracy_m < 0
  ) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Koordinat atau akurasi GPS tidak valid');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ambil jadwal hari ini dan kunci record jadwal
    const scheduleResult = await client.query(
      `SELECT
          ws.work_date,
          s.id AS shift_id,
          s.start_time,
          s.late_tolerance_min,
          s.is_overnight
       FROM work_schedules ws
       JOIN shifts s ON s.id = ws.shift_id
       WHERE ws.employee_id = $1
         AND ws.work_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
       FOR UPDATE OF ws`,
      [employeeId]
    );

    const schedule = scheduleResult.rows[0];

    if (!schedule) {
      throw new HttpError(422, 'NO_WORK_SCHEDULE', 'Tidak ada jadwal kerja hari ini');
    }

    // Ambil kantor
    const officeResult = await client.query(
      `SELECT
          o.id,
          o.latitude,
          o.longitude,
          o.radius_meters
       FROM employees e
       JOIN offices o ON o.id = e.office_id
       WHERE e.id = $1`,
      [employeeId]
    );

    const office = officeResult.rows[0];

    if (!office) {
      throw new HttpError(422, 'OFFICE_NOT_FOUND', 'Kantor karyawan tidak ditemukan');
    }

    // Ambil aturan absensi
    const rulesResult = await client.query(
      `SELECT value FROM settings WHERE key = 'attendance'`
    );

    const rules = rulesResult.rows[0]?.value || {
      max_accuracy_m: 30,
      selfie_required: false,
      reject_mock: false,
    };

    if (accuracy_m > Number(rules.max_accuracy_m)) {
      throw new HttpError(422, 'GPS_ACCURACY_TOO_LOW', 'Akurasi GPS tidak memenuhi ketentuan');
    }

    if (rules.reject_mock && is_mock === true) {
      throw new HttpError(422, 'MOCK_LOCATION_REJECTED', 'Lokasi palsu tidak diperbolehkan');
    }

    // Hitung jarak koordinat perangkat dengan kantor (Haversine)
    const toRad = (value) => value * Math.PI / 180;
    const earthRadius = 6371000;

    const dLat = toRad(Number(office.latitude) - lat);
    const dLng = toRad(Number(office.longitude) - lng);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) *
      Math.cos(toRad(Number(office.latitude))) *
      Math.sin(dLng / 2) ** 2;

    const distance = earthRadius * 2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

    if (distance > Number(office.radius_meters)) {
      throw new HttpError(422, 'OUTSIDE_OFFICE_RADIUS', 'Kamu berada di luar radius kantor');
    }

    // Hitung keterlambatan berdasarkan waktu server Asia/Jakarta
    const timeResult = await client.query(
        `SELECT
            GREATEST (
                0,
                FLOOR(
                    EXTRACT(
                        EPOCH FROM (
                            (NOW() AT TIME ZONE 'Asia/Jakarta')::time
                            -
                            ($1::time + make_interval(mins => $2))
                        )
                    ) / 60
                )
            )::int AS late_minutes`,
      [schedule.start_time, schedule.late_tolerance_min]
    );

    const lateMinutes = timeResult.rows[0].late_minutes;
    const status = lateMinutes > 0 ? 'late' : 'present';

    // Satu record per karyawan per tanggal.
    // Constraint UNIQUE juga melindungi dari request bersamaan.
    const insertResult = await client.query(
      `INSERT INTO attendances (
          employee_id,
          office_id,
          shift_id,
          work_date,
          clock_in,
          in_lat,
          in_lng,
          in_accuracy_m,
          in_distance_m,
          status,
          late_minutes
       )
       VALUES (
          $1, $2, $3,
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
          NOW(), $4, $5, $6, $7, $8, $9
       )
       RETURNING
          id,
          to_char(clock_in AT TIME ZONE 'Asia/Jakarta',
            'YYYY-MM-DD"T"HH24:MI:SS"+07:00"') AS clock_in,
          status,
          late_minutes`,
      [
        employeeId,
        office.id,
        schedule.shift_id,
        lat,
        lng,
        accuracy_m,
        distance,
        status,
        lateMinutes,
      ]
    );

    await client.query('COMMIT');

    return insertResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      throw new HttpError(409, 'ALREADY_CLOCKED_IN', 'Kamu sudah melakukan clock-in hari ini');
    }

    throw err;
  } finally {
    client.release();
  }
}


module.exports = { getToday, clockIn };