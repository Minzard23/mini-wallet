import { formatDate, formatRupiah } from '../utils/format';

// Teks keterangan tiap baris, tergantung jenis & arah transaksi
function describe(trx) {
  if (trx.type === 'TOPUP') return 'Top-up saldo';
  return trx.direction === 'IN' ? `Transfer dari ${trx.sender}` : `Transfer ke ${trx.receiver}`;
}

export default function TransactionTable({ transactions, loading }) {
  return (
    <section className="card">
      <h2>Riwayat Transaksi</h2>

      {loading && transactions.length === 0 ? (
        <p className="muted">Memuat riwayat...</p>
      ) : transactions.length === 0 ? (
        <p className="muted">Belum ada transaksi. Coba top-up dulu.</p>
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
