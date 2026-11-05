import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/format';
import Alert from '../components/Alert';
import TopupForm from '../components/TopupForm';
import TransferForm from '../components/TransferForm';
import TransactionTable from '../components/TransactionTable';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ambil saldo & riwayat sekaligus (paralel) dari backend
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [walletRes, trxRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/transactions'),
      ]);
      setBalance(walletRes.data.data.balance);
      setTransactions(trxRes.data.data);
    } catch (err) {
      if (err.response?.status === 401) return logout(); // sesi habis -> keluar
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">💳 Mini Wallet</div>
        <div className="topbar-right">
          <span className="muted">Halo, <strong>{user.username}</strong></span>
          <button className="btn btn-ghost" onClick={logout}>Keluar</button>
        </div>
      </header>

      <main className="container">
        <Alert>{error}</Alert>

        <section className="balance-card">
          <span>Saldo kamu</span>
          <strong>{balance === null ? '...' : formatRupiah(balance)}</strong>
          <small>{user.email} · {user.phone}</small>
        </section>

        <div className="grid-2">
          <TopupForm onSuccess={loadData} />
          <TransferForm balance={balance} onSuccess={loadData} />
        </div>

        <TransactionTable transactions={transactions} loading={loading} />
      </main>
    </div>
  );
}
