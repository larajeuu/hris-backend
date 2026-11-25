const fs = require('fs');
const path = require('path');

// Prioritas: variabel berisi isi PEM (dipakai di Vercel), lalu file (dipakai di laptop)
function loadKey(pem, filePath, name) {
  if (pem) return pem.replace(/\\n/g, '\n');
  if (filePath) return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
  throw new Error(`${name} atau ${name}_PATH wajib diisi`);
}

const privateKey = loadKey(process.env.JWT_PRIVATE_KEY, process.env.JWT_PRIVATE_KEY_PATH, 'JWT_PRIVATE_KEY');
const publicKey = loadKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH, 'JWT_PUBLIC_KEY');

module.exports = {
  privateKey,
  publicKey,
  algorithm: 'RS256',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
};