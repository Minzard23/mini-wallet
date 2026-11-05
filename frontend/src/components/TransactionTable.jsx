import { Link } from 'react-router-dom';
import { formatDate, formatRupiah } from '../utils/format';

// Teks keterangan tiap baris, tergantung jenis & arah transaksi
function describe(trx) {
  if (trx.type === 'TOPUP') return 'Top-up saldo';
  return trx.direction === 'IN' ? `Transfer dari ${trx.sender}` : `Transfer ke ${trx.receiver}`;
}

// Dipakai di Dashboard (5 terakhir) dan halaman Mutasi (semua sesuai filter)
export default function TransactionTable({
  title = 'Riwayat Transaksi',
  transactions,
  loading,
  emptyText = 'Belum ada transaksi. Coba top-up dulu.',
  showMoreLink = false,
}) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        {showMoreLink && <Link to="/mutasi">Lihat semua mutasi →</Link>}
      </div>

      {loading && transactions.length === 0 ? (
        <p className="muted">Memuat riwayat...</p>
      ) : transactions.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Keterangan</th>
                <th>Catatan</th>
                <th className="right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trx) => (
                <tr key={trx.id}>
                  <td className="nowrap">{formatDate(trx.created_at)}</td>
                  <td>
                    <span className={`badge badge-${trx.direction === 'IN' ? 'in' : 'out'}`}>
                      {trx.direction === 'IN' ? 'Masuk' : 'Keluar'}
                    </span>{' '}
                    {describe(trx)}
                  </td>
                  <td className="muted">{trx.type === 'TRANSFER' ? trx.description || '-' : '-'}</td>
                  <td className={`right nowrap amount-${trx.direction === 'IN' ? 'in' : 'out'}`}>
                    {trx.direction === 'IN' ? '+' : '-'}{formatRupiah(trx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
