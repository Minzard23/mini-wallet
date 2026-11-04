const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { validateRegister, validateLogin } = require('../validators/authValidator');
const { COOKIE_NAME, signToken, cookieOptions } = require('../utils/token');

const SALT_ROUNDS = 10;

async function register(req, res) {
  // 1. Validasi input
  const { errors, data } = validateRegister(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Data tidak valid', errors });
  }

  // 2. Cek data kembar
  const existing = await pool.query(
    `SELECT username, email, phone FROM users
     WHERE username = $1 OR email = $2 OR phone = $3`,
    [data.username, data.email, data.phone],
  );
  if (existing.rows.length > 0) {
    const dupErrors = {};
    for (const row of existing.rows) {
      if (row.username === data.username) dupErrors.username = 'Username sudah digunakan';
      if (row.email === data.email) dupErrors.email = 'Email sudah terdaftar';
      if (row.phone === data.phone) dupErrors.phone = 'Nomor HP sudah terdaftar';
    }
    return res.status(422).json({ success: false, message: 'Data sudah digunakan', errors: dupErrors });
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // 4. Simpan user + wallet dalam satu transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (username, email, phone, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, phone, created_at`,
      [data.username, data.email, data.phone, hashedPassword],
    );
    const user = userResult.rows[0];

    await client.query('INSERT INTO wallets (user_id) VALUES ($1)', [user.id]);

    await client.query('COMMIT');
    return res.status(201).json({ success: true, message: 'Registrasi berhasil, silakan login', data: user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(422).json({ success: false, message: 'Username, email, atau nomor HP sudah digunakan' });
    }
    throw err;
  } finally {
    client.release();
  }
}

async function login(req, res) {
  // 1. Validasi input
  const { errors, data } = validateLogin(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Data tidak valid', errors });
  }

  // 2. Cari user berdasarkan email
  const result = await pool.query(
    'SELECT id, username, email, phone, password FROM users WHERE email = $1',
    [data.email],
  );
  const user = result.rows[0];

  // 3. Cocokkan password
  const isValid = user && (await bcrypt.compare(data.password, user.password));
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Email atau password salah' });
  }

  // 4. Buat token & simpan di cookie
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions);

  delete user.password;
  return res.json({ success: true, message: 'Login berhasil', data: user });
}

function logout(req, res) {
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(COOKIE_NAME, clearOptions);
  return res.json({ success: true, message: 'Logout berhasil' });
}

async function me(req, res) {
  const result = await pool.query(
    'SELECT id, username, email, phone, created_at FROM users WHERE id = $1',
    [req.user.id],
  );
  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
  }
  return res.json({ success: true, data: result.rows[0] });
}

module.exports = { register, login, logout, me };