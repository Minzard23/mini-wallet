import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { validateEmail } from '../utils/validators';
import Alert from '../components/Alert';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // berisi state { registered: true } setelah daftar

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false); // tampilkan error setelah user mulai mengetik
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const emailError = validateEmail(email);
  const passwordError = password ? '' : 'Password wajib diisi.';
  const isValid = !emailError && !passwordError;

  async function handleSubmit(e) {
    e.preventDefault(); // cegah halaman reload (perilaku bawaan form)
    if (!isValid || loading) return; // jaga-jaga: jangan kirim kalau belum valid / masih loading

    setLoading(true);
    setServerError('');
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <div className="brand">💳 Mini Wallet</div>
        <h1>Masuk</h1>
        <p className="muted">Kelola saldo dan kirim uang dengan mudah.</p>

        {location.state?.registered && !serverError && (
          <Alert type="success">Registrasi berhasil, silakan masuk.</Alert>
        )}
        <Alert>{serverError}</Alert>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setTouched(true); }}
            placeholder="nama@email.com"
            autoComplete="email"
          />
          {touched && emailError && <small className="field-error">{emailError}</small>}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {touched && passwordError && <small className="field-error">{passwordError}</small>}
        </label>

        <button className="btn btn-primary btn-block" type="submit" disabled={!isValid || loading}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>

        <p className="muted center">
          Belum punya akun? <Link to="/register">Daftar</Link>
        </p>
      </form>
    </div>
  );
}
