import { useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/format';
import { downloadMutasiPdf } from '../utils/pdf';
import Alert from '../components/Alert';
import Navbar from '../components/Navbar';
import TransactionTable from '../components/TransactionTable';

// Tanggal lokal dalam format YYYY-MM-DD (format yang dipakai <input type="date"> & backend)
function toInputDate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatShortDate(text) {
  return new Date(`${text}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

const TYPE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'IN', label: 'Uang Masuk' },
  { value: 'OUT', label: 'Uang Keluar' },
];

export default function MutasiPage() {
  const { user, logout } = useAuth();
  const today = toInputDate(new Date());
  const firstOfMonth = toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [filters, setFilters] = useState({ from: firstOfMonth, to: today, direction: '' });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const filterError = filters.from && filters.to && filters.from > filters.to
    ? 'Tanggal akhir tidak boleh sebelum tanggal awal.'
    : '';

  // Ambil ulang data setiap kali filter berubah
  useEffect(() => {
    if (filterError) return;
    let cancelled = false; // abaikan hasil request lama kalau filter keburu diganti

    setLoading(true);
    setError('');
    api.get('/transactions', {
      params: {
        from: filters.from || undefined,
        to: filters.to || undefined,
        direction: filters.direction || undefined,
        limit: 500,
      },
    })
      .then((res) => { if (!cancelled) setTransactions(res.data.data); })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) return logout();
        setError(getErrorMessage(err));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [filters, filterError, logout]);

  // Total masuk & keluar dihitung dari data yang sedang tampil
  const totals = useMemo(() => transactions.reduce(
    (sum, trx) => {
      sum[trx.direction === 'IN' ? 'in' : 'out'] += trx.amount;
      return sum;
    },
    { in: 0, out: 0 },
  ), [transactions]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const periodLabel = `${filters.from ? formatShortDate(filters.from) : 'Awal'} - ${filters.to ? formatShortDate(filters.to) : 'Sekarang'}`;
      const typeLabel = TYPE_OPTIONS.find((o) => o.value === filters.direction).label;
      await downloadMutasiPdf({ user, transactions, periodLabel, typeLabel, totals });
    } catch {
      setError('Gagal membuat PDF. Coba lagi.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="dashboard">
      <Navbar />

      <main className="container">
        <div className="page-head">
          <div>
            <h1>Mutasi Rekening</h1>
            <p className="muted">Riwayat uang masuk & keluar berdasarkan periode.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={loading || downloading || transactions.length === 0 || !!filterError}
          >
            {downloading ? 'Menyiapkan PDF...' : '⬇ Download PDF'}
          </button>
        </div>

        <section className="card filters">
          <label className="field">
            <span>Dari tanggal</span>
            <input type="date" name="from" value={filters.from} max={today} onChange={handleChange} />
          </label>
          <label className="field">
            <span>Sampai tanggal</span>
            <input type="date" name="to" value={filters.to} max={today} onChange={handleChange} />
          </label>
          <label className="field">
            <span>Jenis</span>
            <select name="direction" value={filters.direction} onChange={handleChange}>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </section>

        <Alert>{filterError || error}</Alert>

        <div className="summary">
          <div className="card summary-item">
            <span className="muted">Total Masuk</span>
            <strong className="amount-in">{formatRupiah(totals.in)}</strong>
          </div>
          <div className="card summary-item">
            <span className="muted">Total Keluar</span>
            <strong className="amount-out">{formatRupiah(totals.out)}</strong>
          </div>
          <div className="card summary-item">
            <span className="muted">Jumlah Transaksi</span>
            <strong>{transactions.length}</strong>
          </div>
        </div>

        <TransactionTable
          title="Daftar Transaksi"
          transactions={transactions}
          loading={loading}
          emptyText="Tidak ada transaksi pada periode ini."
        />
      </main>
    </div>
  );
}
