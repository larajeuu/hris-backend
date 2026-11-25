
require('dotenv').config();

const pool = require('../src/config/db');
const { verifyPassword } = require('../src/utils/password');

async function main() {
  const email = process.argv[2];
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Email dan TEST_PASSWORD wajib diisi'
    );
  }

  const result = await pool.query(
    `SELECT email, password_hash
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    console.log('USER_FOUND: false');
    return;
  }

  const verified = await verifyPassword(
    password,
    user.password_hash
  );

  console.log({
    userFound: true,
    hashType: user.password_hash.startsWith('$argon2id$')
      ? 'ARGON2ID'
      : 'OTHER',
    passwordVerified: verified,
  });
}

main()
  .catch((err) => console.error(err.message))
  .finally(() => pool.end());
