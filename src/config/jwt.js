const fs = require('fs');
const path = require('path');

const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;

if (!privateKeyPath || !publicKeyPath) {
  throw new Error(
    'JWT_PRIVATE_KEY_PATH dan JWT_PUBLIC_KEY_PATH wajib diisi di .env'
  );
}

const privateKey = fs.readFileSync(
  path.resolve(process.cwd(), privateKeyPath),
  'utf8'
);

const publicKey = fs.readFileSync(
  path.resolve(process.cwd(), publicKeyPath),
  'utf8'
);

module.exports = {
  privateKey,
  publicKey,
  algorithm: 'RS256',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
};