console.log('[MAIL CHECK] NODE_ENV:', process.env.NODE_ENV);

async function sendPasswordResetEmail(to, link) {
  console.log('[MAIL CHECK] Fungsi email terpanggil');

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[MAIL-DEV] Reset password untuk ${to}: ${link}`);
    return;
  }

  console.warn('[MAIL] Layanan email belum dikonfigurasi');
}

module.exports = { sendPasswordResetEmail };