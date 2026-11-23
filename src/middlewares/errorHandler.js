const HttpError = require('../utils/httpError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    err = new HttpError(400, 'BAD_REQUEST', 'Format JSON tidak valid');
  } else if (err.type === 'entity.too.large') {
    err = new HttpError(413, 'FILE_TOO_LARGE', 'Ukuran data terlalu besar');
  }

  const known = err instanceof HttpError;
  if (!known) console.error(`[${req.id}]`, err); // detail lengkap hanya di log server

  res.status(known ? err.statusCode : 500).json({
    error: {
      code: known ? err.code : 'INTERNAL_ERROR',
      message: known
        ? err.message
        : 'Terjadi kesalahan pada server. Sertakan request_id saat melapor.',
      ...(known && err.fields ? { fields: err.fields } : {}),
      request_id: req.id,
    },
  });
}

module.exports = errorHandler;