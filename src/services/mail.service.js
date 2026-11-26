async function sendPasswordResetEmail(to, link) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[MAIL-DEV] Reset password untuk ${to}: ${link}`);
    return;
  }
  // Di produksi tautan TIDAK dicatat di log. Sambungkan ke layanan email di sini.
  console.warn('[MAIL] Layanan email belum dikonfigurasi, email reset tidak terkirim');
}

module.exports = { sendPasswordResetEmail };