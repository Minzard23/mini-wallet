import { useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { validateAmount, validateRecipient } from '../utils/validators';
import Alert from './Alert';

export default function TransferForm({ balance, onSuccess }) {
  const [form, setForm] = useState({ recipient: '', amount: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const recipientError = validateRecipient(form.recipient);
  let amountError = validateAmount(form.amount);
  // Cek saldo di sisi client juga, supaya user langsung tahu tanpa menunggu server
  if (!amountError && balance !== null && Number(form.amount) > balance) {
    amountError = 'Saldo tidak cukup.';
  }
  const descriptionError = form.description.length > 100 ? 'Catatan maksimal 100 karakter.' : '';
  const isValid = !recipientError && !amountError && !descriptionError;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || loading) return; // tombol tidak bisa diproses sebelum valid / saat loading

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/transfer', {
        recipient: form.recipient.trim(),
        amount: Number(form.amount),
        description: form.description.trim(),
      });
      setSuccess(res.data.message);
      setForm({ recipient: '', amount: '', description: '' });
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err)); // mis. "Saldo tidak cukup." / "Penerima tidak ditemukan."
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>Transfer</h2>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <label className="field">
        <span>Email / No. HP Penerima</span>
        <input
          name="recipient"
          value={form.recipient}
          onChange={handleChange}
          placeholder="budi@mail.com atau 0812..."
        />
        {form.recipient && recipientError && <small className="field-error">{recipientError}</small>}
      </label>

      <label className="field">
        <span>Nominal (Rp)</span>
        <input
          name="amount"
          inputMode="numeric"
          value={form.amount}
          onChange={handleChange}
          placeholder="contoh: 25000"
        />
        {form.amount !== '' && amountError && <small className="field-error">{amountError}</small>}
      </label>

      <label className="field">
        <span>Catatan (opsional)</span>
        <input
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="contoh: bayar makan"
          maxLength={120}
        />
        {descriptionError && <small className="field-error">{descriptionError}</small>}
      </label>

      <button className="btn btn-primary btn-block" type="submit" disabled={!isValid || loading}>
        {loading ? 'Mengirim...' : 'Kirim'}
      </button>
    </form>
  );
}
