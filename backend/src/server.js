require('dotenv').config({ quiet: true }); // baca file .env PALING AWAL, sebelum file lain butuh isinya

const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await pool.query('SELECT 1'); // tes koneksi database dulu
    console.log('Database connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    const details = err.errors ? err.errors.map((e) => e.message).join(' | ') : err.message;
    console.error('Gagal konek ke database:', err.code || err.name, '-', details);
    process.exit(1); // hentikan server kalau database tidak bisa diakses
  }
}

start();
