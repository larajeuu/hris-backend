const { isValidCoordinate, isWithinRadius } = require('./geofence');
const rules = require('../config/attendanceRules');

// Urutan: data valid -> akurasi cukup -> di dalam radius kantor
function validateLocation({ lat, lng, accuracy }, office) {
  if (!isValidCoordinate(lat, lng) || !Number.isFinite(accuracy) || accuracy < 0) {
    return { ok: false, code: 'INVALID_LOCATION', message: 'Data lokasi tidak valid' };
  }

  if (accuracy > rules.MAX_GPS_ACCURACY_METERS) {
    return {
      ok: false,
      code: 'LOW_ACCURACY',
      message: `Akurasi GPS terlalu rendah (±${Math.round(accuracy)} m). Pindah ke area terbuka lalu coba lagi.`,
    };
  }

  const { distance, inside } = isWithinRadius(
    lat, lng, office.latitude, office.longitude, office.radius_meters
  );
  if (!inside) {
    return {
      ok: false,
      code: 'OUTSIDE_RADIUS',
      distance,
      message: `Anda berada ${Math.round(distance)} m dari kantor (maksimal ${office.radius_meters} m)`,
    };
  }

  return { ok: true, distance };
}

// Check-in: diterima kapan pun sebelum shift berakhir.
// Sebelum atau tepat jam mulai = on_time. Setelahnya = late (tanpa toleransi).
// now, shiftStart, shiftEnd = objek Date (titik waktu absolut)
function evaluateCheckIn(now, shiftStart, shiftEnd) {
  if (now > shiftEnd) {
    return { ok: false, code: 'SHIFT_ENDED', message: 'Shift sudah berakhir. Ajukan koreksi absen.' };
  }
  return { ok: true, status: now > shiftStart ? 'late' : 'on_time' };
}

// Check-out: baru diterima saat jam selesai shift tiba.
function evaluateCheckOut(now, shiftEnd) {
  if (now < shiftEnd) {
    return {
      ok: false,
      code: 'CHECKOUT_TOO_EARLY',
      message: 'Belum waktunya check-out. Check-out dibuka saat shift berakhir.',
    };
  }
  return { ok: true, status: 'on_time' };
}

module.exports = { validateLocation, evaluateCheckIn, evaluateCheckOut };