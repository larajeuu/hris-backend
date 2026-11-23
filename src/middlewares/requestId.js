const crypto = require('crypto');

// Memberi setiap request satu id, dikirim balik lewat header X-Request-Id
function requestId(req, res, next) {
  req.id = `req_${crypto.randomBytes(4).toString('hex')}`;
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;