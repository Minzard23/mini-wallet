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

    // Catat di riwayat transaksi
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

    // 3a. Potong saldo pengirim, HANYA kalau saldonya cukup (balance >= amount).
    //     Pengecekan & pemotongan terjadi dalam satu query (atomik),
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

    // 3d. Semua langkah berhasil -> simpan permanen
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

// GET /api/transactions -> riwayat mutasi (uang masuk & keluar) milik user yang login
async function getTransactions(req, res) {
  const result = await pool.query(
    `WITH my_wallet AS (
       SELECT id FROM wallets WHERE user_id = $1
     )
     SELECT t.id, t.type, t.amount, t.description, t.created_at,
            CASE WHEN t.receiver_wallet_id = (SELECT id FROM my_wallet) THEN 'IN' ELSE 'OUT' END AS direction,
            su.username AS sender,
            ru.username AS receiver
     FROM transactions t
     LEFT JOIN wallets sw ON sw.id = t.sender_wallet_id
     LEFT JOIN users   su ON su.id = sw.user_id
     JOIN wallets      rw ON rw.id = t.receiver_wallet_id
     JOIN users        ru ON ru.id = rw.user_id
     WHERE t.sender_wallet_id   = (SELECT id FROM my_wallet)
        OR t.receiver_wallet_id = (SELECT id FROM my_wallet)
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 50`,
    [req.user.id],
  );
  return res.json({ success: true, data: result.rows });
}

module.exports = { getWallet, topup, transfer, getTransactions };
