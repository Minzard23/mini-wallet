// Aturan SAMA dengan backend (walletValidator.js), supaya error muncul
// sebelum request dikirim. Backend tetap memvalidasi ulang (jangan percaya client).
export const MAX_TRANSACTION = 10_000_000;

// Mengembalikan pesan error (string), atau '' kalau valid
export function validateAmount(value) {
  const text = String(value ?? '').trim();
  if (text === '') return 'Nominal tidak boleh kosong.';
  if (/^-\d+(\.\d+)?$/.test(text)) return 'Nominal tidak boleh negatif.';
  if (/^\d+[.,]\d+$/.test(text)) return 'Nominal harus bilangan bulat.';
  if (!/^\d+$/.test(text)) return 'Nominal harus berupa angka.';
  const amount = Number(text);
  if (amount <= 0) return 'Nominal harus lebih dari 0.';
  if (amount > MAX_TRANSACTION) return 'Nominal melebihi batas maksimum transaksi.';
  return '';
}

export function validateEmail(value) {
  const text = value.trim();
  if (!text) return 'Email wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) return 'Format email tidak valid.';
  return '';
}

export function validateRecipient(value) {
  const text = value.trim();
  if (!text) return 'Email atau nomor HP penerima wajib diisi.';
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
  const isPhone = /^08[0-9]{8,13}$/.test(text);
  if (!isEmail && !isPhone) return 'Masukkan email valid atau nomor HP (diawali 08).';
  return '';
}
