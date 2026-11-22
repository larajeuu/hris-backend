// Dipanggil kalau tidak ada route yang cocok
function notFound(req, res) {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
}

module.exports = notFound;