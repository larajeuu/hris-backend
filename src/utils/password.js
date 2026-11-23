const { hash, verify, Algorithm } = require('@node-rs/argon2');

const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

function hashPassword(plain) {
  return hash(plain, ARGON2_OPTIONS);
}

async function verifyPassword(plain, storedHash) {
  try {
    return await verify(storedHash, plain);
  } catch {
    // hash tidak dikenali (misalnya sisa bcrypt) dianggap tidak cocok
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };