require('dotenv').config(); // harus paling atas, sebelum modul yang membaca process.env
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));