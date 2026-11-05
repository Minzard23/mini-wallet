const MAX_TRANSACTION = 10_000_000; // batas maksimum per transaksi: Rp10.000.000

// Memeriksa nominal (amount) untuk top-up & transfer.
// Mengembalikan { error } kalau tidak valid, atau { amount } (angka) kalau valid.
function validateAmount(value) {
  // Kosong: tidak dikirim, null, atau string kosong/spasi
  if (value === undefined || value === null || String(value).trim() === '') {
    return { error: 'Nominal tidak boleh kosong.' };
  }

  // Hanya terima angka atau teks. Boolean/array/object langsung ditolak
  if (typeof value !== 'number' && typeof value !== 'string') {
    return { error: 'Nominal harus berupa angka.' };
  }

  const text = String(value).trim();

  if (/^-\d+(\.\d+)?$/.test(text)) return { error: 'Nominal tidak boleh negatif.' };
  if (/^\d+\.\d+$/.test(text)) return { error: 'Nominal harus bilangan bulat.' };
  if (!/^\d+$/.test(text)) return { error: 'Nominal harus berupa angka.' }; // huruf, simbol, spasi di tengah

  const amount = Number(text);
  if (amount <= 0) return { error: 'Nominal harus lebih dari 0.' };
  if (amount > MAX_TRANSACTION) return { error: 'Nominal melebihi batas maksimum transaksi.' };

  return { amount };
}

module.exports = { validateAmount, MAX_TRANSACTION };
