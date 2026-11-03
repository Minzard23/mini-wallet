const { Pool, types } = require('pg');

// Kolom BIGINT (kode tipe 20) secara default dikembalikan sebagai string oleh pg.
// Kita ubah jadi Number supaya saldo bisa langsung dihitung & dikirim sebagai angka.
// Aman sampai 9 kuadriliun (Number.MAX_SAFE_INTEGER), jauh di atas kebutuhan wallet ini.
types.setTypeParser(20, (value) => Number(value));

// Pool = kumpulan koneksi database yang bisa dipakai bergantian (lebih efisien
// daripada membuka koneksi baru setiap ada request)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Database online seperti Neon wajib SSL; database lokal tidak
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
