const {
  validateLocation, evaluateCheckIn, evaluateCheckOut,
} = require('../src/utils/attendanceRules');

const office = { latitude: -6.1754, longitude: 106.8272, radius_meters: 200 };
const at = (iso) => new Date(iso); // iso HARUS memakai offset, contoh +07:00
let failed = 0;

// Membandingkan hasil dengan yang diharapkan, lalu mencetak LULUS atau GAGAL
function check(name, actual, expected) {
  const ok = Object.entries(expected).every(([key, value]) => actual[key] === value);
  if (!ok) failed++;
  console.log(`[${ok ? 'LULUS' : 'GAGAL'}] ${name}`);
  if (!ok) {
    console.log(`        diharapkan: ${JSON.stringify(expected)}`);
    console.log(`        hasil     : ${JSON.stringify(actual)}`);
  }
}

console.log('--- Lokasi (radius 200 m, batas akurasi 30 m) ---');
check('50 m, akurasi 10 -> diterima', validateLocation({ lat: -6.17495, lng: 106.8272, accuracy: 10 }, office), { ok: true });
check('111 m, akurasi 10 -> diterima', validateLocation({ lat: -6.1744, lng: 106.8272, accuracy: 10 }, office), { ok: true });
check('250 m, akurasi 10 -> di luar radius', validateLocation({ lat: -6.17315, lng: 106.8272, accuracy: 10 }, office), { ok: false, code: 'OUTSIDE_RADIUS' });
check('akurasi tepat 30 -> diterima', validateLocation({ lat: -6.17495, lng: 106.8272, accuracy: 30 }, office), { ok: true });
check('akurasi 31 -> akurasi rendah', validateLocation({ lat: -6.17495, lng: 106.8272, accuracy: 31 }, office), { ok: false, code: 'LOW_ACCURACY' });
check('90 m, akurasi 80 -> akurasi rendah', validateLocation({ lat: -6.17455, lng: 106.8272, accuracy: 80 }, office), { ok: false, code: 'LOW_ACCURACY' });
check('lat 200 -> data tidak valid', validateLocation({ lat: 200, lng: 106.8272, accuracy: 10 }, office), { ok: false, code: 'INVALID_LOCATION' });

console.log('--- Shift Office 09:00-17:00 ---');
const start = at('2026-11-23T09:00:00+07:00');
const end = at('2026-11-23T17:00:00+07:00');
check('check-in 07:00 (sebelum shift) -> on_time', evaluateCheckIn(at('2026-11-23T07:00:00+07:00'), start, end), { ok: true, status: 'on_time' });
check('check-in 09:00:00 -> on_time', evaluateCheckIn(at('2026-11-23T09:00:00+07:00'), start, end), { ok: true, status: 'on_time' });
check('check-in 09:00:01 -> late', evaluateCheckIn(at('2026-11-23T09:00:01+07:00'), start, end), { ok: true, status: 'late' });
check('check-in 16:30 -> late (shift masih jalan)', evaluateCheckIn(at('2026-11-23T16:30:00+07:00'), start, end), { ok: true, status: 'late' });
check('check-in 17:01 -> shift berakhir', evaluateCheckIn(at('2026-11-23T17:01:00+07:00'), start, end), { ok: false, code: 'SHIFT_ENDED' });
check('check-out 16:59:59 -> terlalu awal', evaluateCheckOut(at('2026-11-23T16:59:59+07:00'), end), { ok: false, code: 'CHECKOUT_TOO_EARLY' });
check('check-out 17:00:00 -> tersimpan', evaluateCheckOut(at('2026-11-23T17:00:00+07:00'), end), { ok: true, status: 'on_time' });
check('check-out 18:30 -> tersimpan', evaluateCheckOut(at('2026-11-23T18:30:00+07:00'), end), { ok: true, status: 'on_time' });

console.log('--- Shift Malam 22:00-06:00 (melewati tengah malam) ---');
const nStart = at('2026-11-23T22:00:00+07:00');
const nEnd = at('2026-11-24T06:00:00+07:00');
check('check-in 21:00 -> on_time', evaluateCheckIn(at('2026-11-23T21:00:00+07:00'), nStart, nEnd), { ok: true, status: 'on_time' });
check('check-in 22:00:01 -> late', evaluateCheckIn(at('2026-11-23T22:00:01+07:00'), nStart, nEnd), { ok: true, status: 'late' });
check('check-in 00:30 tgl 24 -> late', evaluateCheckIn(at('2026-11-24T00:30:00+07:00'), nStart, nEnd), { ok: true, status: 'late' });
check('check-in 06:01 tgl 24 -> shift berakhir', evaluateCheckIn(at('2026-11-24T06:01:00+07:00'), nStart, nEnd), { ok: false, code: 'SHIFT_ENDED' });
check('check-out 23:30 tgl 23 -> terlalu awal', evaluateCheckOut(at('2026-11-23T23:30:00+07:00'), nEnd), { ok: false, code: 'CHECKOUT_TOO_EARLY' });
check('check-out 05:59 tgl 24 -> terlalu awal', evaluateCheckOut(at('2026-11-24T05:59:00+07:00'), nEnd), { ok: false, code: 'CHECKOUT_TOO_EARLY' });
check('check-out 06:00 tgl 24 -> tersimpan', evaluateCheckOut(at('2026-11-24T06:00:00+07:00'), nEnd), { ok: true, status: 'on_time' });

console.log(failed ? `\n${failed} tes GAGAL` : '\nSemua tes lulus');
process.exitCode = failed ? 1 : 0;