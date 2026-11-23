
const fs = require('fs');
const path = require('path');

function loadKey(envKey, envPath) {
  if (process.env[envKey]) {
    return process.env[envKey].replace(/\\n/g, '\n');
  }

  if (process.env[envPath]) {
    return fs.readFileSync(
      path.resolve(process.cwd(), process.env[envPath]),
      'utf8'
    );
  }

  throw new Error(`${envKey} atau ${envPath} wajib diisi`);
}

const privateKey = loadKey(
  'JWT_PRIVATE_KEY',
  'JWT_PRIVATE_KEY_PATH'
);

const publicKey = loadKey(
  'JWT_PUBLIC_KEY',
  'JWT_PUBLIC_KEY_PATH'
);

module.exports = {
  privateKey,
  publicKey,
  algorithm: 'RS256',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
};
