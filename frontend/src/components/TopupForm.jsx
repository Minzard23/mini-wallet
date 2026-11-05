import { useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { formatRupiah } from '../utils/format';
import { validateAmount } from '../utils/validators';
import Alert from './Alert';

const QUICK_AMOUNTS = [50000, 100000, 500000];

export default function TopupForm({ onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const amountError = validateAmount(amount);
  const showError = amount !== '' && amountError; // jangan merah sebelum user mengetik

  async function handleSubmit(e) {
    e.preventDefault();
    if (amountError || loading) return; // cegah submit ganda & input tidak valid

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/topup', { amount: Number(amount) });
      setSuccess(`${res.data.message}: ${formatRupiah(res.data.data.amount)}`);
      setAmount('');
      onSuccess(); // minta dashboard memuat ulang saldo & riwayat
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>Top-up Saldo</h2>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <label className="field">
        <span>Nominal (Rp)</span>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setSuccess(''); }}
          placeholder="contoh: 100000"
        />
        {showError && <small className="field-error">{amountError}</small>}
      </label>

      <div className="chips">
        {QUICK_AMOUNTS.map((value) => (
          <button type="button" className="chip" key={value} onClick={() => setAmount(String(value))}>
            {formatRupiah(value)}
          </button>
        ))}
      </div>

      <button className="btn btn-primary btn-block" type="submit" disabled={!!amountError || loading}>
        {loading ? 'Memproses...' : 'Top-up'}
      </button>
    </form>
  );
}
