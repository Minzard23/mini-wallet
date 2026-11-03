const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const PHONE_REGEX = /^08[0-9]{8,13}$/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function validateRegister(body) {
  const errors = {};
  const username = clean(body.username);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username) errors.username = 'Username wajib diisi';
  else if (!USERNAME_REGEX.test(username)) {
    errors.username = 'Username 3-30 karakter, hanya huruf, angka, dan underscore';
  }

  if (!email) errors.email = 'Email wajib diisi';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Format email tidak valid';

  if (!phone) errors.phone = 'Nomor HP wajib diisi';
  else if (!PHONE_REGEX.test(phone)) errors.phone = 'Nomor HP harus diawali 08 dan berisi 10-15 digit';

  if (!password) errors.password = 'Password wajib diisi';
  else if (password.length < 8) errors.password = 'Password minimal 8 karakter';

  return { errors, data: { username, email, phone, password } };
}

// ===== BARU =====
function validateLogin(body) {
  const errors = {};
  const email = clean(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) errors.email = 'Email wajib diisi';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Format email tidak valid';

  if (!password) errors.password = 'Password wajib diisi';

  return { errors, data: { email, password } };
}

module.exports = { validateRegister, validateLogin };