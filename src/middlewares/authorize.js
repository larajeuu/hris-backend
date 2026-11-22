const HttpError = require('../utils/httpError');

// Dipakai SETELAH authenticate. Contoh: authorize('admin')
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new HttpError(403, 'Anda tidak punya akses ke fitur ini'));
    }
    next();
  };
}

module.exports = authorize;