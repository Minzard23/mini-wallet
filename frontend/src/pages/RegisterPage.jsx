import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { validateEmail } from '../utils/validators';
import Alert from '../components/Alert';

// Aturan sama dengan backend (authValidator.js)
function validate(form) {
  const errors = {};
  if (!form.username.trim()) errors.username = 'Username wajib diisi.';
  else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username.trim())) {
    errors.username = 'Username 3-30 karakter, hanya huruf, angka, dan underscore.';
  }
  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;
  if (!form.phone.trim()) errors.phone = 'Nomor HP wajib diisi.';
  else if (!/^08[0-9]{8,13}$/.test(form.phone.trim())) errors.phone = 'Nomor HP diawali 08, 10-15 digit.';
  if (!form.password) errors.password = 'Password wajib diisi.';
  else if (form.password.length < 8) errors.password = 'Password minimal 8 karakter.';
  return errors;
}

const FIELDS = [
  { name: 'username', label: 'Username', type: 'text', placeholder: 'candra_23', auto: 'username' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com', auto: 'email' },
  { name: 'phone', label: 'Nomor HP', type: 'tel', placeholder: '081234567890', auto: 'tel' },
  { name: 'password', label: 'Password', type: 'password', placeholder: 'Minimal 8 karakter', auto: 'new-password' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverFieldErrors, setServerFieldErrors] = useState({});

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setServerFieldErrors((prev) => ({ ...prev, [name]: '' })); // hapus error server di field itu
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setServerError('');
    try {
      await api.post('/auth/register', {
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err) {
      setServerError(getErrorMessage(err));
      setServerFieldErrors(err.response?.data?.errors || {}); // mis. "Username sudah digunakan"
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <div className="brand">💳 Mini Wallet</div>
        <h1>Buat Akun</h1>
        <p className="muted">Gratis, cukup 1 menit.</p>

        <Alert>{serverError}</Alert>

        {FIELDS.map((f) => {
          const message = serverFieldErrors[f.name] || (touched[f.name] && errors[f.name]);
          return (
            <label className="field" key={f.name}>
              <span>{f.label}</span>
              <input
                name={f.name}
                type={f.type}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                autoComplete={f.auto}
              />
              {message && <small className="field-error">{message}</small>}
            </label>
          );
        })}

        <button className="btn btn-primary btn-block" type="submit" disabled={!isValid || loading}>
          {loading ? 'Memproses...' : 'Daftar'}
        </button>

        <p className="muted center">
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </p>
      </form>
    </div>
  );
}
