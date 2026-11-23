const HttpError = require('../utils/httpError');

function notFound(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan'));
}

module.exports = notFound;