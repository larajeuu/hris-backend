const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Validasi koordinat dari client: harus angka dan dalam rentang yang masuk akal
function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

// Jarak dua titik dalam meter (rumus Haversine)
function distanceInMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

// Mengembalikan jarak dan status di dalam/luar radius
function isWithinRadius(userLat, userLng, officeLat, officeLng, radiusMeters) {
  const distance = distanceInMeters(userLat, userLng, officeLat, officeLng);
  return { distance, inside: distance <= radiusMeters };
}

module.exports = { isValidCoordinate, distanceInMeters, isWithinRadius };