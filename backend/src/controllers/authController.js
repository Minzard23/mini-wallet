const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { validateRegister } = require('../validators/authValidator');

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

module.exports = { register };