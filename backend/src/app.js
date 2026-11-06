const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Izinkan frontend (React) mengakses API ini, termasuk mengirim cookie
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());   // membaca body request berformat JSON
app.use(cookieParser());   

// Endpoint sederhana untuk cek apakah server hidup
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Mini Wallet API is running' });
});

// ===== ROUTES =====
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/walletRoutes'));

// 404: route tidak ditemukan (HARUS di bawah semua route)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Error handler global: menangkap error yang tidak tertangani supaya server tidak crash
app.use((err, req, res, next) => {
  // Body JSON rusak, misal {"amount": } -> 400 Bad Request
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Format JSON tidak valid' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
});

module.exports = app;