// Express mengenali error handler dari jumlah parameternya (harus 4)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err); // detail lengkap hanya di log server

  const status = err.statusCode || 500;
  res.status(status).json({
    status: 'error',
    // jangan bocorkan detail internal (misal pesan error database) ke client
    message: status === 500 ? 'Terjadi kesalahan pada server' : err.message,
  });
}

module.exports = errorHandler;