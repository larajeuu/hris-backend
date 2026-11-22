const { distanceInMeters, isWithinRadius } = require('../src/utils/geofence');

console.log('titik sama (harus 0):', distanceInMeters(-6.1754, 106.8272, -6.1754, 106.8272));
console.log('0.001 derajat lintang (harus ~111.19):', distanceInMeters(0, 0, 0.001, 0));
console.log('~50 m dari kantor, radius 100:', isWithinRadius(-6.17495, 106.8272, -6.1754, 106.8272, 100));
console.log('~111 m dari kantor, radius 100:', isWithinRadius(-6.1744, 106.8272, -6.1754, 106.8272, 100));