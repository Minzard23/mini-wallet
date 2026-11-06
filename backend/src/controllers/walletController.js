const pool = require('../config/db');
const { validateAmount } = require('../validators/walletValidator');

// GET /api/wallet -> lihat saldo saat ini
async function getWallet(req, res) {
  const result = await pool.query(
    'SELECT id, balance, updated_at FROM wallets WHERE user_id = $1',
    [req.user.id],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Wallet tidak ditemukan' });
  }
  return res.json({ success: true, data: result.rows[0] });
}

// POST /api/topup -> tambah saldo
async function topup(req, res) {
  const { error, amount } = validateAmount(req.body.amount);
  if (error) {
    return res.status(422).json({ success: false, message: error, errors: { amount: error } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tambah saldo & langsung ambil saldo terbaru (RETURNING)
    const walletResult = await client.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, balance`,
      [amount, req.user.id],
    );
    const wallet = walletResult.rows[0];

    // riwayat transaksi
    await client.query(
      `INSERT INTO transactions (type, amount, receiver_wallet_id, description)
       VALUES ('TOPUP', $1, $2, 'Top-up saldo')`,
      [amount, wallet.id],
    );

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: 'Top-up berhasil',
      data: { amount, balance: wallet.balance },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// POST /api/transfer -> kirim saldo ke user lain (berdasarkan email / nomor HP)
async function transfer(req, res) {
  // 1. Validasi input
  const errors = {};
  const { error: amountError, amount } = validateAmount(req.body.amount);
  if (amountError) errors.amount = amountError;

  const recipient = typeof req.body.recipient === 'string' ? req.body.recipient.trim().toLowerCase() : '';
  if (!recipient) errors.recipient = 'Email atau nomor HP penerima wajib diisi.';

  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (description.length > 100) errors.description = 'Catatan maksimal 100 karakter.';

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: Object.values(errors)[0], errors });
  }

  // 2. Cari wallet penerima berdasarkan email ATAU nomor HP
  const receiverResult = await pool.query(
    `SELECT w.id AS wallet_id, u.id AS user_id, u.username
     FROM users u
     JOIN wallets w ON w.user_id = u.id
     WHERE u.email = $1 OR u.phone = $1`,
    [recipient],
  );
  const receiver = receiverResult.rows[0];
  if (!receiver) {
    return res.status(404).json({ success: false, message: 'Penerima tidak ditemukan.' });
  }
  if (receiver.user_id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Tidak bisa transfer ke diri sendiri.' });
  }

  // 3. Proses transfer dalam SATU database transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 3a. Potong saldo pengirim, HANYA kalau saldonya cukup 
    //     Pengecekan & pemotongan terjadi dalam satu query 
    //     jadi 2 request bersamaan tidak bisa membuat saldo minus.
    const senderResult = await client.query(
      `UPDATE wallets SET balance = balance - $1, updated_at = NOW()
       WHERE user_id = $2 AND balance >= $1
       RETURNING id, balance`,
      [amount, req.user.id],
    );
    if (senderResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Saldo tidak cukup.' });
    }
    const sender = senderResult.rows[0];

    // 3b. Tambah saldo penerima
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, receiver.wallet_id],
    );

    // 3c. Catat transaksi
    const trxResult = await client.query(
      `INSERT INTO transactions (type, amount, sender_wallet_id, receiver_wallet_id, description)
       VALUES ('TRANSFER', $1, $2, $3, $4)
       RETURNING id, created_at`,
      [amount, sender.id, receiver.wallet_id, description || null],
    );

    // 3d. Semua langkah berhasil HARUSNYA :')
    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: `Transfer Rp${amount.toLocaleString('id-ID')} ke ${receiver.username} berhasil`,
      data: {
        transaction_id: trxResult.rows[0].id,
        amount,
        receiver: receiver.username,
        balance: sender.balance,
        created_at: trxResult.rows[0].created_at,
      },
    });
  } catch (err) {
    // Ada langkah yang gagal -> batalkan SEMUA (uang pengirim kembali)
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // format YYYY-MM-DD, contoh 2026-11-05

// Cek tanggal valid 
function isValidDate(text) {
  if (!DATE_REGEX.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

// GET /api/transactions -> riwayat mutasi (uang masuk & keluar) milik user yang login
// Filter opsional lewat query string:
//   ?from=2026-11-01&to=2026-11-30   -> periode (zona waktu WIB)
//   ?direction=IN | OUT              -> hanya uang masuk / keluar
//   ?limit=5                         -> jumlah data (1-500, default 100)
async function getTransactions(req, res) {
  const { from, to, direction } = req.query;
  const errors = {};

  if (from !== undefined && !isValidDate(from)) errors.from = 'Tanggal awal tidak valid (format YYYY-MM-DD).';
  if (to !== undefined && !isValidDate(to)) errors.to = 'Tanggal akhir tidak valid (format YYYY-MM-DD).';
  if (!errors.from && !errors.to && from && to && from > to) {
    errors.to = 'Tanggal akhir tidak boleh sebelum tanggal awal.';
  }
  if (direction !== undefined && !['IN', 'OUT'].includes(direction)) {
    errors.direction = 'Filter jenis harus IN atau OUT.';
  }
  const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) errors.limit = 'Limit harus angka 1-500.';

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: Object.values(errors)[0], errors });
  }

  // Parameter yang tidak diisi dikirim sebagai NULL -> kondisinya otomatis diabaikan di SQL
  const result = await pool.query(
    `WITH my_wallet AS (
       SELECT id FROM wallets WHERE user_id = $1
     ),
     history AS (
       SELECT t.id, t.type, t.amount, t.description, t.created_at,
              CASE WHEN t.receiver_wallet_id = (SELECT id FROM my_wallet) THEN 'IN' ELSE 'OUT' END AS direction,
              su.username AS sender,
              ru.username AS receiver
       FROM transactions t
       LEFT JOIN wallets sw ON sw.id = t.sender_wallet_id
       LEFT JOIN users   su ON su.id = sw.user_id
       JOIN wallets      rw ON rw.id = t.receiver_wallet_id
       JOIN users        ru ON ru.id = rw.user_id
       WHERE (t.sender_wallet_id = (SELECT id FROM my_wallet)
              OR t.receiver_wallet_id = (SELECT id FROM my_wallet))
         AND ($2::date IS NULL OR t.created_at >= ($2::date)::timestamp AT TIME ZONE 'Asia/Jakarta')
         AND ($3::date IS NULL OR t.created_at <  ($3::date + 1)::timestamp AT TIME ZONE 'Asia/Jakarta')
     )
     SELECT * FROM history
     WHERE ($4::text IS NULL OR direction = $4)
     ORDER BY created_at DESC, id DESC
     LIMIT $5`,
    [req.user.id, from || null, to || null, direction || null, limit],
  );
  return res.json({ success: true, data: result.rows });
}

module.exports = { getWallet, topup, transfer, getTransactions };
